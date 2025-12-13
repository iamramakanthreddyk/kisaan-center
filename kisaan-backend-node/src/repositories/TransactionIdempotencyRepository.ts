import { BaseRepository } from './BaseRepository';
import { Transaction } from 'sequelize';
import { TransactionIdempotency, TransactionIdempotencyCreationAttributes } from '../models/transactionIdempotency';

export interface IdempotencyRecordEntity {
  id?: number;
  key: string;
  buyer_id: number;
  farmer_id: number;
  shop_id: number;
  total_amount: number;
  transaction_id?: number | null;
  created_at?: Date;
}

export class TransactionIdempotencyRepository extends BaseRepository<TransactionIdempotency, IdempotencyRecordEntity> {
  protected model: typeof TransactionIdempotency;
  protected entityName = 'TransactionIdempotency';

  constructor() {
    super();
    // Importing directly from model file for correct typing
    this.model = TransactionIdempotency;
  }

  protected toDomainEntity(model: TransactionIdempotency): IdempotencyRecordEntity {
    const json = model.toJSON() as IdempotencyRecordEntity;
    return {
      id: json.id,
      key: json.key,
      buyer_id: json.buyer_id,
      farmer_id: json.farmer_id,
      shop_id: json.shop_id,
      total_amount: Number(json.total_amount),
      transaction_id: json.transaction_id ?? null,
      created_at: json.created_at ? new Date(json.created_at) : undefined
    };
  }

  protected toModelData(entity: IdempotencyRecordEntity): Record<string, unknown> {
    return { ...entity };
  }

  async findByKey(key: string): Promise<IdempotencyRecordEntity | null> {
    const rec = await this.model.findOne({ where: { key } });
    return rec ? this.toDomainEntity(rec) : null;
  }

  async createRecord(
    data: IdempotencyRecordEntity,
    opts?: { tx?: Transaction }
  ): Promise<IdempotencyRecordEntity> {
    // Map IdempotencyRecordEntity to TransactionIdempotencyCreationAttributes
    const modelData: TransactionIdempotencyCreationAttributes = {
      ...data
    };
    const createOpts = opts?.tx ? { transaction: opts.tx } : undefined;
    const created = await this.model.create(modelData, createOpts);
    return this.toDomainEntity(created);
  }

  async attachTransaction(
    key: string,
    transactionId: number,
    opts?: { tx?: Transaction }
  ): Promise<void> {
    const updateOpts: { where: { key: string }; transaction?: Transaction } = { where: { key } };
    if (opts?.tx) updateOpts.transaction = opts.tx;
    await this.model.update(
      { transaction_id: transactionId },
      updateOpts
    );
  }
}