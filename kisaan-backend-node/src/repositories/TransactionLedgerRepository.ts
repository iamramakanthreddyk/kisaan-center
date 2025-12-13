import { BaseRepository } from './BaseRepository';
import { TransactionLedger } from '../models/transactionLedger';
import { ModelStatic } from 'sequelize';

export interface LedgerEntry {
  id?: number;
  transaction_id?: number | null;
  user_id: number;
  role: string;
  delta_amount: number;
  balance_before?: number | null;
  balance_after?: number | null;
  reason_code: string;
  created_at?: Date;
}

export class TransactionLedgerRepository extends BaseRepository<TransactionLedger, LedgerEntry> {
  protected model: ModelStatic<TransactionLedger> = TransactionLedger;
  protected entityName = 'TransactionLedger';

  protected toDomainEntity(model: TransactionLedger): LedgerEntry {
    return { ...model.get() } as LedgerEntry;
  }

  protected toModelData(entity: LedgerEntry): Record<string, unknown> {
    return { ...entity };
  }
}
