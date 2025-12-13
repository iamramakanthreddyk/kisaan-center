/**
 * User Analytics Service
 * Calculates computed fields for users like cumulative_value based on transaction data
 */

import { Transaction } from '../models/transaction';

export class UserAnalyticsService {
  
  /**
   * Calculate cumulative value for a user based on their role
   * - Farmer: Total value of all products they sold (sum of total_amount where farmer_id = userId)
   * - Buyer: Total value of all products they bought (sum of total_amount where buyer_id = userId)  
   * - Owner: Total commission earned from their shop (sum of commission_amount where shop_id = userShopId)
   */
  static async calculateCumulativeValue(userId: number, role: string, shopId?: number | null): Promise<number> {
    try {
  let whereClause: Record<string, unknown> = {};
      let sumColumn = 'total_amount';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { USER_ROLES } = require('../shared/constants');
      switch (role) {
        case USER_ROLES.FARMER:
          whereClause = { farmer_id: userId };
          sumColumn = 'total_amount';
          break;

        case USER_ROLES.BUYER:
          whereClause = { buyer_id: userId };
          sumColumn = 'total_amount';
          break;

        case USER_ROLES.OWNER:
          if (!shopId) return 0;
          whereClause = { shop_id: shopId };
          sumColumn = 'commission_amount';
          break;

        default:
          return 0;
      }

      const result = await Transaction.findOne({
        attributes: [
          [Transaction.sequelize!.fn('COALESCE', 
            Transaction.sequelize!.fn('SUM', Transaction.sequelize!.col(sumColumn)), 
            0
          ), 'total']
        ],
        where: whereClause,
        raw: true
      });

  return Number((result as { total?: number | string } | null)?.total || 0);
    } catch (error) {
      console.error('Error calculating cumulative value:', error);
      return 0;
    }
  }

  /**
   * Determine user status based on activity
   * For now, returns 'active' by default
   * TODO: Implement logic based on last login, recent transactions, etc.
   */
  static async calculateUserStatus(_userId: number): Promise<'active' | 'inactive'> {
    // For now, default to active
    // Future implementation could check:
    // - Last login date
    // - Recent transaction activity
    // - Account suspension flags
    return 'active';
  }

  /**
   * Get analytics summary for a user (balance, cumulative value, status)
   */
  static async getUserAnalytics(_userId: number, role: string, shopId?: number | null) {
    const [cumulativeValue, status] = await Promise.all([
      this.calculateCumulativeValue(_userId, role, shopId),
      this.calculateUserStatus(_userId)
    ]);

    return {
      cumulative_value: cumulativeValue,
      status: status
    };
  }

  /**
   * Get analytics for multiple users efficiently
   * TODO: Optimize with bulk queries for better performance
   */
  static async getBulkUserAnalytics(users: Array<{id: number, role: string, shop_id?: number | null}>) {
    const analytics = await Promise.all(
      users.map(user => this.getUserAnalytics(user.id, user.role, user.shop_id))
    );

    return users.map((user, index) => ({
      userId: user.id,
      ...analytics[index]
    }));
  }
}