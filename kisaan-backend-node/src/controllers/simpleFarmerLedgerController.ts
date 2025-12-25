// Get owner commission summary (owner only)
export async function getOwnerCommissionSummary(req: Request, res: Response) {
  try {
    const { shop_id, from, to, period } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);

    let whereClause = 'shop_id = $1';
    const bindParams: any[] = [shopIdNum];
    let paramIndex = 2;
    if (from) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      let fromDate = from;
      if ((from as string).length === 10) {
        fromDate = from + 'T00:00:00.000Z';
      }
      bindParams.push(fromDate);
      paramIndex++;
    }
    if (to) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      let toDate = to;
      if ((to as string).length === 10) {
        toDate = to + 'T23:59:59.999Z';
      }
      bindParams.push(toDate);
      paramIndex++;
    }

    // Group by period if requested
    let groupBy = '';
    let selectPeriod = '';
    if (period === 'monthly') {
      groupBy = `GROUP BY to_char(created_at, 'YYYY-MM')`;
      selectPeriod = ", to_char(created_at, 'YYYY-MM') as period";
    } else if (period === 'weekly') {
      groupBy = `GROUP BY to_char(created_at, 'YYYY-\"W\"IW')`;
      selectPeriod = ", to_char(created_at, 'YYYY-\"W\"IW') as period";
    }

    const sql = `SELECT SUM(COALESCE(commission_amount,0)) as total_commission${selectPeriod}
      FROM kisaan_ledger
      WHERE ${whereClause}
      ${groupBy}
      ${selectPeriod ? 'ORDER BY period DESC' : ''}`;

    const results = await SimpleFarmerLedger.sequelize!.query(sql, {
      bind: bindParams,
      type: 'SELECT'
    });

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
/**
 * SIMPLE FARMER LEDGER CONTROLLER - INDEPENDENT COMPONENT
 *
 * ⚠️  CRITICAL: This controller manages an INDEPENDENT ledger system!
 *
 * This is NOT connected to the main accounting ledger (kisaan_ledger_entries).
 * - Does not read from or write to transaction/payment tables directly
 * - Maintains its own simplified balance tracking
 * - Uses text-based transaction references only
 *
 * For actual financial audit trails, use the main LedgerService and kisaan_ledger_entries table.
 */

import { Request, Response } from 'express';
import { SimpleFarmerLedger } from '../models/simpleFarmerLedger';
import { simpleFarmerLedgerSchema } from '../schema/simpleFarmerLedgerSchema';
import { QueryTypes, Sequelize, Op } from 'sequelize';
import { LedgerType } from '../constants/ledgerTypes';
import { LedgerCategory } from '../constants/ledgerCategories';

interface FarmerRow {
  custom_commission_rate: number | null;
}

interface ShopRow {
  commission_rate: number | null;
  owner_id: number | null;
}

interface OwnerRow {
  custom_commission_rate: number | null;
}

interface LedgerPayload {
  farmer_id: number;
  shop_id: number;
  amount: number;
  category: LedgerCategory;
  type: LedgerType;
  description?: string;
  commission_amount?: number;
  net_amount?: number;
  created_by: number;
  [key: string]: unknown;
}

