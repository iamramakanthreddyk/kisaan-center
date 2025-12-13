import { Request, Response } from 'express';
import { AuditLogService } from '../services/auditLogService';

export class AuditLogController {
  private auditLogService = new AuditLogService();

  async getAuditLogs(req: Request, res: Response) {
    try {
      const { shopId, userId, action, entityType, startDate, endDate } = req.query;
      
      const filters = {
        shopId: shopId ? Number(shopId) : undefined,
        userId: userId ? Number(userId) : undefined,
        action: action as string,
        entityType: entityType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };
      
      const auditLogs = await this.auditLogService.getAuditLogs(filters);

      res.json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
