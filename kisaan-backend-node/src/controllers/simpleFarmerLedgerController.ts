// Batch create ledger entries
import { Transaction } from 'sequelize';
export async function createBatchEntries(req: Request, res: Response) {
  const entries = Array.isArray(req.body) ? req.body : [];
  if (!entries.length) return res.status(400).json({ error: 'No entries provided' });
  const sequelize = SimpleFarmerLedger.sequelize!;
  let tx: Transaction | undefined;
  try {
    // Validate all entries first
    for (const entry of entries) {
      await simpleFarmerLedgerSchema.validate(entry);
    }
    tx = await sequelize.transaction();
    const created = [];
    for (const entry of entries) {
      // Commission/net calculation logic (copy from createEntry)
      const payload: any = { ...entry };
      const farmerId = Number(payload.farmer_id);
      const shopId = Number(payload.shop_id);
      let rateUsed = 0;
      try {
        rateUsed = await resolveCommissionRate(farmerId, shopId);
      } catch (e) { rateUsed = 0; }
      const amount = Number(payload.amount || 0);
      if (payload.type === 'credit') {
        payload.commission_amount = +(amount * (rateUsed / 100)).toFixed(2);
        payload.net_amount = +(amount - payload.commission_amount).toFixed(2);
      } else {
        payload.commission_amount = 0;
        payload.net_amount = amount;
      }
      payload.type = payload.type || 'income';
      payload.created_by = payload.created_by || 1;
      // Handle backdating
      if (entry.entry_date) {
        const entryDate = new Date(entry.entry_date);
        if (isNaN(entryDate.getTime())) throw new Error('Invalid entry date format');
        const now = new Date();
        if (entryDate > now) throw new Error('Entry date cannot be in the future');
        payload.transaction_date = entryDate;
      }
      const createdEntry = await SimpleFarmerLedger.create(payload, { transaction: tx });
      created.push(createdEntry);
    }
    await tx.commit();
    res.status(201).json({ entries: created });
  } catch (err) {
    if (tx) await tx.rollback();
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
}
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
import { AuthenticatedRequest } from '../middlewares/auth';
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
// Helper to resolve commission rate
async function resolveCommissionRate(farmerId: number, shopId: number): Promise<number> {
  // Precedence: farmer -> shop owner -> shop -> 0
  // 1. Farmer custom rate
  const farmerRow = await SimpleFarmerLedger.sequelize!.query(
    'SELECT custom_commission_rate FROM kisaan_users WHERE id = ?',
    { replacements: [farmerId], type: QueryTypes.SELECT }
  ) as unknown as Array<{ custom_commission_rate?: number }>;
  const farmerRate = farmerRow?.[0]?.custom_commission_rate;
  if (farmerRate !== undefined && farmerRate !== null) return Number(farmerRate);

  // 2. Shop commission rate and owner
  const shopRow = await SimpleFarmerLedger.sequelize!.query(
    'SELECT commission_rate, owner_id FROM kisaan_shops WHERE id = ?',
    { replacements: [shopId], type: QueryTypes.SELECT }
  ) as unknown as Array<{ commission_rate?: number, owner_id?: number }>;
  const shopRate = shopRow?.[0]?.commission_rate;
  const ownerId = shopRow?.[0]?.owner_id;
  if (ownerId) {
    const ownerRow = await SimpleFarmerLedger.sequelize!.query(
      'SELECT custom_commission_rate FROM kisaan_users WHERE id = ?',
      { replacements: [ownerId], type: QueryTypes.SELECT }
    ) as unknown as Array<{ custom_commission_rate?: number }>;
    const ownerRate = ownerRow?.[0]?.custom_commission_rate;
    if (ownerRate !== undefined && ownerRate !== null) return Number(ownerRate);
  }
  if (shopRate !== undefined && shopRate !== null) return Number(shopRate);
  return 0;
}

export async function createEntry(req: Request, res: Response) {
  try {
    await simpleFarmerLedgerSchema.validate(req.body);
    const payload: LedgerPayload = { ...req.body };
    const farmerId = Number(payload.farmer_id);
    const shopId = Number(payload.shop_id);

    // Get commission rate
    let rateUsed = 0;
    try {
      rateUsed = await resolveCommissionRate(farmerId, shopId);
    } catch (e) {
      rateUsed = 0;
    }

    // Calculate commission and net amount
    const amount = Number(payload.amount || 0);
    if (payload.type === 'credit') {
      payload.commission_amount = +(amount * (rateUsed / 100)).toFixed(2);
      payload.net_amount = +(amount - payload.commission_amount).toFixed(2);
    } else {
      payload.commission_amount = 0;
      payload.net_amount = amount;
    }

    // Add required fields
    payload.type = payload.type || 'income';
    payload.created_by = payload.created_by || 1;

    // Handle backdating: if entry_date is provided, use it for transaction_date
    const createData: any = { ...payload };
    if (req.body.entry_date) {
      const entryDate = new Date(req.body.entry_date);
      if (isNaN(entryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid entry date format' });
      }
      const now = new Date();
      if (entryDate > now) {
        return res.status(400).json({ error: 'Entry date cannot be in the future' });
      }
      createData.transaction_date = entryDate;
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
    const { shop_id, farmer_id, from, to, category, page, page_size, include_deleted } = req.query;
    const where: any = {};
    if (shop_id) where.shop_id = Number(shop_id);
    if (farmer_id) where.farmer_id = Number(farmer_id);
    if (category) where.category = category;

    // Soft delete filter: exclude deleted entries by default, but allow viewing them with include_deleted=true
    if (include_deleted !== 'true') {
      where.is_deleted = false;
    }

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

// Get farmer balance (or shop total if no farmer_id)
export async function getFarmerBalance(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = farmer_id ? Number(farmer_id) : undefined;
    const whereClause = farmerIdNum ? { shop_id: shopIdNum, farmer_id: farmerIdNum } : { shop_id: shopIdNum };
    const entries = await SimpleFarmerLedger.findAll({ where: whereClause });
    let credit = 0, debit = 0, commission = 0;
    for (const e of entries) {
      if (e.type === 'credit') {
        credit += Number(e.amount);
        commission += Number(e.commission_amount || 0);
      } else {
        debit += Number(e.amount);
      }
    }
    res.json({ farmer_id: farmerIdNum, shop_id: shopIdNum, credit, debit, commission, balance: credit - debit - commission });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

// Unified summary endpoint: returns period breakdowns and overall totals (credit, debit, commission, balance)
export async function getSummary(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, period, from, to } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = farmer_id ? Number(farmer_id) : undefined;

    // Default period to daily if not specified
    const defaultPeriod = period || 'daily';

    // Build WHERE clause and bind params
    let whereClause = 'shop_id = $1';
    const bindParams: any[] = [shopIdNum];
    let paramIndex = 2;
    if (farmerIdNum) {
      whereClause += ` AND farmer_id = $${paramIndex}`;
      bindParams.push(farmerIdNum);
      paramIndex++;
    }
    
    // Improved date filtering - check both transaction_date and created_at for backward compatibility
    if (from || to) {
      if (from) {
        whereClause += ` AND (transaction_date >= $${paramIndex} OR (transaction_date IS NULL AND created_at >= $${paramIndex}))`;
        let fromDate = from;
        if ((from as string).length === 10) {
          fromDate = from + 'T00:00:00.000Z';
        }
        bindParams.push(fromDate);
        paramIndex++;
      }
      if (to) {
        whereClause += ` AND (transaction_date <= $${paramIndex} OR (transaction_date IS NULL AND created_at <= $${paramIndex}))`;
        let toDate = to;
        if ((to as string).length === 10) {
          toDate = to + 'T23:59:59.999Z';
        }
        bindParams.push(toDate);
        paramIndex++;
      }
    }

    // 1. Period breakdown (always, default to daily)
    let periodResults: any[] = [];
    const groupBy = defaultPeriod === 'monthly' ? "to_char(COALESCE(transaction_date, created_at), 'YYYY-MM')" : 
                   defaultPeriod === 'daily' ? "to_char(COALESCE(transaction_date, created_at), 'YYYY-MM-DD')" : 
                   "to_char(COALESCE(transaction_date, created_at), 'YYYY-\"W\"IW')"; // weekly default;
    periodResults = await SimpleFarmerLedger.sequelize!.query(
      `SELECT ${groupBy} as period,
              SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as credit,
              SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as debit,
              SUM(COALESCE(commission_amount,0)) as commission,
              SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) - SUM(COALESCE(commission_amount,0)) as balance
       FROM kisaan_ledger
       WHERE ${whereClause}
       GROUP BY period
       ORDER BY period DESC`,
        {
          bind: bindParams,
          type: 'SELECT'
        }
      );

    // 2. Overall totals (single row)
    const overallTotals = await SimpleFarmerLedger.sequelize!.query(
      `SELECT 
          SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as credit,
          SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as debit,
          SUM(COALESCE(commission_amount,0)) as commission,
          SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) - SUM(COALESCE(commission_amount,0)) as balance
       FROM kisaan_ledger
       WHERE ${whereClause}`,
      {
        bind: bindParams,
        type: 'SELECT'
      }
    );

    res.json({
      period: periodResults,
      overall: overallTotals[0] || { credit: 0, debit: 0, commission: 0, balance: 0 }
    });
  } catch (err) {
    // Log the error for debugging
    console.error('Error in getSummary:', err);
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
    // Map entry_date to transaction_date if present
    if (payload.entry_date) {
      const entryDate = new Date(payload.entry_date);
      if (isNaN(entryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid entry date format' });
      }
      const now = new Date();
      if (entryDate > now) {
        return res.status(400).json({ error: 'Entry date cannot be in the future' });
      }
      payload.transaction_date = entryDate;
      delete payload.entry_date;
    }
    const farmerId = Number(payload.farmer_id ?? entry.farmer_id);
    const shopId = Number(payload.shop_id ?? entry.shop_id);
    // Resolve commission rate precedence: farmer -> shop owner -> shop -> 0
    let rateUsed = 0;
    try {
      const farmerRow = await SimpleFarmerLedger.sequelize!.query('SELECT custom_commission_rate FROM kisaan_users WHERE id = ?', { replacements: [farmerId], type: QueryTypes.SELECT }) as unknown as Array<{ custom_commission_rate?: number }>;
      const farmerRate = farmerRow?.[0]?.custom_commission_rate;
      if (farmerRate !== undefined && farmerRate !== null) {
        rateUsed = Number(farmerRate);
      } else {
        const shopRow = await SimpleFarmerLedger.sequelize!.query('SELECT commission_rate, owner_id FROM kisaan_shops WHERE id = ?', { replacements: [shopId], type: QueryTypes.SELECT }) as unknown as Array<{ commission_rate?: number, owner_id?: number }>;
        const shopRate = shopRow?.[0]?.commission_rate;
        const ownerId = shopRow?.[0]?.owner_id;
        if (ownerId) {
          const ownerRow = await SimpleFarmerLedger.sequelize!.query('SELECT custom_commission_rate FROM kisaan_users WHERE id = ?', { replacements: [ownerId], type: QueryTypes.SELECT }) as unknown as Array<{ custom_commission_rate?: number }>;
          const ownerRate = ownerRow?.[0]?.custom_commission_rate;
          if (ownerRate !== undefined && ownerRate !== null) {
            rateUsed = Number(ownerRate);
          }
        }
        if (rateUsed === 0 && shopRate !== undefined && shopRate !== null) {
          rateUsed = Number(shopRate);
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

// Soft delete entry (mark as deleted instead of destroying)
export async function deleteEntry(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional deletion reason

    const entry = await SimpleFarmerLedger.findByPk(id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    // Check if already deleted
    if (entry.is_deleted) {
      return res.status(400).json({ error: 'Entry is already deleted' });
    }

    // Soft delete: mark as deleted instead of destroying
    await entry.update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: req.user?.id || 1, // Assuming req.user is set by auth middleware
      deletion_reason: reason || 'Deleted by user'
    });

    res.json({
      success: true,
      message: 'Entry marked as deleted (soft delete)',
      entry: {
        id: entry.id,
        deleted_at: entry.deleted_at,
        deletion_reason: entry.deletion_reason
      }
    });
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
