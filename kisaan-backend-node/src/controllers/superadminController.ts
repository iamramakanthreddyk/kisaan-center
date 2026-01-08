import { Request, Response } from 'express';
import { Shop, User, Transaction, UserSession } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/database';

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

export const getUserActivityStats = async (req: Request, res: Response) => {
  try {
    // Get recent logins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogins = await User.findAll({
      attributes: ['id', [sequelize.col('firstname'), 'name'], 'email', 'last_login', 'login_count', 'last_activity'],
      where: {
        last_login: { [Op.gte]: thirtyDaysAgo },
        role: { [Op.ne]: 'superadmin' }
      },
      order: [['last_login', 'DESC']],
      limit: 50,
      raw: true
    }) as unknown as Array<{ id: number; name: string; email: string; last_login: string; login_count: number; last_activity: string }>;

    // Get active sessions count
    const activeSessions = await UserSession.count({
      where: { is_active: true }
    });

    // Get users with most sessions (potential multiple session users)
    const sessionCounts = await UserSession.findAll({
      attributes: [
        'user_id',
        [UserSession.sequelize!.fn('COUNT', UserSession.sequelize!.col('id')), 'session_count']
      ],
      where: { is_active: true },
      group: ['user_id'],
      having: UserSession.sequelize!.literal('COUNT("UserSession"."id") > 1'),
      order: [[UserSession.sequelize!.fn('COUNT', UserSession.sequelize!.col('id')), 'DESC']],
      limit: 20,
      raw: true
    });

    // Get user details for these user_ids
    const userIds = sessionCounts.map(sc => (sc as any).user_id);
    const usersWithMultipleSessionsRaw = await User.findAll({
      where: {
        id: { [Op.in]: userIds },
        role: { [Op.ne]: 'superadmin' }
      },
      attributes: ['id', [sequelize.col('firstname'), 'name'], 'email', 'role'],
      raw: true
    }) as unknown as Array<{ id: number; name: string; email: string; role: string }>;

    // Combine the results
    const usersWithMultipleSessionsCombined = sessionCounts.map(sessionCount => {
      const user = usersWithMultipleSessionsRaw.find(u => u.id === (sessionCount as any).user_id);
      return {
        user_id: (sessionCount as any).user_id,
        session_count: (sessionCount as any).session_count,
        user: user ? {
          name: user.name,
          email: user.email,
          role: user.role
        } : null
      };
    }).filter(item => item.user !== null);

    // Get login activity over time (daily logins for last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const loginActivity = await User.findAll({
      attributes: [
        [User.sequelize!.fn('DATE', User.sequelize!.col('last_login')), 'date'],
        [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'login_count']
      ],
      where: {
        last_login: { [Op.gte]: sevenDaysAgo },
        role: { [Op.ne]: 'superadmin' }
      },
      group: [User.sequelize!.fn('DATE', User.sequelize!.col('last_login'))],
      order: [[User.sequelize!.fn('DATE', User.sequelize!.col('last_login')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        recentLogins,
        activeSessions,
        usersWithMultipleSessions: usersWithMultipleSessionsCombined,
        loginActivity
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching user activity stats:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity stats',
      message
    });
  }
};

export const getUserSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const sessions = await UserSession.findAll({
      where: { user_id: userIdNum },
      include: [{
        model: User,
        attributes: ['name', 'email']
      }],
      order: [['created_at', 'DESC']],
      limit: 20,
      raw: true
    });

    res.json({
      success: true,
      data: sessions
    });

  } catch (error: unknown) {
    console.error('Error fetching user sessions:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user sessions',
      message
    });
  }
};
