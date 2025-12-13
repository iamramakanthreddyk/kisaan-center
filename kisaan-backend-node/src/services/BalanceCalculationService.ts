/**
 * BalanceCalculationService
 *
 * Purpose:
 *  - Reconcile user balance from first principles
 *  - Detect balance drift between stored and computed values
 *  - Validate balance consistency across entities
 *
 * Calculation Logic:
 *  - Farmer: sum of unpaid earnings - unsettled expenses
 *  - Buyer: sum of unpaid transaction amounts
 */

import sequelize from '../config/database';
import { USER_ROLES } from '../shared/constants';

interface QueryResult {
  total: number;
}

interface UserQueryResult {
  id: number;
  username: string;
  role: string;
  balance: number;
}

interface BalanceQueryResult {
  balance: number;
}

interface BalanceBreakdown {
  earned: number;
  paid: number;
  pending: number;
  expenses?: number;
  netBalance: number;
}

interface BalanceDriftReport {
  userId: number;
  username: string;
  role: string;
  storedBalance: number;
  computedBalance: number;
  drift: number;
  driftPercent: number;
  breakdown?: BalanceBreakdown;
  isValid: boolean;
}

export class BalanceCalculationService {
  private TOLERANCE = 0.01;

  /**
   * Calculate balance for a single user from first principles
   */
  async calculateBalance(userId: number): Promise<number> {
    const role = await this.getUserRole(userId);
    
    if (role === USER_ROLES.FARMER) {
      return this.calculateFarmerBalance(userId);
    } else if (role === USER_ROLES.BUYER) {
      return this.calculateBuyerBalance(userId);
    }
    
    return 0;
  }

