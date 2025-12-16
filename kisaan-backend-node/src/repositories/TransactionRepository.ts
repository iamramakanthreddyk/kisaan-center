import { BaseRepository } from './BaseRepository';
// Import models index to ensure all models and associations are initialized
import '../models';
import { Transaction } from '../models/transaction';
import { ModelStatic, FindAndCountOptions } from 'sequelize';
import type { Payment } from '../models/payment';
import { Op } from 'sequelize';
import { PAYMENT_STATUS } from '../shared/constants/index';
// Note: we intentionally avoid importing the default sequelize instance here to prevent
// accidental direct transaction usage in repositories. Use service layer transaction
// management instead.
import { TransactionEntity } from '../entities/TransactionEntity';

/**
 * Transaction Repository Implementation
 */
export class TransactionRepository extends BaseRepository<Transaction, TransactionEntity> {
  protected model: ModelStatic<Transaction>;
  protected entityName = 'Transaction';

  constructor() {
    super();
    this.model = Transaction;
  }

  /**
   * Find transactions by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<TransactionEntity[]> {
    const models = await this.model.findAll({
      where: {
        transaction_date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });
    return models.map((model) => this.toDomainEntity(model));
  }

  async findByFilters(params: {
    shopId?: number;
    farmerId?: number;
    buyerId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  }): Promise<{ rows: TransactionEntity[]; count: number }> {
  // Build a robust where clause that matches IDs whether stored as number or string
  const where: Record<string, unknown> = {};
  const andClauses: Array<Record<string, unknown>> = [];
  if (params.shopId) {
    andClauses.push({ [Op.or]: [{ shop_id: params.shopId }, { shop_id: String(params.shopId) }] });
  }
  if (params.farmerId) {
    andClauses.push({ [Op.or]: [{ farmer_id: params.farmerId }, { farmer_id: String(params.farmerId) }] });
  }
  if (params.buyerId) {
    andClauses.push({ [Op.or]: [{ buyer_id: params.buyerId }, { buyer_id: String(params.buyerId) }] });
  }
  if (andClauses.length > 0) {
    // Op.and is a symbol; assign via Record<symbol, unknown> to satisfy TypeScript
    (where as Record<symbol, unknown>)[Op.and as symbol] = andClauses;
  }
    // Always convert to Date objects before checking validity
    const startDate = params.startDate instanceof Date ? params.startDate : params.startDate ? new Date(params.startDate) : undefined;
    const endDate = params.endDate instanceof Date ? params.endDate : params.endDate ? new Date(params.endDate) : undefined;
    

    
    if (startDate && !isNaN(startDate.getTime()) && endDate && !isNaN(endDate.getTime())) {
      // Fix: Use proper date range comparison 
      // Adjust the endDate to include the entire day
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      where.transaction_date = { 
        [Op.gte]: startDate,
        [Op.lte]: adjustedEndDate
      };

    }
    // ...existing code...
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const allowedOrder = new Set(['transaction_date','created_at','total_amount','farmer_earning']);
    const orderCol = params.orderBy && allowedOrder.has(params.orderBy) ? params.orderBy : 'transaction_date';
    const orderDir = params.orderDir === 'ASC' ? 'ASC' : 'DESC';
    // Include related data in single query to avoid N+1
    const { User } = await import('../models/user');
    const { Shop } = await import('../models/shop');
    const { Payment } = await import('../models/payment');
    

    
    const { rows, count } = await this.safeFindAndCountAll({ 
      where, 
      limit, 
      offset, 
      order: [[orderCol, orderDir]],
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'username', 'firstname'],
          required: false
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'username', 'firstname'],
          required: false
        },
        {
          model: Shop,
          as: 'transactionShop',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'method', 'status', 'payer_type', 'payee_type', 'created_at', 'payment_date', 'counterparty_id'],
          required: false
        }
      ],
      distinct: true // Important for accurate count with JOINs
    });
    

    
    // Convert to entities with all related data already loaded
    const rowsWithPayments = rows.map((m: Transaction & { payments?: Payment[] }) => {
      const entity = this.toDomainEntity(m);
      entity.payments = m.payments?.map((p: Payment) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        payer_type: p.payer_type,
        payee_type: p.payee_type,
        created_at: p.created_at
      })) || [];

      // Calculate payment sum and set status
      const paymentsArr = entity.payments as Array<{ amount: number; status?: string }>;
      // Only count payments that are completed/paid when inferring transaction status
      const paymentSum = paymentsArr
        .filter(p => String(p.status || '').toUpperCase() === String(PAYMENT_STATUS.PAID))
        .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);
      const totalAmount = typeof entity.total_amount === 'number' ? entity.total_amount : 0;
      if (paymentSum === 0) {
        entity.status = 'pending';
      } else if (paymentSum < totalAmount) {
        entity.status = 'partial';
      } else if (paymentSum >= totalAmount && totalAmount > 0) {
        entity.status = 'completed';
      }
      return entity;
    });
    return { rows: rowsWithPayments, count };
  }

  // Wrap the findAndCountAll call to handle older SQLite schemas missing `total_amount`
  // (This mirrors the defensive pattern used in findByShop).
  private async safeFindAndCountAll(options: FindAndCountOptions) {
    try {
      return await this.model.findAndCountAll(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('no such column') && msg.includes('total_amount')) {
        // Retry without selecting total_amount (explicit attribute list)
        const safeOptions: FindAndCountOptions = { ...options };
        safeOptions.attributes = [
          'id','shop_id','farmer_id','buyer_id','category_id','product_name','quantity','unit_price','total_sale_value','shop_commission','farmer_earning','product_id','commission_type','status','transaction_date','settlement_date','notes','created_at','updated_at'
        ];
        safeOptions.attributes = [
          'id','shop_id','farmer_id','buyer_id','category_id','product_name','quantity','unit_price','total_sale_value','shop_commission','farmer_earning','product_id','commission_type','status','transaction_date','settlement_date','notes','created_at','updated_at'
        ];
        // Remove order by total_amount if present
        if (Array.isArray(safeOptions.order)) {
          safeOptions.order = safeOptions.order.filter((o) => !(Array.isArray(o) && o[0] === 'total_amount'));
        }
        return await this.model.findAndCountAll(safeOptions);
      }
      throw err;
    }
  }

  /**
   * Convert database model to domain entity
   */
  protected toDomainEntity(model: Transaction): TransactionEntity {
    return new TransactionEntity({
      id: model.id,
      shop_id: model.shop_id,
      farmer_id: model.farmer_id,
      buyer_id: model.buyer_id,
      product_id: model.product_id ?? undefined,
      category_id: model.category_id,
      product_name: model.product_name,
      quantity: Number(model.quantity),
      unit_price: Number(model.unit_price),
      farmer_earning: Number(model.farmer_earning),
      total_amount: Number(model.total_amount),
      commission_amount: Number(model.commission_amount),
      commission_rate: model.commission_rate !== undefined && model.commission_rate !== null ? Number(model.commission_rate) : undefined,
      commission_type: model.commission_type ?? undefined,
  status: (model.status as TransactionEntity['status']) ?? undefined,
      transaction_date: model.transaction_date ?? undefined,
      settlement_date: model.settlement_date ?? undefined,
      notes: model.notes ?? undefined,
  metadata: (model.metadata as Record<string, unknown>) ?? undefined,
      created_at: model.created_at,
      updated_at: model.updated_at
    });
  }

