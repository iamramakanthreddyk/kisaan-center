import { Request, Response } from 'express';
import { Shop, User, Transaction } from '../models';
import { Op } from 'sequelize';

export const getSuperadminDashboard = async (req: Request, res: Response) => {
  try {
    // Get aggregated counts only - no individual records
    const [totalShops, totalUsers, totalTransactions] = await Promise.all([
      Shop.count(),
      User.count({ where: { role: { [Op.ne]: 'superadmin' } } }),
      Transaction.count()
    ]);

    // Active shops/users concept removed (status field dropped in simplified model)
    const activeShops = totalShops;
    const activeUsers = totalUsers;

    // Get aggregated revenue (sum only, no individual transactions)
    // Note: Database uses total_sale_value and shop_commission columns
    const revenueResultRaw = await Transaction.findOne({
      attributes: [
        [Transaction.sequelize!.fn('SUM', Transaction.sequelize!.col('total_sale_value')), 'totalRevenue'],
        [Transaction.sequelize!.fn('SUM', Transaction.sequelize!.col('shop_commission')), 'totalCommission']
      ],
      raw: true
    });
    let totalRevenue = 0;
    let totalCommission = 0;
    if (revenueResultRaw && typeof revenueResultRaw === 'object') {
      const tr = (revenueResultRaw as unknown as Record<string, unknown>);
      totalRevenue = Number(tr['totalRevenue'] ?? 0);
      totalCommission = Number(tr['totalCommission'] ?? 0);
    }

    // Get shop counts by status for charts
  const shopStats: unknown[] = []; // status-based grouping removed

    // Get user counts by role for charts  
    const userStats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'count']
      ],
      where: { role: { [Op.ne]: 'superadmin' } },
      group: ['role'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        metrics: {
          totalShops,
          totalUsers,
          totalTransactions,
          activeShops,
          activeUsers,
          totalRevenue,
          totalCommission
        },
        charts: {
          shopStats,
          userStats
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching superadmin dashboard:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message
    });
  }
};
