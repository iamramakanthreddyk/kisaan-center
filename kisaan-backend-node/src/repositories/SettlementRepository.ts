import { Settlement, SettlementStatus, SettlementReason, SettlementCreationAttributes } from '../models/settlement';
import { DomainError } from '../errors/DomainError';

export class SettlementRepository {
  async getPendingExpenses(shopId: number, farmerId: number): Promise<number> {
    try {
      return await Settlement.sum('amount', {
        where: { shop_id: shopId, user_id: farmerId, status: SettlementStatus.Pending, reason: SettlementReason.Adjustment }
      });
    } catch (err) {
      throw new DomainError(`Failed to fetch pending expenses: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async findById(settlementId: number) {
    try {
      return await Settlement.findByPk(settlementId);
    } catch (err) {
      throw new DomainError(`Failed to fetch settlement by ID: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async findAllByShop(shopId: number) {
    try {
      return await Settlement.findAll({ where: { shop_id: shopId } });
    } catch (err) {
      throw new DomainError(`Failed to fetch settlements by shop: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async findAllByUser(shopId: number, userId: number) {
    try {
      return await Settlement.findAll({ where: { shop_id: shopId, user_id: userId } });
    } catch (err) {
      throw new DomainError(`Failed to fetch settlements by user: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async create(settlementData: Partial<Settlement>) {
    try {
      return await Settlement.create(settlementData as SettlementCreationAttributes);
    } catch (err) {
      throw new DomainError(`Failed to create settlement: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async updateStatus(settlementId: number, status: SettlementStatus) {
    try {
      const settlement = await Settlement.findByPk(settlementId);
      if (!settlement) throw new DomainError('Settlement not found');
      settlement.status = status;
      await settlement.save();
      return settlement;
    } catch (err) {
      throw new DomainError(`Failed to update settlement status: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