  /**
   * Convert domain entity to database model data
   */
  protected toModelData(entity: Partial<TransactionEntity>): Record<string, unknown> {
    // Always set both legacy and canonical fields, using all available values
    const totalAmount = entity.total_amount ?? entity.total_sale_value;
    const commissionAmount = entity.commission_amount ?? entity.shop_commission;
    return {
      shop_id: entity.shop_id,
      farmer_id: entity.farmer_id,
      buyer_id: entity.buyer_id,
      product_id: entity.product_id,
      category_id: entity.category_id,
      product_name: entity.product_name,
      quantity: entity.quantity,
      unit_price: entity.unit_price,
      total_amount: totalAmount,
      commission_rate: entity.commission_rate,
      commission_amount: commissionAmount,
      farmer_earning: entity.farmer_earning,
      status: entity.status,
      transaction_date: entity.transaction_date,
      settlement_date: entity.settlement_date,
      notes: entity.notes,
      metadata: entity.metadata,
      // Always set canonical DB fields
      total_sale_value: totalAmount,
      shop_commission: commissionAmount
    };
  }

  /**
   * Find transactions by farmer
   */
  async findByFarmer(farmerId: number): Promise<TransactionEntity[]> {
    const models = await this.model.findAll({
      where: { farmer_id: farmerId }
    });

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find transactions by buyer
   */
  async findByBuyer(buyerId: number): Promise<TransactionEntity[]> {
    const models = await this.model.findAll({
      where: { buyer_id: buyerId }
    });

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find transactions by shop
   */
  async findByShop(shopId: number): Promise<TransactionEntity[]> {
    const { Op } = await import('sequelize');
    const { User } = await import('../models/user');
    const { Shop } = await import('../models/shop');
    // Patch: Allow shop_id comparison as string or number
    let models: Transaction[];
    try {
      models = await this.model.findAll({
      where: {
        [Op.or]: [
          { shop_id: shopId },
          { shop_id: String(shopId) }
        ]
      },
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: ['id', 'username', 'firstname'],
          required: false
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'username', 'firstname'],
          required: false
        },
        {
          model: Shop,
          as: 'transactionShop',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
      });
    } catch (err: unknown) {
      // Handle SQLite missing column error (e.g., commission_rate missing on older local DB)
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('no such column') && msg.includes('commission_rate')) {
        // Retry with a safe attribute list that excludes commission_rate
        models = await this.model.findAll({
          attributes: ['id','shop_id','farmer_id','buyer_id','category_id','product_name','quantity','unit_price','total_sale_value','shop_commission','farmer_earning','product_id','commission_type','status','transaction_date','settlement_date','notes','created_at','updated_at'],
          where: {
            [Op.or]: [
              { shop_id: shopId },
              { shop_id: String(shopId) }
            ]
          },
          include: [
            {
              model: User,
              as: 'farmer',
              attributes: ['id', 'username', 'firstname'],
              required: false
            },
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'username', 'firstname'],
              required: false
            },
            {
              model: Shop,
              as: 'transactionShop',
              attributes: ['id', 'name'],
              required: false
            }
          ],
          order: [['created_at', 'DESC']]
        });
      } else {
        throw err;
      }
    }

    return models.map((model) => this.toDomainEntity(model));
  }

  /**
   * Find transaction by ID with related payments included
   */
  async findById(id: number): Promise<TransactionEntity | null> {
    const { User } = await import('../models/user');
    const { Shop } = await import('../models/shop');
    const { Payment } = await import('../models/payment');
    const model = await this.model.findByPk(id, {
      include: [
        { model: User, as: 'farmer', attributes: ['id', 'username', 'firstname'], required: false },
        { model: User, as: 'buyer', attributes: ['id', 'username', 'firstname'], required: false },
        { model: Shop, as: 'transactionShop', attributes: ['id','name'], required: false },
        { model: Payment, as: 'payments', attributes: ['id','amount','method','status','payer_type','payee_type','created_at','payment_date','counterparty_id'], required: false }
      ]
    });
    if (!model) return null;
    const entity = this.toDomainEntity(model);
    // Attach payments if loaded
    type PaymentShape = {
      id: number;
      amount: number;
      method: string;
      status: string;
      payer_type?: string;
      payee_type?: string;
      created_at?: Date;
      payment_date?: Date | null;
      counterparty_id?: number | null;
    };
    const mTyped = model as unknown as { payments?: Payment[] };
    const paymentsList: PaymentShape[] = Array.isArray(mTyped.payments) ? mTyped.payments.map((p: Payment) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      payer_type: p.payer_type,
      payee_type: p.payee_type,
      created_at: p.created_at,
      payment_date: p.payment_date
    })) : [];
    // Attach to entity via a safe cast: TransactionEntity has an optional payments property
    (entity as TransactionEntity & { payments?: PaymentShape[] }).payments = paymentsList;
    return entity;
  }

  /**
   * Find transactions by status
   */
}