// Create a new ledger entry
export async function createEntry(req: Request, res: Response) {
  try {
    await simpleFarmerLedgerSchema.validate(req.body);
    // Compute commission_amount and net_amount using farmer custom rate or shop commission
    const payload: LedgerPayload = { ...req.body };
    const farmerId = Number(payload.farmer_id);
    const shopId = Number(payload.shop_id);
    // Resolve commission rate precedence: farmer -> shop owner -> shop -> 0
    let rateUsed = 0;
    let source = 'none';
    try {
      const farmerRow: FarmerRow[] = (await SimpleFarmerLedger.sequelize!.query('SELECT custom_commission_rate FROM kisaan_users WHERE id = ?', { replacements: [farmerId], type: QueryTypes.SELECT })) as FarmerRow[];
      const farmerRate = farmerRow && farmerRow[0] ? Number(farmerRow[0].custom_commission_rate) : null;
      if (farmerRate != null) {
        rateUsed = farmerRate;
        source = 'farmer';
      } else {
        // Try to fetch shop commission rate and owner commission rate
        const shopRow: ShopRow[] = (await SimpleFarmerLedger.sequelize!.query('SELECT commission_rate, owner_id FROM kisaan_shops WHERE id = ?', { replacements: [shopId], type: QueryTypes.SELECT })) as ShopRow[];
        const shopRate = shopRow && shopRow[0] ? Number(shopRow[0].commission_rate) : null;
        const ownerId = shopRow && shopRow[0] ? shopRow[0].owner_id : null;
        if (ownerId) {
          const ownerRow: OwnerRow[] = (await SimpleFarmerLedger.sequelize!.query('SELECT custom_commission_rate FROM kisaan_users WHERE id = ?', { replacements: [ownerId], type: QueryTypes.SELECT })) as OwnerRow[];
          const ownerRate = ownerRow && ownerRow[0] ? Number(ownerRow[0].custom_commission_rate) : null;
          if (ownerRate != null) {
            rateUsed = ownerRate;
            source = 'owner';
          }
        }
        if (source === 'none' && shopRate != null) {
          rateUsed = shopRate;
          source = 'shop';
        }
      }
    } catch (e) {
      // fallback to zero rate
      rateUsed = 0;
      source = 'none';
    }

    if (payload.type === 'credit') {
      payload.commission_amount = +(Number(payload.amount || 0) * (Number(rateUsed) / 100)).toFixed(2);
      payload.net_amount = +(Number(payload.amount || 0) - payload.commission_amount).toFixed(2);
    } else {
      payload.commission_amount = 0;
      payload.net_amount = Number(payload.amount || 0);
    }
    
    // Add required fields
    payload.type = payload.type || 'income'; // Default type
    payload.created_by = payload.created_by || 1; // Default created_by
    
    // Handle backdating: if entry_date is provided, use it for transaction_date
    const createData: any = { ...payload };
    if (req.body.entry_date) {
      // Convert the entry_date to a proper Date object
      const entryDate = new Date(req.body.entry_date);
      if (!isNaN(entryDate.getTime())) {
        // Ensure the date is not in the future
        const now = new Date();
        if (entryDate <= now) {
          createData.transaction_date = entryDate;
        } else {
          return res.status(400).json({ error: 'Entry date cannot be in the future' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid entry date format' });
      }
    }
    
    const entry = await SimpleFarmerLedger.create(createData);
    res.status(201).json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
}

// List entries (with filters)
export async function listEntries(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, from, to, category, page, page_size } = req.query;
    const where: any = {};
    if (shop_id) where.shop_id = Number(shop_id);
    if (farmer_id) where.farmer_id = Number(farmer_id);
    if (category) where.category = category;

    // Improved date filtering - check both transaction_date and created_at for backward compatibility
    if (from || to) {
      const dateConditions: any[] = [];
      
      if (from) {
        // Always treat 'from' as UTC midnight
        let fromDate = new Date(from as string);
        if ((from as string).length === 10) {
          // If only date provided (YYYY-MM-DD), force UTC midnight
          fromDate = new Date(from + 'T00:00:00.000Z');
        }
        dateConditions.push({
          [Op.or]: [
            { transaction_date: { [Op.gte]: fromDate } },
            { 
              [Op.and]: [
                { transaction_date: null },
                { created_at: { [Op.gte]: fromDate } }
              ]
            }
          ]
        });
      }
      
      if (to) {
        // Always treat 'to' as UTC end of day
        let toDate = new Date(to as string);
        if ((to as string).length === 10) {
          // If only date provided (YYYY-MM-DD), force UTC end of day
          toDate = new Date(to + 'T23:59:59.999Z');
        } else {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        dateConditions.push({
          [Op.or]: [
            { transaction_date: { [Op.lte]: toDate } },
            { 
              [Op.and]: [
                { transaction_date: null },
                { created_at: { [Op.lte]: toDate } }
              ]
            }
          ]
        });
      }
      
      if (dateConditions.length > 0) {
        where[Op.and] = dateConditions;
      }
    }

    // Debug: log the filter and result count
    console.log('[SimpleLedger] Filter where:', JSON.stringify(where, null, 2));
    // Pagination params
    const pageNum = page ? Math.max(1, Number(page)) : 1;
    const pageSizeNum = page_size ? Math.min(200, Math.max(5, Number(page_size))) : 25; // default page size 25, clamp 5..200
    const offset = (pageNum - 1) * pageSizeNum;

    const result = await SimpleFarmerLedger.findAndCountAll({
      where,
      order: [
        // Sort by transaction_date first (for backdated entries), then by created_at
        [Sequelize.literal('COALESCE(transaction_date, created_at)'), 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: pageSizeNum,
      offset
    });
    const entries = result.rows;
    const total = result.count;
    console.log(`[SimpleLedger] Entries found: ${entries.length} (total: ${total})`);
    
    // Convert string fields to numbers for frontend compatibility
    const formattedEntries = entries.map(entry => ({
      id: Number(entry.id),
      shop_id: Number(entry.shop_id),
      farmer_id: Number(entry.farmer_id),
      amount: Number(entry.amount),
      type: entry.type,
      category: entry.category,
      notes: entry.notes,
      transaction_date: entry.transaction_date?.toISOString() || entry.created_at?.toISOString(), // Use transaction_date if available, fallback to created_at
      created_at: entry.created_at?.toISOString(),
      created_by: Number(entry.created_by),
      commission_amount: entry.commission_amount ? Number(entry.commission_amount) : undefined,
      net_amount: entry.net_amount ? Number(entry.net_amount) : undefined,
    }));
    
    res.json({ entries: formattedEntries, total, page: pageNum, page_size: pageSizeNum });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Get farmer balance
export async function getFarmerBalance(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id } = req.query;
    if (!shop_id || !farmer_id) return res.status(400).json({ error: 'shop_id and farmer_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = Number(farmer_id);
    const entries = await SimpleFarmerLedger.findAll({ where: { shop_id: shopIdNum, farmer_id: farmerIdNum } });
    let credit = 0, debit = 0;
    for (const e of entries) {
      if (e.type === 'credit') credit += Number(e.amount);
      else debit += Number(e.amount);
    }
    res.json({ farmer_id: farmerIdNum, shop_id: shopIdNum, credit, debit, balance: credit - debit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Get summary (weekly/monthly)
export async function getSummary(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, period, from, to } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = farmer_id ? Number(farmer_id) : undefined;

    // Build WHERE clause and bind params
    let whereClause = 'shop_id = $1';
    const bindParams: any[] = [shopIdNum];
    let paramIndex = 2;
    if (farmerIdNum) {
      whereClause += ` AND farmer_id = $${paramIndex}`;
      bindParams.push(farmerIdNum);
      paramIndex++;
    }
    if (from) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      // Always treat 'from' as UTC midnight
      let fromDate = from;
      if ((from as string).length === 10) {
        fromDate = from + 'T00:00:00.000Z';
      }
      bindParams.push(fromDate);
      paramIndex++;
    }
    if (to) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      // Always treat 'to' as UTC end of day
      let toDate = to;
      if ((to as string).length === 10) {
        toDate = to + 'T23:59:59.999Z';
      }
      bindParams.push(toDate);
      paramIndex++;
    }

    const groupBy = period === 'monthly' ? "to_char(created_at, 'YYYY-MM')" : "to_char(created_at, 'YYYY-\"W\"IW')";

    const results = await SimpleFarmerLedger.sequelize!.query(
      `SELECT ${groupBy} as period, type, SUM(amount) as total
       FROM kisaan_ledger
       WHERE ${whereClause}
       GROUP BY period, type
       ORDER BY period DESC`,
      {
        bind: bindParams,
        type: 'SELECT'
      }
    );

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Get earnings (commission and net) grouped by period
export async function getEarnings(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, period } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = farmer_id ? Number(farmer_id) : undefined;

    const where: any = { shop_id: shopIdNum };
    if (farmerIdNum) where.farmer_id = farmerIdNum;

    // Use raw SQL query with proper PostgreSQL syntax and bind parameters
    const groupBy = period === 'monthly' ? "to_char(created_at, 'YYYY-MM')" : "to_char(created_at, 'YYYY-\"W\"IW')";

    const results = await SimpleFarmerLedger.sequelize!.query(
      `SELECT ${groupBy} as period,
              SUM(COALESCE(commission_amount,0)) as total_commission,
              SUM(COALESCE(net_amount,0)) as total_net,
              SUM(COALESCE(amount,0)) as total_amount
       FROM kisaan_ledger
       WHERE shop_id = $1${farmerIdNum ? ' AND farmer_id = $2' : ''}
       GROUP BY period
       ORDER BY period DESC`,
      {
        bind: farmerIdNum ? [shopIdNum, farmerIdNum] : [shopIdNum],
        type: 'SELECT'
      }
    );

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Edit entry
export async function updateEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await simpleFarmerLedgerSchema.validate(req.body);
    const entry = await SimpleFarmerLedger.findByPk(id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    // Recalculate commission and net_amount as in createEntry
    const payload: any = { ...req.body };
    const farmerId = Number(payload.farmer_id ?? entry.farmer_id);
    const shopId = Number(payload.shop_id ?? entry.shop_id);
    // Resolve commission rate precedence: farmer -> shop owner -> shop -> 0
    let rateUsed = 0;
    try {
      const farmerRow: any[] = (await SimpleFarmerLedger.sequelize!.query('SELECT custom_commission_rate FROM kisaan_users WHERE id = ?', { replacements: [farmerId], type: QueryTypes.SELECT })) as any[];
      const farmerRate = farmerRow && farmerRow[0] ? Number(farmerRow[0].custom_commission_rate) : null;
      if (farmerRate != null) {
        rateUsed = farmerRate;
      } else {
        const shopRow: any[] = (await SimpleFarmerLedger.sequelize!.query('SELECT commission_rate, owner_id FROM kisaan_shops WHERE id = ?', { replacements: [shopId], type: QueryTypes.SELECT })) as any[];
        const shopRate = shopRow && shopRow[0] ? Number(shopRow[0].commission_rate) : null;
        const ownerId = shopRow && shopRow[0] ? shopRow[0].owner_id : null;
        if (ownerId) {
          const ownerRow: any[] = (await SimpleFarmerLedger.sequelize!.query('SELECT commission_rate FROM kisaan_users WHERE id = ?', { replacements: [ownerId], type: QueryTypes.SELECT })) as any[];
          const ownerRate = ownerRow && ownerRow[0] ? Number(ownerRow[0].commission_rate) : null;
          if (ownerRate != null) {
            rateUsed = ownerRate;
          }
        }
        if (rateUsed === 0 && shopRate != null) {
          rateUsed = shopRate;
        }
      }
    } catch (e) {
      rateUsed = 0;
    }

    if (payload.type === 'credit' || (!payload.type && entry.type === 'credit')) {
      const amount = Number(payload.amount ?? entry.amount);
      payload.commission_amount = +(amount * (Number(rateUsed) / 100)).toFixed(2);
      payload.net_amount = +(amount - payload.commission_amount).toFixed(2);
    } else {
      const amount = Number(payload.amount ?? entry.amount);
      payload.commission_amount = 0;
      payload.net_amount = amount;
    }

    await entry.update(payload);
    res.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
}

// Delete entry
export async function deleteEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const entry = await SimpleFarmerLedger.findByPk(id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    await entry.destroy();
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Export CSV
export async function exportCsv(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, from, to, category } = req.query;

    // Build where clause same as listEntries
    const where: Record<string, unknown> = {};
    if (shop_id) where.shop_id = Number(shop_id);
    if (farmer_id) where.farmer_id = Number(farmer_id);
    if (category) where.category = category;

    if (from || to) {
      where.created_at = {};
      if (from) {
        (where.created_at as any)[Op.gte] = new Date(from as string);
      }
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        (where.created_at as any)[Op.lte] = toDate;
      }
    }

    const entries = await SimpleFarmerLedger.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Generate CSV
    const csvHeader = 'ID,Farmer ID,Shop ID,Amount,Commission Amount,Net Amount,Type,Category,Notes,Created At\n';
    const csvRows = entries.map(entry =>
      `${entry.id},${entry.farmer_id},${entry.shop_id},${entry.amount},${entry.commission_amount || 0},${entry.net_amount || 0},${entry.type},${entry.category},"${(entry.notes || '').replace(/"/g, '""')}",${entry.created_at || ''}`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="farmer-accounts.csv"');
    res.send(csv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
