import { AuditLog } from '../models/auditLog';
import { User } from '../models/user';
import { Shop } from '../models/shop';
import { Op } from 'sequelize';

export class AuditLogService {
  async getAuditLogs(filters?: {
    shopId?: number;
    userId?: number;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
  const where: Record<string, unknown> = {};
    
    if (filters?.shopId) where.shop_id = filters.shopId;
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entity_type = filters.entityType;
    
    if (filters?.startDate && filters?.endDate) {
      where.created_at = {
        [Op.between]: [filters.startDate, filters.endDate]
      };
    }

    const auditLogs = await AuditLog.findAll({
      where,
      include: [
        { model: User, as: 'auditUser', attributes: ['id', 'username', 'role'] },
        { model: Shop, as: 'auditShop', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    return auditLogs.map(log => log.toJSON());
  }
}