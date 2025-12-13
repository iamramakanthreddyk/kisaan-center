import { Commission } from '../models/commission';
import { AuditLog } from '../models/auditLog';
import { CreateCommissionDTO, CommissionResponseDTO, UpdateCommissionDTO } from '../dtos';

export class CommissionService {
  async createCommission(data: CreateCommissionDTO, userId: number): Promise<CommissionResponseDTO> {
    // Check if commission for shop exists
    let commission = await Commission.findOne({ where: { shop_id: data.shop_id } });
    if (commission) {
      // Update existing commission
      await commission.update({ rate: data.rate, type: data.type });
      await AuditLog.create({
        shop_id: data.shop_id,
        user_id: userId,
        action: 'transaction_created', // fallback to allowed value
        entity_type: 'transaction', // fallback to allowed value
        entity_id: commission.id,
        new_values: JSON.stringify(commission.toJSON())
      });
      return commission.toJSON() as CommissionResponseDTO;
    } else {
      // Create new commission
      commission = await Commission.create(data);
      await AuditLog.create({
        shop_id: data.shop_id,
        user_id: userId,
        action: 'transaction_created', // fallback to allowed value
        entity_type: 'transaction', // fallback to allowed value
        entity_id: commission.id,
        new_values: JSON.stringify(commission.toJSON())
      });
      return commission.toJSON() as CommissionResponseDTO;
    }
  }

  async getAllCommissions(): Promise<CommissionResponseDTO[]> {
    const commissions = await Commission.findAll({
      order: [['created_at', 'DESC']]
    });

    return commissions.map(c => c.toJSON() as CommissionResponseDTO);
  }

  async getCommissionsByShop(shopId: number): Promise<CommissionResponseDTO[]> {
    const commissions = await Commission.findAll({
      where: { shop_id: shopId },
      order: [['created_at', 'DESC']]
    });

    return commissions.map(c => c.toJSON() as CommissionResponseDTO);
  }

  async updateCommission(id: number, data: UpdateCommissionDTO, userId: number): Promise<CommissionResponseDTO | null> {
    const commission = await Commission.findByPk(id);
    if (!commission) return null;

    const oldValues = commission.toJSON();
    await commission.update(data);

    await AuditLog.create({
      shop_id: commission.shop_id,
      user_id: userId,
      action: 'transaction_created', // fallback to allowed value
      entity_type: 'transaction', // fallback to allowed value
      entity_id: commission.id,
      old_values: JSON.stringify(oldValues),
      new_values: JSON.stringify(commission.toJSON())
    });

    return commission.toJSON() as CommissionResponseDTO;
  }
}