  /**
   * Farmer balance: unpaid earnings - unsettled expenses
   */
  private async calculateFarmerBalance(userId: number): Promise<number> {
    // Unpaid farmer earnings
    const earnings = (await sequelize.query(`
      SELECT COALESCE(SUM(t.farmer_earning), 0) as total
      FROM kisaan_transactions t
      WHERE t.farmer_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    // Paid farmer amounts (via payment allocations)
    const paid = (await sequelize.query(`
      SELECT COALESCE(SUM(pa.allocated_amount), 0) as total
      FROM payment_allocations pa
      JOIN kisaan_payments p ON p.id = pa.payment_id
      JOIN kisaan_transactions t ON t.id = pa.transaction_id
      WHERE t.farmer_id = :userId AND p.status = 'PAID' AND p.payee_type = 'FARMER'
    `, { replacements: { userId } })) as QueryResult[][];

    // Unsettled expenses
    const expenses = (await sequelize.query(`
      SELECT COALESCE(SUM(e.amount), 0) as total
      FROM kisaan_expenses e
      WHERE e.user_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    const earnedAmount = Number(earnings[0]?.[0]?.total || 0);
    const paidAmount = Number(paid[0]?.[0]?.total || 0);
    const expenseAmount = Number(expenses[0]?.[0]?.total || 0);

    return earnedAmount - paidAmount - expenseAmount;
  }

  /**
   * Buyer balance: unpaid purchase amounts
   */
  private async calculateBuyerBalance(userId: number): Promise<number> {
    const earned = (await sequelize.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM kisaan_transactions
      WHERE buyer_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    const paid = (await sequelize.query(`
      SELECT COALESCE(SUM(pa.allocated_amount), 0) as total
      FROM payment_allocations pa
      JOIN kisaan_payments p ON p.id = pa.payment_id
      JOIN kisaan_transactions t ON t.id = pa.transaction_id
      WHERE t.buyer_id = :userId AND p.status = 'PAID' AND p.payer_type = 'BUYER'
    `, { replacements: { userId } })) as QueryResult[][];

    const earnedAmount = Number(earned[0]?.[0]?.total || 0);
    const paidAmount = Number(paid[0]?.[0]?.total || 0);

    return earnedAmount - paidAmount;
  }

  /**
   * Get detailed balance breakdown
   */
  async getBalanceBreakdown(userId: number): Promise<BalanceBreakdown | null> {
    const role = await this.getUserRole(userId);
    
    if (role === USER_ROLES.FARMER) {
      return this.getFarmerBreakdown(userId);
    } else if (role === USER_ROLES.BUYER) {
      return this.getBuyerBreakdown(userId);
    }
    
    return null;
  }

  private async getFarmerBreakdown(userId: number): Promise<BalanceBreakdown> {
    const earnings = (await sequelize.query(`
      SELECT COALESCE(SUM(farmer_earning), 0) as total FROM kisaan_transactions WHERE farmer_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    const paid = (await sequelize.query(`
      SELECT COALESCE(SUM(pa.allocated_amount), 0) as total
      FROM payment_allocations pa
      JOIN kisaan_payments p ON p.id = pa.payment_id
      JOIN kisaan_transactions t ON t.id = pa.transaction_id
      WHERE t.farmer_id = :userId AND p.status = 'PAID' AND p.payee_type = 'FARMER'
    `, { replacements: { userId } })) as QueryResult[][];

    const expenses = (await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM kisaan_expenses WHERE user_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    const earned = Number(earnings[0]?.[0]?.total || 0);
    const paidAmount = Number(paid[0]?.[0]?.total || 0);
    const expenseAmount = Number(expenses[0]?.[0]?.total || 0);
    const pending = earned - paidAmount;

    return {
      earned,
      paid: paidAmount,
      pending,
      expenses: expenseAmount,
      netBalance: pending - expenseAmount
    };
  }

  private async getBuyerBreakdown(userId: number): Promise<BalanceBreakdown> {
    const earned = (await sequelize.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM kisaan_transactions WHERE buyer_id = :userId
    `, { replacements: { userId } })) as QueryResult[][];

    const paid = (await sequelize.query(`
      SELECT COALESCE(SUM(pa.allocated_amount), 0) as total
      FROM payment_allocations pa
      JOIN kisaan_payments p ON p.id = pa.payment_id
      JOIN kisaan_transactions t ON t.id = pa.transaction_id
      WHERE t.buyer_id = :userId AND p.status = 'PAID' AND p.payer_type = 'BUYER'
    `, { replacements: { userId } })) as QueryResult[][];

    const earnedAmount = Number(earned[0]?.[0]?.total || 0);
    const paidAmount = Number(paid[0]?.[0]?.total || 0);
    const pending = earnedAmount - paidAmount;

    return {
      earned: earnedAmount,
      paid: paidAmount,
      pending,
      netBalance: pending
    };
  }

  /**
   * Validate balance consistency - compare stored vs computed
   */
  async validateBalanceConsistency(userId: number): Promise<BalanceDriftReport> {
    const user = (await sequelize.query(`
      SELECT id, username, role, balance FROM kisaan_users WHERE id = :userId
    `, { replacements: { userId } })) as UserQueryResult[][];

    if (!user || user.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = user[0][0];
    const storedBalance = Number(userData.balance || 0);
    const computedBalance = await this.calculateBalance(userId);
    const drift = Math.abs(storedBalance - computedBalance);
    const isValid = drift <= this.TOLERANCE;

    const driftPercent = storedBalance === 0
      ? 0
      : (drift / Math.abs(storedBalance)) * 100;

    return {
      userId: userData.id,
      username: userData.username,
      role: userData.role,
      storedBalance,
      computedBalance,
      drift,
      driftPercent,
      breakdown: await this.getBalanceBreakdown(userId) || undefined,
      isValid
    };
  }

  /**
   * Find all users with balance drift
   */
  async findDriftedUsers(tolerance: number = this.TOLERANCE): Promise<BalanceDriftReport[]> {
    const users = (await sequelize.query(`
      SELECT id, username, role, balance 
      FROM kisaan_users 
      WHERE balance != 0 AND role IN (:roles)
    `, { replacements: { roles: [USER_ROLES.FARMER, USER_ROLES.BUYER] } })) as UserQueryResult[][];

    const drifted: BalanceDriftReport[] = [];

    for (const userRow of users[0] || []) {
      const report = await this.validateBalanceConsistency(userRow.id);
      if (!report.isValid || report.drift > tolerance) {
        drifted.push(report);
      }
    }

    return drifted.sort((a, b) => b.drift - a.drift);
  }

  /**
   * Fix balance drift by updating stored balance to computed value
   */
  async fixBalanceDrift(userId: number): Promise<{ before: number; after: number; fixed: boolean }> {
    const before = (await sequelize.query(`
      SELECT balance FROM kisaan_users WHERE id = :userId
    `, { replacements: { userId } })) as BalanceQueryResult[][];

    if (!before || before.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const beforeBalance = Number(before[0]?.[0]?.balance || 0);
    const computedBalance = await this.calculateBalance(userId);

    if (Math.abs(beforeBalance - computedBalance) <= this.TOLERANCE) {
      return { before: beforeBalance, after: beforeBalance, fixed: false };
    }

    await sequelize.query(`
      UPDATE kisaan_users SET balance = :balance, updated_at = NOW() WHERE id = :userId
    `, { replacements: { balance: computedBalance, userId } });

    return {
      before: beforeBalance,
      after: computedBalance,
      fixed: true
    };
  }

  /**
   * Helper: get user role
   */
  private async getUserRole(userId: number): Promise<string> {
    const user = (await sequelize.query(`
      SELECT role FROM kisaan_users WHERE id = :userId
    `, { replacements: { userId } })) as { role: string }[][];

    if (!user || user.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    return user[0]?.[0]?.role;
  }
}

export const balanceCalculationService = new BalanceCalculationService();
