import { logger } from '../shared/logging/logger';
import { Transaction as SequelizeTransaction, Op, WhereOptions } from 'sequelize';
import LedgerEntry, { LedgerEntryAttributes } from '../models/ledgerEntry';
import UserBalance, { UserBalanceCreationAttributes } from '../models/userBalance';

export interface LedgerEntryData {
  farmer_id: number;
  shop_id: number;
  amount: number;
  type: 'TRANSACTION' | 'PAYMENT' | 'ADVANCE' | 'EXPENSE' | 'EXPENSE_SETTLED' | 'ADJUSTMENT' | 'REFUND';
  category: string;
  notes?: string;
  commission_amount?: number;
  net_amount?: number;
  created_by: number;
}

export interface SettlementSummary {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    transactions: { debit: number; credit: number; count: number };
    payments: { debit: number; credit: number; count: number };
    advances: { debit: number; credit: number; count: number };
    expenses: { debit: number; credit: number; count: number };
    adjustments: { debit: number; credit: number; count: number };
  };
  current_balance: number;
  ledger_entries: number;
}

export class LedgerService {
  /**
   * Append a ledger entry and update user balance atomically
   * This is the ONLY way balances should be updated
   */
  async appendEntry(
    data: LedgerEntryData,
    tx?: SequelizeTransaction
  ): Promise<{ entry: LedgerEntry; balance: number }> {
    const shouldCommit = !tx;
    let finalTx = tx;

    try {
      console.error('[LEDGER SERVICE] appendEntry called:', { farmer_id: data.farmer_id, shop_id: data.shop_id, amount: data.amount, type: data.type, category: data.category });
      
      if (!finalTx) {
        finalTx = await (LedgerEntry.sequelize?.transaction() as Promise<SequelizeTransaction>);
      }

      // 1. Create ledger entry
      const entry = await LedgerEntry.create(
        {
          farmer_id: data.farmer_id,
          shop_id: data.shop_id,
          amount: data.amount,
          type: data.type,
          category: data.category,
          notes: data.notes,
          commission_amount: data.commission_amount,
          net_amount: data.net_amount,
          created_by: data.created_by,
          created_at: new Date()
        } as LedgerEntryAttributes,
        { transaction: finalTx }
      );

      // No direction field, just use amount as is
      const signedAmount = data.amount;

      // 3. Update or create user balance
      const [userBalance, created] = await UserBalance.findOrCreate({
        where: {
          user_id: data.farmer_id,
          shop_id: data.shop_id
        },
        defaults: {
          user_id: data.farmer_id,
          shop_id: data.shop_id,
          balance: data.amount,
          version: 1,
          last_updated: new Date()
        } as UserBalanceCreationAttributes,
        transaction: finalTx
      });

      let newBalance: number;

      if (created) {
        newBalance = Number(userBalance.balance || data.amount);
      } else {
        // Update existing balance
        const oldBalance = Number(userBalance.balance || 0);
        newBalance = oldBalance + data.amount;

        await UserBalance.update(
          {
            balance: newBalance,
            version: (userBalance.version || 0) + 1,
            last_updated: new Date()
          },
          {
            where: {
              user_id: data.farmer_id,
              shop_id: data.shop_id
            },
            transaction: finalTx
          }
        );
      }

      logger.info(
        {
          entryId: entry.id,
          farmerId: data.farmer_id,
          shopId: data.shop_id,
          type: data.type,
          category: data.category,
          amount: data.amount,
          newBalance: newBalance
        },
        '[LEDGER] Entry created and balance updated'
      );

      if (shouldCommit && finalTx) {
        await finalTx.commit();
      }

      return {
        entry,
        balance: newBalance
      };
    } catch (error) {
      if (shouldCommit && finalTx) {
        await finalTx.rollback();
      }
      logger.error({ error, data }, '[LEDGER] Failed to append entry');
      throw error;
    }
  }

  /**
   * Get current balance for a user-shop pair
   * No calculation needed - it's pre-calculated!
   */
  async getBalance(farmerId: number, shopId: number): Promise<number> {
    const balance = await UserBalance.findOne({
      where: {
        user_id: farmerId,
        shop_id: shopId
      }
    });

    return balance ? Number(balance.balance || 0) : 0;
  }

  /**
   * Get ledger history for audit trail
   */
  async getLedgerHistory(
    farmerId: number,
    shopId: number,
    filters?: {
      types?: string[];
      from?: Date;
      to?: Date;
      limit?: number;
    }
  ): Promise<LedgerEntry[]> {
    const where: WhereOptions<LedgerEntryAttributes> = {
      farmer_id: farmerId,
      shop_id: shopId
    };

    if (filters?.types && filters.types.length > 0) {
      where.type = { [Op.in]: filters.types };
    }

    if (filters?.from || filters?.to) {
      where.created_at = {
        ...(filters.from && { [Op.gte]: filters.from }),
        ...(filters.to && { [Op.lte]: filters.to })
      };
    }

    return LedgerEntry.findAll({
      where,
      order: [['created_at', 'ASC']],
      limit: filters?.limit || 1000
    });
  }

  /**
   * Get settlement summary for a user
   * Aggregates ledger data for UI display
   */
  async getSettlementSummary(
    userId: number,
    shopId: number,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<SettlementSummary> {
    // Get all ledger entries
    const entries = await this.getLedgerHistory(userId, shopId, {
      from: periodStart,
      to: periodEnd,
      limit: 10000
    });

    // Aggregate by type
    const byType: Record<string, { debit: number; credit: number; count: number }> = {};

    for (const entry of entries) {
      const key = entry.type;
      if (!byType[key]) {
        byType[key] = { debit: 0, credit: 0, count: 0 };
      }
      const amount = Number(entry.amount || 0);
      // No direction field, so just sum as credit
      byType[key].credit += amount;
      byType[key].count++;
    }

    // Get current balance
    const currentBalance = await this.getBalance(userId, shopId);

    return {
      period: {
        from: periodStart || new Date('2025-01-01'),
        to: periodEnd || new Date()
      },
      summary: {
        transactions: byType.TRANSACTION || { debit: 0, credit: 0, count: 0 },
        payments: byType.PAYMENT || { debit: 0, credit: 0, count: 0 },
        advances: byType.ADVANCE || { debit: 0, credit: 0, count: 0 },
        expenses: byType.EXPENSE || { debit: 0, credit: 0, count: 0 },
        adjustments: byType.ADJUSTMENT || { debit: 0, credit: 0, count: 0 }
      },
      current_balance: currentBalance,
      ledger_entries: entries.length
    };
  }
}

export const ledgerService = new LedgerService();
