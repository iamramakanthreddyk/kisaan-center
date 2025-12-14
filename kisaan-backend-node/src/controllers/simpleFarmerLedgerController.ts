import { Request, Response } from 'express';
import { SimpleFarmerLedger } from '../models/simpleFarmerLedger';
import { simpleFarmerLedgerSchema } from '../schema/simpleFarmerLedgerSchema';
import { QueryTypes, Sequelize } from 'sequelize';
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
  commission_rate: number | null;
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
          const ownerRow: OwnerRow[] = (await SimpleFarmerLedger.sequelize!.query('SELECT commission_rate FROM kisaan_users WHERE id = ?', { replacements: [ownerId], type: QueryTypes.SELECT })) as OwnerRow[];
          const ownerRate = ownerRow && ownerRow[0] ? Number(ownerRow[0].commission_rate) : null;
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

    payload.commission_amount = +(Number(payload.amount || 0) * (Number(rateUsed) / 100)).toFixed(2);
    payload.net_amount = +(Number(payload.amount || 0) - payload.commission_amount).toFixed(2);
    
    // Add required fields
    payload.type = payload.type || 'income'; // Default type
    payload.created_by = payload.created_by || 1; // Default created_by
    
    const entry = await SimpleFarmerLedger.create(payload);
    res.status(201).json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
}

// List entries (with filters)
export async function listEntries(req: Request, res: Response) {
  try {
    const { shop_id, farmer_id, from, to, category } = req.query;
    const where: Record<string, unknown> = {};
    if (shop_id) where.shop_id = Number(shop_id);
    if (farmer_id) where.farmer_id = Number(farmer_id);
    if (category) where.category = category;
    if (from || to) {
      where.created_at = {};
      if (from) (where.created_at as Record<string, string>)['$gte'] = from as string;
      if (to) (where.created_at as Record<string, string>)['$lte'] = to as string;
    }
    const entries = await SimpleFarmerLedger.findAll({ where, order: [['created_at', 'DESC']] });
    res.json(entries);
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
    const { shop_id, farmer_id, period } = req.query;
    if (!shop_id) return res.status(400).json({ error: 'shop_id required' });
    const shopIdNum = Number(shop_id);
    const farmerIdNum = farmer_id ? Number(farmer_id) : undefined;

    // Use Sequelize's built-in functions for date formatting
    const where: any = { shop_id: shopIdNum };
    if (farmerIdNum) where.farmer_id = farmerIdNum;

    // Use Sequelize's built-in functions for date formatting
    const dateFormat = period === 'monthly'
      ? Sequelize.fn('to_char', Sequelize.col('created_at'), 'YYYY-MM')
      : Sequelize.fn('to_char', Sequelize.col('created_at'), 'YYYY-"W"IW');

    const results = await SimpleFarmerLedger.findAll({
      where,
      attributes: [
        [dateFormat, 'period'],
        'type',
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
      ],
      group: ['period', 'type'],
      order: [[Sequelize.literal('period'), 'DESC']],
      raw: true
    });

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

    // Use Sequelize's built-in functions for date formatting
    const dateFormat = period === 'monthly'
      ? Sequelize.fn('to_char', Sequelize.col('created_at'), 'YYYY-MM')
      : Sequelize.fn('to_char', Sequelize.col('created_at'), 'YYYY-"W"IW');

    const results = await SimpleFarmerLedger.findAll({
      where,
      attributes: [
        [dateFormat, 'period'],
        [Sequelize.fn('SUM', Sequelize.fn('COALESCE', Sequelize.col('commission_amount'), 0)), 'total_commission'],
        [Sequelize.fn('SUM', Sequelize.fn('COALESCE', Sequelize.col('net_amount'), 0)), 'total_net'],
        [Sequelize.fn('SUM', Sequelize.fn('COALESCE', Sequelize.col('amount'), 0)), 'total_amount']
      ],
      group: ['period'],
      order: [[Sequelize.literal('period'), 'DESC']],
      raw: true
    });

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
    await entry.update(req.body);
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
