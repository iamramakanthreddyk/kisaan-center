import { Commission } from '../models/commission';
import { Shop } from '../models/shop';
import { AuditLog } from '../models/auditLog';
import { CreateCommissionDTO, CommissionResponseDTO, UpdateCommissionDTO } from '../dtos';

export class CommissionService {
  async createCommission(data: CreateCommissionDTO, userId: number): Promise<CommissionResponseDTO> {
    // Update shop's commission rate
    const shop = await Shop.findByPk(data.shop_id);
    if (!shop) {
      throw new Error('Shop not found');
    }

    await shop.update({ commission_rate: data.rate });

    await AuditLog.create({
      shop_id: data.shop_id,
      user_id: userId,
      action: 'transaction_created', // fallback
      entity_type: 'transaction', // fallback
      entity_id: shop.id,
      new_values: JSON.stringify({ commission_rate: data.rate })
    });

    return {
      id: Number(shop.id),
      shop_id: Number(shop.id),
      rate: Number(data.rate),
      type: data.type,
      created_at: shop.created_at || new Date(),
      updated_at: shop.updated_at || new Date()
    };
  }

  async getAllCommissions(): Promise<CommissionResponseDTO[]> {
    const shops = await Shop.findAll({
      order: [['created_at', 'DESC']]
    });

    return shops.map(shop => ({
      id: Number(shop.id),
      shop_id: Number(shop.id),
      rate: Number(shop.commission_rate) || 0,
      type: 'percentage' as const,
      created_at: shop.created_at || new Date(),
      updated_at: shop.updated_at || new Date()
    }));
  }

  async getCommissionsByShop(shopId: number): Promise<CommissionResponseDTO[]> {
    const shop = await Shop.findByPk(shopId);
    if (!shop) return [];

    // Return shop's commission rate in the same format
    return [{
      id: Number(shop.id),
      shop_id: Number(shop.id),
      rate: Number(shop.commission_rate) || 0,
      type: 'percentage' as const,
      created_at: shop.created_at || new Date(),
      updated_at: shop.updated_at || new Date()
    }];
  }

  async updateCommission(id: number, data: UpdateCommissionDTO, userId: number): Promise<CommissionResponseDTO | null> {
    const shop = await Shop.findByPk(id);
    if (!shop) return null;

    const oldValues = { commission_rate: shop.commission_rate };
    await shop.update({ commission_rate: data.rate });

    await AuditLog.create({
      shop_id: shop.id,
      user_id: userId,
      action: 'transaction_created', // fallback
      entity_type: 'transaction', // fallback
      entity_id: shop.id,
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify({ commission_rate: data.rate })
    });

    return {
      id: Number(shop.id),
      shop_id: Number(shop.id),
      rate: Number(data.rate || shop.commission_rate) || 0,
      type: 'percentage' as const,
      created_at: shop.created_at || new Date(),
      updated_at: shop.updated_at || new Date()
    };
  }
}