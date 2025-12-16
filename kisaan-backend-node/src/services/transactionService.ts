import { USER_ROLES, PAYMENT_STATUS } from '../shared/constants/index';
import { BalanceType } from '../shared/enums';
import { PARTY_TYPE } from '../shared/partyTypes';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { TransactionIdempotencyRepository } from '../repositories/TransactionIdempotencyRepository';
import { PaymentPayerType, PaymentPayeeType, PaymentMethod, PaymentStatus } from '../constants/payment';
import { UserRepository } from '../repositories/UserRepository';
import { ShopRepository } from '../repositories/ShopRepository';
import { TransactionEntity } from '../entities/TransactionEntity';
import { ProductRepository } from '../repositories/ProductRepository';
import { FarmerProductAssignmentRepository } from '../repositories/FarmerProductAssignmentRepository';
import { TransactionLedgerRepository } from '../repositories/TransactionLedgerRepository';
import { UserEntity } from '../entities/UserEntity';
import { Transaction } from '../models/transaction';
import { ValidationError, NotFoundError, BusinessRuleError, AuthorizationError, DatabaseError } from '../shared/utils/errors';
import { Payment, PaymentStatus as PaymentStatusEnum } from '../models/payment';
import { PaymentAllocation } from '../models/paymentAllocation';
import { TransactionStatus } from '../shared/enums';
import { sequelize } from '../models/index';
import { LedgerService } from './ledgerService';
import { logger } from '../shared/logging/logger';
// ...existing code...

export class TransactionService {
  // ...existing code...

  /**
   * Get sum of all buyers' balances (total due from all buyers) for a shop
   */
  async getAllBuyersBalance(shopId: number): Promise<number> {
    const transactions = await this.transactionRepository.findByShop(shopId);
    if (!transactions.length) return 0;
    const txnIds = transactions.map((t) => t.id).filter((id): id is number => id != null && typeof id === 'number');
    // Include allocations so payments that were standalone but allocated to transactions are counted
    const allocations = txnIds.length > 0 ? await PaymentAllocation.findAll({ where: { transaction_id: txnIds } }) : [];
    const paymentIds = allocations.map(a => Number(a.payment_id)).filter(Boolean);
    let payments: Payment[] = [];
    if (paymentIds.length > 0) {
      const { Op } = await import('sequelize');
      payments = await (await import('../models/payment')).Payment.findAll({ where: { id: { [Op.in]: paymentIds } } });
    }
    // Map: buyerId -> sum due
    const buyerDueMap: Record<number, number> = {};
    for (const txn of transactions) {
      const buyerId = txn.buyer_id;
      if (!buyerId) continue;
      // Sum allocated amounts for payments linked to this transaction where the payment is from BUYER->SHOP and PAID
      const allocsForTxn = allocations.filter(a => Number(a.transaction_id) === Number(txn.id));
      const buyerPaid = allocsForTxn.reduce((sum, a) => {
        const pid = Number(a.payment_id);
        const p = payments.find(pay => Number(pay.id) === pid);
        if (p && String(p.payer_type).toUpperCase() === 'BUYER' && String(p.payee_type).toUpperCase() === 'SHOP' && String(p.status).toUpperCase() === 'PAID') {
          return sum + Number(a.allocated_amount || 0);
        }
        return sum;
      }, 0);
      const due = Math.max(Number(txn.total_amount || 0) - buyerPaid, 0);
      if (!buyerDueMap[buyerId]) buyerDueMap[buyerId] = 0;
      buyerDueMap[buyerId] += due;
    }
    // Sum all buyers' due
    let totalDue = Object.values(buyerDueMap).reduce((sum, v) => sum + v, 0);

    try {
      // Subtract bookkeeping (standalone) buyer payments made to this shop that are not already allocated
      const { Op } = await import('sequelize');
      const Payments = await (await import('../models/payment')).Payment;
      const bookkeeping = await Payments.findAll({ where: {
        shop_id: shopId,
        transaction_id: null,
        payer_type: 'BUYER',
        payee_type: 'SHOP',
        status: { [Op.not]: 'FAILED' }
      } });
      // Exclude payments that are already allocated (we only want unallocated bookkeeping payments)
      const allocatedIds = new Set(paymentIds.map(Number));
      const bookkeepingTotal = bookkeeping.reduce((s, p) => {
        if (allocatedIds.has(Number(p.id))) return s;
        return s + Number(p.amount || 0);
      }, 0);
      totalDue = Math.max(0, totalDue - bookkeepingTotal);
    } catch (err) {
      // Non-fatal: if bookkeeping fetch fails, return computed due
    }

    return totalDue;
  }

  /**
   * Get sum of all farmers' balances (total due to all farmers) for a shop
   */
  async getAllFarmersBalance(shopId: number): Promise<number> {
    const transactions = await this.transactionRepository.findByShop(shopId);
    if (!transactions.length) return 0;
    const txnIds = transactions.map((t) => t.id).filter((id): id is number => id != null && typeof id === 'number');
    // Include allocations so standalone payments allocated to transactions count
    const allocations = txnIds.length > 0 ? await PaymentAllocation.findAll({ where: { transaction_id: txnIds } }) : [];
    const paymentIds = allocations.map(a => Number(a.payment_id)).filter(Boolean);
    let payments: Payment[] = [];
    if (paymentIds.length > 0) {
      const { Op } = await import('sequelize');
      payments = await (await import('../models/payment')).Payment.findAll({ where: { id: { [Op.in]: paymentIds } } });
    }
    // Map: farmerId -> sum due
    const farmerDueMap: Record<number, number> = {};
    for (const txn of transactions) {
      const farmerId = txn.farmer_id;
      if (!farmerId) continue;
      // Sum allocated amounts for payments linked to this transaction where the payment is SHOP->FARMER and PAID
      const allocsForTxn = allocations.filter(a => Number(a.transaction_id) === Number(txn.id));
      const farmerPaid = allocsForTxn.reduce((sum, a) => {
        const pid = Number(a.payment_id);
        const p = payments.find(pay => Number(pay.id) === pid);
        if (p && String(p.payer_type).toUpperCase() === 'SHOP' && String(p.payee_type).toUpperCase() === 'FARMER' && String(p.status).toUpperCase() === 'PAID') {
          return sum + Number(a.allocated_amount || 0);
        }
        return sum;
      }, 0);
      const due = Math.max(Number(txn.farmer_earning || 0) - farmerPaid, 0);
      if (!farmerDueMap[farmerId]) farmerDueMap[farmerId] = 0;
      farmerDueMap[farmerId] += due;
    }
    // Sum all farmers' due
    let totalFarmerDue = Object.values(farmerDueMap).reduce((sum, v) => sum + v, 0);
    try {
      const { Op } = await import('sequelize');
      const Payments = await (await import('../models/payment')).Payment;
      const bookkeeping = await Payments.findAll({ where: {
        shop_id: shopId,
        transaction_id: null,
        payer_type: 'SHOP',
        payee_type: 'FARMER',
        status: { [Op.not]: 'FAILED' }
      } });
      const allocatedIds = new Set(paymentIds.map(Number));
      const bookkeepingTotal = bookkeeping.reduce((s, p) => {
        if (allocatedIds.has(Number(p.id))) return s;
        return s + Number(p.amount || 0);
      }, 0);
      totalFarmerDue = Math.max(0, totalFarmerDue - bookkeepingTotal);
    } catch (err) {
      // ignore
    }
    return totalFarmerDue;
  }

  // ...existing code...
  private readonly transactionRepository: TransactionRepository;
  private readonly userRepository: UserRepository;
  private readonly shopRepository: ShopRepository;
  private readonly productRepository: ProductRepository;
  private readonly ledgerRepository: TransactionLedgerRepository;
  private readonly farmerProductRepo: FarmerProductAssignmentRepository;
  private readonly idempotencyRepo: TransactionIdempotencyRepository;
  private readonly ledgerService: LedgerService;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.userRepository = new UserRepository();
  this.shopRepository = new ShopRepository();
  this.productRepository = new ProductRepository();
  this.ledgerRepository = new TransactionLedgerRepository();
  this.farmerProductRepo = new FarmerProductAssignmentRepository();
    this.idempotencyRepo = new TransactionIdempotencyRepository();
    this.ledgerService = new LedgerService();
  }
  private resolveCommissionRate(
    dataRate: number | undefined,
    farmer: { custom_commission_rate?: number | null } | null,
    shop: { commission_rate?: number | null } | null
  ): number {
    // Commission precedence (highest to lowest):
    // 1. Explicit rate passed in payload (dataRate)
    // 2. Farmer custom override (farmer.custom_commission_rate) – user-level rate
    // 3. Shop default commission_rate
    // 4. Fallback constant (10%) if nothing configured (legacy safety)
    console.debug('[transaction:commission:inputs]', {
      provided: dataRate,
      farmerCustom: farmer?.custom_commission_rate,
      shopCommission: shop?.commission_rate
    });
    if (typeof dataRate === 'number' && !isNaN(dataRate)) return dataRate;
    if (farmer?.custom_commission_rate != null) return Number(farmer.custom_commission_rate);
    if (shop?.commission_rate != null) return Number(shop.commission_rate);
    return 10;
  }

  private calculateTransactionAmounts(data: {
    quantity: number;
    unit_price: number;
    commission_rate: number;
    payments?: Array<{
      payer_type: 'BUYER' | 'SHOP';
      payee_type: 'SHOP' | 'FARMER';
      amount: number;
    }>;
  }): { totalAmount: number; commissionAmount: number; farmerEarning: number } {
    // Always calculate based on the full transaction value (quantity × unit_price)
    // Payments are tracked separately and can be partial
    const totalAmount = data.quantity * data.unit_price;
    const commissionAmount = (totalAmount * data.commission_rate) / 100;
    const farmerEarning = totalAmount - commissionAmount;

    console.debug('[transaction:amounts:calculated]', {
      quantity: data.quantity,
      unit_price: data.unit_price,
      commission_rate: data.commission_rate,
      totalAmount,
      commissionAmount,
      farmerEarning
    });

    return { totalAmount, commissionAmount, farmerEarning };
  }

  private async resolveProductIdAndName(input: { product_id?: number | null; product_name?: string; farmer_id: number }) {
    let assignments: import('../repositories/FarmerProductAssignmentRepository').FarmerProductAssignmentEntity[] = [];
    assignments = await this.farmerProductRepo.findByFarmer(input.farmer_id);
    const assignedIds = new Set(assignments.map(a => Number(a.product_id)));
    console.debug('[transaction:resolveProduct] assignments', { farmer: input.farmer_id, assignments, input });
    let resolvedProductId: number | undefined;
    const normalizedName = input.product_name?.trim();

    // 1. Always use provided product_id if present and valid
    if (input.product_id && typeof input.product_id === 'number' && input.product_id > 0) {
      resolvedProductId = Number(input.product_id);
      console.info('[transaction:resolveProduct] Using product_id from payload:', resolvedProductId);
    } else if (normalizedName) {
      // 2. Try to resolve by product_name from assignments
      const lowered = normalizedName.toLowerCase();
      if (assignments.length) {
        const ids = Array.from(assignedIds);
        if (ids.length) {
          const placeholders = ids.map(() => '?').join(',');
          const [rows] = await sequelize.query(`SELECT id, name FROM kisaan_products WHERE id IN (${placeholders})`, { replacements: ids });
          if (Array.isArray(rows)) {
            const match = (rows as Array<{ id: number; name: string }>).find((r) => (r.name || '').toLowerCase() === lowered);
            if (match) {
              resolvedProductId = match.id;
              console.info('[transaction:resolveProduct] Resolved product_id from assignments by name:', resolvedProductId);
            }
          }
        }
      }
      // 3. If still not resolved, fallback to single assignment
      if (!resolvedProductId && assignments.length === 1) {
        resolvedProductId = assignments[0].product_id;
        console.info('[transaction:resolveProduct] Fallback to single assignment product_id:', resolvedProductId);
      }
    } else {
      // 4. If no product_name, fallback to single assignment if available
      if (assignments.length === 1) {
        resolvedProductId = assignments[0].product_id;
        console.info('[transaction:resolveProduct] Fallback to single assignment product_id (no name):', resolvedProductId);
      } else {
        throw new ValidationError('product_id or product_name required');
      }
    }

    // 5. Final fallback: allow provided product_id if no assignments exist
    if (!resolvedProductId) {
      if (!assignments.length && input.product_id && typeof input.product_id === 'number' && input.product_id > 0) {
        resolvedProductId = Number(input.product_id);
        console.warn('[transaction:resolveProduct] No assignments, using provided product_id:', resolvedProductId);
      } else if (!assignments.length) {
        // For development/testing: create a virtual product ID when no assignments exist
        resolvedProductId = 1; // Default fallback product ID
        console.warn('[transaction:resolveProduct] No assignments found, using fallback product ID:', resolvedProductId);
      } else {
        throw new BusinessRuleError('Unable to resolve product within farmer assignments');
      }
    }

    // 6. Logging for robustness
    if (!resolvedProductId) {
      console.error('[transaction:resolveProduct] Failed to resolve product_id');
    }

    // 7. Environment-based strictness: In production, enforce stricter validation
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') {
      if (!resolvedProductId || typeof resolvedProductId !== 'number' || resolvedProductId <= 0) {
        throw new ValidationError('Unable to resolve product_id in production environment');
      }
    } else {
      if (!resolvedProductId || typeof resolvedProductId !== 'number' || resolvedProductId <= 0) {
        console.warn('[transaction:resolveProduct] Development fallback: product_id may be invalid:', resolvedProductId);
      }
    }
    return { productId: resolvedProductId, name: normalizedName || '' };
  }

  /**
   * Create a new transaction
   */
  async createTransaction(data: {
    shop_id: number;
    farmer_id: number;
    buyer_id: number;
  product_id?: number | null; // Provided or resolved from name
  category_id: number;
  product_name: string; // Kept for backward compatibility (normalization WIP)
    quantity: number;
    unit_price: number;
    commission_rate?: number;
    transaction_date?: Date;
    notes?: string;
    payments?: Array<{
      payer_type: 'BUYER' | 'SHOP';
      payee_type: 'SHOP' | 'FARMER';
      amount: number;
      method: string;
      status?: string;
      payment_date?: string;
      notes?: string;
    }>;
  }, requestingUser?: { role: string; id: number }, options?: { tx?: import('sequelize').Transaction, idempotencyKey?: string }): Promise<TransactionEntity> {
    try {
      // Standardize error context
      const errorContext = {
        shop_id: data.shop_id,
        farmer_id: data.farmer_id,
        buyer_id: data.buyer_id,
        category_id: data.category_id,
        product_id: data.product_id,
        product_name: data.product_name,
        quantity: data.quantity,
        unit_price: data.unit_price,
        payments: data.payments,
        requestingUser: requestingUser?.id,
        requestingUserRole: requestingUser?.role
      };
      // Validate required fields
      if (!data.shop_id || !data.farmer_id || !data.buyer_id) {
        console.error('[transaction:error:missing-required]', { code: 'ERR_MISSING_REQUIRED', ...errorContext });
        throw new ValidationError('Shop ID, Farmer ID, and Buyer ID are required');
      }
      if (!data.category_id) {
        console.error('[transaction:error:missing-category]', { code: 'ERR_MISSING_CATEGORY', ...errorContext });
        throw new ValidationError('Category ID is required');
      }
      // product_name may be omitted if farmer has exactly one assigned/default product
      const rawProductName = data.product_name?.trim();
      if (!rawProductName) {
        try {
          const assignmentsQuick = await this.farmerProductRepo.findByFarmer(data.farmer_id);
          if (!assignmentsQuick.length) {
            console.error('[transaction:error:missing-product-name]', { code: 'ERR_MISSING_PRODUCT_NAME', ...errorContext });
            throw new ValidationError('Product name required (no assignments)');
          }
          if (assignmentsQuick.length > 1 && !assignmentsQuick.some(a => a.is_default)) {
            console.error('[transaction:error:ambiguous-products]', { code: 'ERR_AMBIGUOUS_PRODUCTS', ...errorContext });
            throw new ValidationError('Ambiguous products: provide product_name or set a default');
          }
          (data as Record<string, unknown>).product_name = '__AUTO_RESOLVE__';
        } catch (e) {
          if (e instanceof ValidationError) throw e;
          console.error('[transaction:error:product-name-repo-fail]', { code: 'ERR_PRODUCT_NAME_REPO_FAIL', error: e, ...errorContext });
          throw new ValidationError('Product name is required');
        }
      }
      if (!data.quantity || data.quantity <= 0) {
        console.error('[transaction:error:invalid-quantity]', { code: 'ERR_INVALID_QUANTITY', ...errorContext });
        throw new ValidationError('Valid quantity is required');
      }
      if (!data.unit_price || data.unit_price <= 0) {
        console.error('[transaction:error:invalid-unit-price]', { code: 'ERR_INVALID_UNIT_PRICE', ...errorContext });
        throw new ValidationError('Valid unit price is required');
      }

      // Upper bounds to catch accidental gigantic values
      if (data.quantity > 1_000_000) {
        console.error('[transaction:error:quantity-too-large]', { code: 'ERR_QUANTITY_TOO_LARGE', ...errorContext });
        throw new ValidationError('Quantity too large');
      }
      if (data.unit_price > 100_000_000) {
        console.error('[transaction:error:unit-price-too-large]', { code: 'ERR_UNIT_PRICE_TOO_LARGE', ...errorContext });
        throw new ValidationError('Unit price too large');
      }

      // Parallel entity fetch (shop, farmer, buyer, assignments for product resolution)
      const [shop, farmer, buyer, assignments] = await Promise.all([
        this.shopRepository.findById(data.shop_id),
        this.userRepository.findById(data.farmer_id),
        this.userRepository.findById(data.buyer_id),
        this.farmerProductRepo.findByFarmer(data.farmer_id)
      ]);

      if (!shop) {
        console.error('[transaction:error:shop-not-found]', { code: 'ERR_SHOP_NOT_FOUND', ...errorContext });
        throw new NotFoundError('Shop not found');
      }
      if (!farmer || farmer.role !== USER_ROLES.FARMER) {
        console.error('[transaction:error:farmer-not-found]', { code: 'ERR_FARMER_NOT_FOUND', ...errorContext });
        throw new NotFoundError('Farmer not found or invalid role');
      }
      if (!buyer || buyer.role !== USER_ROLES.BUYER) {
        console.error('[transaction:error:buyer-not-found]', { code: 'ERR_BUYER_NOT_FOUND', ...errorContext });
        throw new NotFoundError('Buyer not found or invalid role');
      }

      if (farmer.id === buyer.id) {
        console.error('[transaction:error:same-user]', { code: 'ERR_SAME_USER', ...errorContext });
        throw new BusinessRuleError('Farmer and buyer cannot be the same user');
      }

      // Authorization check - Only owners and farmers can create transactions
      console.log('[AUTHORIZATION] Checking user authorization:', { 
        requestingUser, 
        userRole: requestingUser?.role,
        shopId: data.shop_id,
        shopOwnerId: shop.owner_id 
      });
      
      if (!requestingUser) {
        console.error('[transaction:error:no-requesting-user]', { code: 'ERR_NO_REQUESTING_USER', ...errorContext });
        throw new AuthorizationError('Authentication required to create transactions');
      }

      // Superadmin cannot create transactions - business rule violation
      if (requestingUser.role === USER_ROLES.SUPERADMIN) {
        console.error('[transaction:error:superadmin-blocked]', { code: 'ERR_SUPERADMIN_BLOCKED', ...errorContext });
        throw new AuthorizationError('Superadmin cannot create transactions. Only shop owners and farmers can create transactions.');
      }

      // Buyers cannot create transactions - they are passive participants
      if (requestingUser.role === USER_ROLES.BUYER) {
        console.error('[transaction:error:buyer-blocked]', { code: 'ERR_BUYER_BLOCKED', ...errorContext });
        throw new AuthorizationError('Buyers cannot create transactions. Only shop owners and farmers can create transactions.');
      }
      
      // Owner can only create transactions for their own shop
      if (requestingUser.role === USER_ROLES.OWNER) {
        if (!shop.owner_id) {
          console.error('[transaction:error:shop-no-owner]', { code: 'ERR_SHOP_NO_OWNER', ...errorContext });
          throw new BusinessRuleError('Shop has no owner assigned');
        }
        if (Number(shop.owner_id) !== Number(requestingUser.id)) {
          console.error('[transaction:error:owner-shop-mismatch]', { code: 'ERR_OWNER_SHOP_MISMATCH', ...errorContext });
          throw new AuthorizationError('Cannot create transaction for another owner\'s shop');
        }
      }
      
      // Farmer can only create transactions for their assigned shop
      if (requestingUser.role === USER_ROLES.FARMER) {
        if (!farmer.shop_id) {
          console.error('[transaction:error:farmer-no-shop]', { code: 'ERR_FARMER_NO_SHOP', ...errorContext });
          throw new BusinessRuleError('Farmer is not assigned to any shop');
        }
        if (Number(farmer.shop_id) !== Number(shop.id)) {
          console.error('[transaction:error:farmer-shop-mismatch]', { code: 'ERR_FARMER_SHOP_MISMATCH', ...errorContext });
          throw new AuthorizationError('Cannot create transaction for a shop you do not belong to');
        }
      }
      // Product resolution leveraging existing assignments
      const { productId: resolvedProductId } = await this.resolveProductIdAndName({
        product_id: data.product_id,
        product_name: data.product_name,
        farmer_id: data.farmer_id
      });
        const assignmentCount = assignments?.length || 0;
        console.debug('[transaction:product:resolution]', {
          farmer: data.farmer_id,
          requestedName: data.product_name,
          providedProductId: data.product_id,
          resolvedProductId,
          assignmentCount
        });

      // Canonical product name fetch
      // Preserve explicit user-provided product_name. We only replace when:
      // 1. The placeholder '__AUTO_RESOLVE__' was injected earlier OR
      // 2. No product_name provided at all (empty) and we successfully resolved productId.
      const originalProvidedName = (data.product_name || '').trim();
      let canonicalProductName = originalProvidedName;
        if (resolvedProductId) {
          const [prodRows] = await sequelize.query('SELECT name FROM kisaan_products WHERE id = ? LIMIT 1', { replacements: [resolvedProductId] });
          if (Array.isArray(prodRows) && prodRows[0] && typeof prodRows[0] === 'object' && 'name' in prodRows[0]) {
            const catalogName = String((prodRows[0] as { name: string }).name);
            if (!originalProvidedName || originalProvidedName === '__AUTO_RESOLVE__') {
              canonicalProductName = catalogName;
            } else {
              if (originalProvidedName.toLowerCase() !== catalogName.toLowerCase()) {
                console.debug('[transaction:product:name-preserve]', { provided: originalProvidedName, catalog: catalogName });
              }
            }
          }
        }
      if (canonicalProductName === '__AUTO_RESOLVE__') {
        // Should have been replaced by product catalog lookup; if still placeholder, reject
        throw new ValidationError('Unable to auto-resolve product name');
      }

      // Determine commission rate precedence
      const commissionRate = this.resolveCommissionRate(data.commission_rate, farmer, shop);
      if (commissionRate < 0 || commissionRate > 100) {
        throw new ValidationError('Invalid commission rate');
      }
      const normalizedCommissionRate = Number((commissionRate).toFixed(2));
      
      // Calculate transaction amounts (supports both payment-based and traditional calculation)
      const { totalAmount, commissionAmount, farmerEarning } = this.calculateTransactionAmounts({
        quantity: data.quantity,
        unit_price: data.unit_price,
        commission_rate: commissionRate,
        payments: data.payments
      });

      // CRITICAL: Validate basic calculation consistency
      const expectedTotalFromCalculation = data.quantity * data.unit_price;
      // Only validate against calculated total if no payments are provided (traditional mode)
      // If payments are provided, allow partial payments and pending balances
      if (!data.payments && Math.abs(expectedTotalFromCalculation - totalAmount) > 0.01) {
        console.error('[transaction:error:calculation-mismatch]', { 
          code: 'ERR_CALCULATION_MISMATCH', 
          ...errorContext, 
          quantity: data.quantity,
          unitPrice: data.unit_price,
          expectedTotal: expectedTotalFromCalculation,
          calculatedTotal: totalAmount,
          difference: Math.abs(expectedTotalFromCalculation - totalAmount)
        });
        throw new ValidationError(`Calculation error: ${data.quantity} × ${data.unit_price} = ${expectedTotalFromCalculation}, but calculated total is ${totalAmount}`);
      }
      
      // For payment-based transactions, log the difference as informational
      if (data.payments && Math.abs(expectedTotalFromCalculation - totalAmount) > 0.01) {
        console.info('[transaction:partial-payment]', {
          expectedTotal: expectedTotalFromCalculation,
          paidTotal: totalAmount,
          pendingAmount: expectedTotalFromCalculation - totalAmount,
          message: 'Partial payment detected - pending amount will be added to user balances'
        });
      }

      // Financial invariant check - transaction amounts must balance (based on full value)
      // This validates the transaction record itself, not the payments
      // Payments can be partial and are validated separately
      if (Math.abs((commissionAmount + farmerEarning) - totalAmount) > 0.01) {
        console.error('[transaction:error:financial-invariant]', { 
          code: 'ERR_FINANCIAL_INVARIANT', 
          ...errorContext, 
          totalAmount,
          commissionAmount, 
          farmerEarning,
          sum: commissionAmount + farmerEarning,
          difference: Math.abs((commissionAmount + farmerEarning) - totalAmount)
        });
        throw new BusinessRuleError(`Financial amounts don't balance: Commission (${commissionAmount}) + Farmer Earning (${farmerEarning}) = ${commissionAmount + farmerEarning}, but Total Amount is ${totalAmount}`);
      }
      
      // Validate payment amounts if provided
      if (data.payments && data.payments.length > 0) {
        const buyerToShopPayment = data.payments.find(p => p.payer_type === 'BUYER' && p.payee_type === 'SHOP');
        const shopToFarmerPayment = data.payments.find(p => p.payer_type === 'SHOP' && p.payee_type === 'FARMER');
        
        if (buyerToShopPayment) {
          const buyerPaid = Number(buyerToShopPayment.amount);
          if (buyerPaid > totalAmount) {
            throw new ValidationError(`Buyer payment (${buyerPaid}) cannot exceed total amount (${totalAmount})`);
          }
        }
        
        if (shopToFarmerPayment) {
          const farmerPaid = Number(shopToFarmerPayment.amount);
          if (farmerPaid > farmerEarning) {
            throw new ValidationError(`Farmer payment (${farmerPaid}) cannot exceed farmer earning (${farmerEarning})`);
          }
        }
      }

      // Validate reasonable values
      if (totalAmount <= 0) {
        throw new ValidationError('Total amount must be positive');
      }
      if (farmerEarning < 0) {
        throw new ValidationError('Farmer earning cannot be negative');
      }
      if (commissionAmount < 0) {
        throw new ValidationError('Commission amount cannot be negative');
      }
      if (farmerEarning > totalAmount) {
        throw new ValidationError('Farmer earning cannot exceed total amount');
      }

      // Idempotency early return
      if (options?.idempotencyKey) {
        const existingKey = await this.idempotencyRepo.findByKey(options.idempotencyKey);
        if (existingKey?.transaction_id) {
          const existing = await this.transactionRepository.findById(existingKey.transaction_id);
          if (existing) {
            console.info('[transaction:idempotency:hit]', { code: 'IDEMPOTENCY_HIT', ...errorContext, transaction_id: existingKey.transaction_id });
            return existing;
          }
        }
      }

      // Construct entity (canonical fields only)
      // Set status: COMPLETED if payment is already made, else PENDING
  let txnStatus: TransactionStatus = TransactionStatus.Pending;
      if ('payment_cleared' in data && data.payment_cleared === true) {
    txnStatus = TransactionStatus.Completed;
      }
      // For transactions with payments, store calculated amounts (not payment amounts)
      // so that balance calculations work correctly for pending amounts
      const recordTotalAmount = data.payments ? expectedTotalFromCalculation : totalAmount;
      const recordCommissionAmount = data.payments ?
        (expectedTotalFromCalculation * commissionRate / 100) : commissionAmount;
      const recordFarmerEarning = data.payments ?
        (expectedTotalFromCalculation - recordCommissionAmount) : farmerEarning;

  // Debug: Log the transaction_date being set
  console.log('[transaction:create] transaction_date input:', data.transaction_date, 'parsed:', data.transaction_date ? new Date(data.transaction_date) : new Date());

  const transactionEntity = new TransactionEntity({
  // Debug: Log the transaction_date being set
        shop_id: data.shop_id,
        farmer_id: data.farmer_id,
        buyer_id: data.buyer_id,
        category_id: data.category_id,
        product_name: canonicalProductName,
        product_id: resolvedProductId,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_amount: recordTotalAmount,
        commission_rate: normalizedCommissionRate,
        commission_amount: recordCommissionAmount,
        farmer_earning: recordFarmerEarning,
        status: txnStatus.toLowerCase() as 'pending' | 'completed' | 'partial' | 'cancelled' | 'settled',
  transaction_date: (() => {
    if (typeof data.transaction_date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.transaction_date)) {
        // For YYYY-MM-DD format, preserve the date but use local timezone
        return new Date(data.transaction_date + 'T12:00:00.000');
      } else {
        // For other string formats, parse as-is
        return new Date(data.transaction_date);
      }
    } else if (data.transaction_date instanceof Date) {
      return data.transaction_date;
    } else {
      // Default to current timestamp
      return new Date();
    }
  })(),
        notes: data.notes?.trim() || null
      });

    let createdTransaction: TransactionEntity | undefined;
  const createdPayments: unknown[] = [];
  // Capture previous balances before we mutate anything so we can record payment balance deltas
  const prevFarmerBalance = Number(farmer.balance || 0);
  const prevBuyerBalance = Number(buyer.balance || 0);
      const externalTx = options?.tx;
      const run = async (tx: import('sequelize').Transaction) => {
        if (options?.idempotencyKey) {
          const existing = await this.idempotencyRepo.findByKey(options.idempotencyKey);
          if (!existing) {
            await this.idempotencyRepo.createRecord({
              key: options.idempotencyKey,
              buyer_id: data.buyer_id,
              farmer_id: data.farmer_id,
              shop_id: data.shop_id,
              total_amount: totalAmount,
              transaction_id: null
            }, { tx });
          }
        }
        // Debug: log raw transaction entity values before persistence
          console.debug('[transaction:debug:persist-payload]', {
            shop_id: transactionEntity.shop_id,
            farmer_id: transactionEntity.farmer_id,
            buyer_id: transactionEntity.buyer_id,
            category_id: transactionEntity.category_id,
            product_name: transactionEntity.product_name,
            quantity: transactionEntity.quantity,
            unit_price: transactionEntity.unit_price,
            total_amount: transactionEntity.total_amount,
            commission_amount: transactionEntity.commission_amount,
            farmer_earning: transactionEntity.farmer_earning,
            commission_rate: transactionEntity.commission_rate,
            commission_type: transactionEntity.commission_type,
            product_id: transactionEntity.product_id,
            status: transactionEntity.status,
            transaction_date: transactionEntity.transaction_date
          });
        createdTransaction = await this.transactionRepository.create(transactionEntity, { tx });
        
        // NOTE: updateUserBalances() is called AFTER payments are created to ensure
        // PaymentAllocation records exist before calculating balances
        
        // Ledger entries - ensure numeric conversion to prevent string concatenation
        // Capture balances before any changes so ledger deltas are accurate
        // Use distinct variable names to avoid temporal-dead-zone collisions
        // with variables declared later in the outer scope.
        const farmerBalanceBeforeLedger = Number(farmer.balance || 0);
        const buyerBalanceBeforeLedger = Number(buyer.balance || 0);
        await this.ledgerRepository.create({
          transaction_id: (createdTransaction as { id: number }).id,
          user_id: farmer.id!,
          role: USER_ROLES.FARMER,
          delta_amount: Number(farmer.balance || 0) - farmerBalanceBeforeLedger,
          balance_before: farmerBalanceBeforeLedger,
          balance_after: Number(farmer.balance || 0),
          reason_code: 'TXN_POST'
        }, { tx });
        await this.ledgerRepository.create({
          transaction_id: (createdTransaction as { id: number }).id,
          user_id: buyer.id!,
          role: USER_ROLES.BUYER,
          delta_amount: Number(buyer.balance || 0) - buyerBalanceBeforeLedger,
          balance_before: buyerBalanceBeforeLedger,
          balance_after: Number(buyer.balance || 0),
          reason_code: 'TXN_POST'
        }, { tx });
        if (options?.idempotencyKey) {
          await this.idempotencyRepo.attachTransaction(options.idempotencyKey, (createdTransaction as { id: number }).id, {});
        }
      };

      if (externalTx) {
        await run(externalTx);
      } else if (sequelize?.transaction) {
        await sequelize.transaction(async (t: import('sequelize').Transaction) => {
          await run(t);
        });
      } else {
        console.error('[transaction:error:no-tx-context]', { code: 'ERR_NO_TX_CONTEXT', ...errorContext });
        throw new DatabaseError('No transaction context available for creating transaction');
      }

      if (!createdTransaction) {
        console.error('[transaction:error:no-created-transaction]', { code: 'ERR_NO_CREATED_TRANSACTION', ...errorContext });
        throw new DatabaseError('Transaction creation failed (no result)');
      }

      // Create payments after transaction is committed
      const { PaymentService } = await import('./paymentService');
      const paymentService = new PaymentService();
      
      // Helper function to create payment - DRY
      interface CreatePaymentInput {
        payer_type: PaymentPayerType;
        payee_type: PaymentPayeeType;
        amount: number;
        method: PaymentMethod;
        status?: PaymentStatus;
        notes?: string;
        payment_date?: string | Date;
        counterparty_id?: number;
        shop_id?: number;
      }

      const createPaymentRecord = async (paymentData: CreatePaymentInput) => {
        const payment = await paymentService.createPayment({
          transaction_id: (createdTransaction as { id: number }).id,
          payer_type: paymentData.payer_type,
          payee_type: paymentData.payee_type,
          amount: paymentData.amount,
          method: paymentData.method,
          status: (paymentData.status || 'PAID') as PaymentStatus,
          notes: paymentData.notes || '',
          // Forward optional fields for backdated/direct payments
          payment_date: paymentData.payment_date,
          counterparty_id: paymentData.counterparty_id,
          shop_id: paymentData.shop_id
        }, buyer.id!);
        createdPayments.push(payment);
      };
      
      if (data.payments && data.payments.length > 0) {
        // Create payments from payload - ensure correct flow
        for (const rawPaymentData of data.payments) {
          const pd = rawPaymentData as unknown as Record<string, unknown>;
          const payer_type = (pd.payer_type as string | undefined)?.toUpperCase() as PaymentPayerType | undefined;
          const payee_type = (pd.payee_type as string | undefined)?.toUpperCase() as PaymentPayeeType | undefined;
          const method = (pd.method as string | undefined)?.toUpperCase() as string | undefined;
          const amountVal = pd.amount !== undefined ? Number(pd.amount) : NaN;
          if (!payer_type || !payee_type || !method || isNaN(amountVal)) {
            // Provide context pointing to the offending payment payload for easier debugging on client
            throw new ValidationError('Missing or invalid payment fields: payer_type, payee_type, method or amount', {
              index: createdPayments.length,
              payment: pd
            });
          }
          const notes = (pd.notes as string | undefined) ?? '';
          const payment_date = pd.payment_date as string | Date | undefined;
          const counterparty_id = pd.counterparty_id !== undefined ? Number(pd.counterparty_id) : undefined;
          const shop_id = pd.shop_id !== undefined ? Number(pd.shop_id) : undefined;
          // For payments provided as part of transaction creation, treat them as PAID
          // so they participate in allocation and balance recalculation immediately.
          // This aligns with frontend expectations for transaction payload payments.

          await createPaymentRecord({
            payer_type,
            payee_type,
            amount: amountVal,
            method: method.toUpperCase() as PaymentMethod,
            status: 'PAID',
            notes,
            payment_date,
            counterparty_id,
            shop_id
          });
        }
      } else {
        // Default: full payment flow (Buyer → Shop, Shop → Farmer)
        await createPaymentRecord({
          payer_type: 'BUYER',
          payee_type: 'SHOP',
          amount: recordTotalAmount,
          method: 'CASH',
          status: 'PAID',
          notes: '',
          payment_date: new Date()
        });
        
        await createPaymentRecord({
          payer_type: 'SHOP',
          payee_type: 'FARMER',
          amount: recordFarmerEarning,
          method: 'CASH',
          status: 'PAID',
          notes: '',
          payment_date: new Date()
        });
      }

      console.info('[transaction:create]', {
        id: (createdTransaction as { id: number }).id,
        shop: data.shop_id,
        farmer: data.farmer_id,
        buyer: data.buyer_id,
        recordedTotalAmount: recordTotalAmount,
        paymentTotalAmount: totalAmount,
        recordedCommissionAmount: recordCommissionAmount,
        paymentCommissionAmount: commissionAmount,
        recordedFarmerEarning: recordFarmerEarning,
        paymentFarmerEarning: farmerEarning,
        commissionRate: transactionEntity.commission_rate,
        // Refactored nested ternary to independent statement (S3358)
        commissionSource: (() => {
          if (typeof data.commission_rate === 'number') return 'payload';
          if ((farmer as { custom_commission_rate?: number | null })?.custom_commission_rate != null) return 'farmer_custom';
          if ((shop as { commission_rate?: number | null })?.commission_rate != null) return 'shop_default';
          return 'fallback';
        })(),
        isPartialPayment: !!data.payments,
        idem: options?.idempotencyKey || null
      });
      // Status update is handled by PaymentService.createPayment() calls above

      // NOW update user balances using LEDGER ENTRIES
      // IMPORTANT: Create ledger entries for the TRANSACTION amounts (what farmer earns and buyer owes)
      // NOT just for unpaid deltas. The ledger records the economic event, not just balance changes.
      // Payments are recorded separately - payments reduce what's owed/earned.
      
      console.log('[LEDGER] Creating entries for transaction', {
        transactionId: (createdTransaction as { id: number }).id,
        farmerId: farmer.id,
        buyerId: buyer.id,
        farmerEarning: recordFarmerEarning,
        totalAmount: recordTotalAmount
      });

      try {
        // Farmer earns: CREDIT entry for the full transaction amount
        // ALWAYS create this - it's what the farmer is earning from the transaction
        if (recordFarmerEarning > 0) {
          console.error('[LEDGER] Creating CREDIT entry for farmer', { farmerId: farmer.id, shopId: farmer.shop_id, amount: recordFarmerEarning });
          await this.ledgerService.appendEntry({
            farmer_id: farmer.id!,
            shop_id: farmer.shop_id!,
            amount: recordFarmerEarning,
            type: 'TRANSACTION',
            category: 'TRANSACTION',
            notes: `Transaction #${(createdTransaction as { id: number }).id}: Farmer earns 9${recordFarmerEarning}`,
            created_by: farmer.id!
          });
          console.error('[LEDGER] CREDIT entry created successfully');
        }

        // Buyer owes: DEBIT entry for the full transaction amount
        // ALWAYS create this - it's what the buyer owes for the transaction
        if (recordTotalAmount > 0) {
          console.error('[LEDGER] Creating DEBIT entry for buyer', { buyerId: buyer.id, shopId: buyer.shop_id, amount: recordTotalAmount });
          await this.ledgerService.appendEntry({
            farmer_id: buyer.id!,
            shop_id: buyer.shop_id!,
            amount: recordTotalAmount,
            type: 'TRANSACTION',
            category: 'TRANSACTION',
            notes: `Transaction #${(createdTransaction as { id: number }).id}: Buyer owes 9${recordTotalAmount}`,
            created_by: buyer.id!
          });
          console.error('[LEDGER] DEBIT entry created successfully');
        }
      } catch (ledgerError) {
        console.error('[LEDGER ERROR] CRITICAL: Failed to create ledger entries:', ledgerError);
        console.error('[LEDGER ERROR] Error stack:', (ledgerError as Error).stack);
        throw new DatabaseError(`Failed to record ledger entries: ${(ledgerError as Error).message}`);
      }

      // Refetch transaction to get latest status after payments
      createdTransaction = await this.getTransactionById((createdTransaction as { id: number }).id);

      // IMPORTANT: Fetch fresh payment records from PaymentService after balances are updated
      // so that returned payments include updated balance_before/balance_after and applied_to_* fields.
      if (createdTransaction) {
        try {
          const txnId = (createdTransaction as { id: number }).id;
          const freshPayments = await paymentService.getPaymentsByTransaction(txnId);

          // Compute allocations per payment and persist balance_before/after and applied breakdown
          const PaymentAllocation = (await import('../models/paymentAllocation')).PaymentAllocation;
          const PaymentModel = (await import('../models/payment')).Payment;

          // Get allocations for this transaction grouped by payment_id
          const allocations = await PaymentAllocation.findAll({ where: { transaction_id: txnId } });
          const allocMap: Record<number, number> = {};
          for (const a of allocations) {
            const pid = Number(a.payment_id);
            const amt = Number(a.allocated_amount || 0);
            allocMap[pid] = (allocMap[pid] || 0) + amt;
          }

          // Fetch refreshed user balances to set balance_before/after on payment rows
          const FarmerModel = (await import('../models/user')).User;
          const BuyerModel = FarmerModel; // same model
          const farmerAfter = await FarmerModel.findByPk(Number(createdTransaction.farmer_id));
          const buyerAfter = await BuyerModel.findByPk(Number(createdTransaction.buyer_id));
          const newFarmerBalance = Number(farmerAfter?.balance || 0);
          const newBuyerBalance = Number(buyerAfter?.balance || 0);

          // Persist per-payment fields
          for (const p of freshPayments) {
            try {
              const pid = Number(p.id);
              const modelPayment = await PaymentModel.findByPk(pid);
              if (!modelPayment) continue;

              // Determine applied amounts from allocations (transaction payments primarily allocate to the transaction)
              const totalAllocated = allocMap[pid] || 0;
              const appliedToExpenses = 0;
              const appliedToBalance = totalAllocated;

              // Determine which user balance fields to use
              const pPayee = String(p.payee_type || '').toUpperCase();

              const balanceBefore = pPayee === 'FARMER' ? prevFarmerBalance : (pPayee === 'BUYER' ? prevBuyerBalance : null);
              const balanceAfter = pPayee === 'FARMER' ? newFarmerBalance : (pPayee === 'BUYER' ? newBuyerBalance : null);

              await modelPayment.update({
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                applied_to_expenses: appliedToExpenses,
                applied_to_balance: appliedToBalance
              });
            } catch (err) {
              console.warn('[transaction:create] Could not persist payment breakdown for payment', p, err);
            }
          }

          // Re-fetch payments to include updated fields
          const refreshedPayments = await paymentService.getPaymentsByTransaction(txnId);
          (createdTransaction as unknown as { payments?: unknown[] }).payments = refreshedPayments;
        } catch (err) {
          // Fallback to previously captured createdPayments if fetching fresh payments fails
          console.warn('[transaction:create] Could not fetch fresh payments for response, returning cached payments', { err });
          (createdTransaction as unknown as { payments?: unknown[] }).payments = createdPayments;
        }
      }

      // CRITICAL FIX: Update user balances after transaction and payments are created
      // This ensures balance snapshots are created with correct amount_change values
      try {
        await this.updateUserBalances(
          farmer,
          buyer,
          recordFarmerEarning, // farmerDelta: farmer gains their earning
          recordTotalAmount,   // buyerDelta: buyer owes the total amount
          recordFarmerEarning, // farmerGross: for cumulative_value
          recordTotalAmount,   // buyerGross: for cumulative_value
          'pending',           // transactionStatus
          undefined            // no transaction context needed
        );
        console.log('[BALANCE UPDATE] Successfully updated user balances for transaction creation');
      } catch (balanceError) {
        console.error('[BALANCE UPDATE ERROR] Failed to update user balances:', balanceError);
        // Don't fail the transaction creation for balance update errors
      }

      return createdTransaction;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || 
          error instanceof BusinessRuleError || error instanceof AuthorizationError) {
        throw error;
      }
      console.error('[transaction:create:raw-error]', error);
      throw new DatabaseError('Failed to create transaction', error instanceof Error ? { message: error.message, stack: (error as Error).stack } : undefined);
    }

  }

  /**
   * Quick transaction creation consolidating route logic.
   * Accepts minimal payload and delegates to createTransaction after resolving product.
   */
  async createQuickTransaction(input: {
    shop_id?: number;
    farmer_id: number;
    buyer_id: number;
    product_id?: number | null;
    product_name?: string;
    category_id?: number;
    quantity: number;
    unit_price: number;
  }, requestingUser?: { role: string; id: number }): Promise<TransactionEntity> {
    const shopId = input.shop_id;
    const categoryId = input.category_id || 1;
    if (!shopId) throw new ValidationError('Shop ID required');
    const productName = input.product_name || '';
    return this.createTransaction({
      shop_id: shopId,
      farmer_id: input.farmer_id,
      buyer_id: input.buyer_id,
      category_id: categoryId,
      product_name: productName,
      product_id: input.product_id ?? undefined,
      quantity: input.quantity,
      unit_price: input.unit_price
    }, requestingUser);
  }

  /**
   * Get transactions by buyer
   */
  async getTransactionsByBuyer(buyerId: number, filters?: {
    startDate?: Date;
    endDate?: Date;
  }, requestingUser?: { role: string; id: number }): Promise<TransactionEntity[]> {
    try {
      // Authorization check
  if (requestingUser && requestingUser.role === USER_ROLES.BUYER && requestingUser.id !== buyerId) {
        throw new AuthorizationError('Cannot view another buyer\'s transactions');
      }

      if (filters?.startDate && filters?.endDate) {
        return await this.transactionRepository.findByDateRange(filters.startDate, filters.endDate);
      }

      return await this.transactionRepository.findByBuyer(buyerId);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve buyer transactions', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get transactions by farmer
   */
  async getTransactionsByFarmer(farmerId: number, filters?: {
    startDate?: Date;
    endDate?: Date;
  }, requestingUser?: { role: string; id: number }): Promise<TransactionEntity[]> {
    try {
      // Authorization check
  if (requestingUser && requestingUser.role === USER_ROLES.FARMER && requestingUser.id !== farmerId) {
        throw new AuthorizationError('Cannot view another farmer\'s transactions');
      }

      if (filters?.startDate && filters?.endDate) {
        return await this.transactionRepository.findByDateRange(filters.startDate, filters.endDate);
      }

      return await this.transactionRepository.findByFarmer(farmerId);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve farmer transactions', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get transactions by shop
   */
  async getTransactionsByShop(shopId: number, filters?: {
    startDate?: Date;
    endDate?: Date;
    farmerId?: number;
    buyerId?: number;
  }, requestingUser?: { role: string; id: number }): Promise<TransactionEntity[]> {
    try {
      // Authorization check for shop access
  if (requestingUser && requestingUser.role === USER_ROLES.OWNER) {
        const shop = await this.shopRepository.findById(shopId);
        if (!shop || shop.owner_id !== requestingUser.id) {
          throw new AuthorizationError('Cannot view another owner\'s shop transactions');
        }
      }

      let transactions = await this.transactionRepository.findByShop(shopId);
      // Debug: Log shop_id and transaction_date for each transaction
      console.log('[DEBUG] getTransactionsByShop - Returned shop_ids:', transactions.map(t => ({ shop_id: t.shop_id, type: typeof t.shop_id })));
      console.log('[DEBUG] getTransactionsByShop - Returned transaction_dates:', transactions.map(t => ({ transaction_date: t.transaction_date, type: typeof t.transaction_date })));

      // Apply filters
      if (filters?.farmerId) {
        transactions = transactions.filter(t => t.farmer_id === filters.farmerId);
      }
      if (filters?.buyerId) {
        transactions = transactions.filter(t => t.buyer_id === filters.buyerId);
      }
      if (filters?.startDate && filters?.endDate) {
        transactions = transactions.filter(t => {
          // Patch: Robust date parsing for transaction_date
          let txnDate: Date | string | undefined = t.transaction_date as Date | string | undefined;
          if (typeof txnDate === 'string') {
            // Try to parse string to Date
            let parsed = new Date((txnDate as string).replace(' ', 'T'));
            if (isNaN(parsed.getTime())) {
              parsed = new Date(txnDate);
            }
            txnDate = parsed;
          }
          return txnDate && txnDate >= filters.startDate! && txnDate <= filters.endDate!;
        });
      }

      return transactions;
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      // Log database error details for debugging
      try { logger.error({ err: error }, 'Error in getTransactionsByShop'); } catch (_e) { void _e; }
      throw new DatabaseError('Failed to retrieve shop transactions', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: number, requestingUser?: { role: string; id: number }): Promise<TransactionEntity> {
    try {
      if (!id || id <= 0) {
        throw new ValidationError('Valid transaction ID is required');
      }

      const transaction = await this.transactionRepository.findById(id);
      if (!transaction) {
        throw new NotFoundError('Transaction not found');
      }

      // Authorization check
      if (requestingUser && requestingUser.role === USER_ROLES.FARMER && transaction.farmer_id !== requestingUser.id) {
        throw new AuthorizationError('Cannot view this transaction');
      }
      if (requestingUser && requestingUser.role === USER_ROLES.BUYER && transaction.buyer_id !== requestingUser.id) {
        throw new AuthorizationError('Cannot view this transaction');
      }
      if (requestingUser && requestingUser.role === USER_ROLES.OWNER) {
        const shop = await this.shopRepository.findById(transaction.shop_id!);
        if (!shop || shop.owner_id !== requestingUser.id) {
          throw new AuthorizationError('Cannot view this transaction');
        }
      }

      return transaction;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve transaction', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Update transaction status - Comprehensive logic for ALL transaction states
   * 
   * Transaction States:
   * - PENDING: Transaction created, awaiting payments
   * - PARTIALLY_PAID: Some payments received but not complete
   * - PAID: All payments received but commission not confirmed
   * - COMPLETED: All payments received and commission confirmed
   * - CANCELLED: Transaction cancelled
   * 
   * Payment Validation Rules:
   * 1. Buyer must pay total_amount to shop
   * 2. Shop must pay farmer_earning to farmer
   * 3. Commission = total_amount - farmer_earning must be reasonable
   * 4. All amounts must balance and be consistent
   */
  async updateTransactionStatus(id: number, status?: string, requestingUser?: { role: string; id: number }): Promise<TransactionEntity> {
    try {
      const transaction = await this.getTransactionById(id, requestingUser);

      // Get all payments for this transaction (DB-backed)
      const paymentsFromDb = await (await import('../models/payment')).Payment.findAll({ where: { transaction_id: id } });
      // If DB payments are not present (e.g. newly created transaction returned with embedded payments),
      // fall back to any payments attached on the transaction object.
      type PaymentLike = {
        payer_type?: string | null;
        payee_type?: string | null;
        status?: string | null;
        amount?: number | string | null;
        [key: string]: unknown;
      };
      let payments: PaymentLike[] = Array.isArray(paymentsFromDb) ? (paymentsFromDb as unknown as PaymentLike[]) : [];
      const attachedPayments = (transaction as unknown as { payments?: PaymentLike[] }).payments;
      if ((!payments || payments.length === 0) && Array.isArray(attachedPayments)) {
        payments = attachedPayments;
      }

      // Helpers to normalize values for robust comparisons (handles model instances and plain objects)
      // Use lower-case normalization for party types (they are stored as lower-case strings)
      // Use upper-case normalization for statuses (some status constants are upper-case)
      const normUpper = (v: unknown) => (v == null ? '' : String(v).toUpperCase());

      // Comprehensive transaction validation
      const totalAmount = Number(transaction.total_amount || 0);
      const farmerEarning = Number(transaction.farmer_earning || 0);
      const commissionAmount = Number(transaction.commission_amount || 0);
      const quantity = Number(transaction.quantity || 0);
      const unitPrice = Number(transaction.unit_price || 0);
      
      // CRITICAL: Validate basic calculation (quantity × unit_price = total_amount)
      const expectedTotalFromCalculation = quantity * unitPrice;
      if (Math.abs(expectedTotalFromCalculation - totalAmount) > 0.01) {
        console.error('[TXN STATUS] CRITICAL: Basic calculation error detected', {
          transactionId: id,
          quantity: quantity,
          unitPrice: unitPrice,
          expectedTotal: expectedTotalFromCalculation,
          actualTotal: totalAmount,
          difference: Math.abs(expectedTotalFromCalculation - totalAmount)
        });
        throw new ValidationError(`CRITICAL ERROR: Basic calculation mismatch. ${quantity} × ${unitPrice} = ${expectedTotalFromCalculation}, but total_amount is ${totalAmount}. This transaction has corrupted data.`);
      }
      
      // Financial validation - amounts must balance (commission + farmer_earning = total_amount)
      const expectedCommission = totalAmount - farmerEarning;
      if (Math.abs(expectedCommission - commissionAmount) > 0.01) {
        console.error('[TXN STATUS] Financial inconsistency detected', {
          transactionId: id,
          totalAmount: totalAmount,
          farmerEarning: farmerEarning,
          commissionAmount: commissionAmount,
          expectedCommission: expectedCommission,
          difference: Math.abs(expectedCommission - commissionAmount)
        });
        throw new ValidationError(`Financial inconsistency: Commission should be ${expectedCommission} but is ${commissionAmount}. Total amount breakdown is incorrect.`);
      }

      // Analyze payments
      const buyerPayments = payments.filter(p => p?.payer_type === PARTY_TYPE.BUYER && p?.payee_type === PARTY_TYPE.SHOP);
      const farmerPayments = payments.filter(p => p?.payer_type === PARTY_TYPE.SHOP && p?.payee_type === PARTY_TYPE.FARMER);

      // Calculate actual paid amounts (only PAID status counts)
      const buyerPaidAmount = buyerPayments
        .filter(p => normUpper(p?.status) === String(PAYMENT_STATUS.PAID))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const farmerPaidAmount = farmerPayments
        .filter(p => normUpper(p?.status) === String(PAYMENT_STATUS.PAID))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Calculate pending amounts
      const buyerPendingAmount = buyerPayments
        .filter(p => normUpper(p?.status) === String(PAYMENT_STATUS.PENDING))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const farmerPendingAmount = farmerPayments
        .filter(p => normUpper(p?.status) === String(PAYMENT_STATUS.PENDING))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // Determine payment status with tolerance for floating point precision
      const tolerance = 0.01;
      const isBuyerFullyPaid = Math.abs(totalAmount - buyerPaidAmount) < tolerance;
      const isFarmerFullyPaid = Math.abs(farmerEarning - farmerPaidAmount) < tolerance;
      const isBuyerPartiallyPaid = buyerPaidAmount > tolerance && !isBuyerFullyPaid;
      const isFarmerPartiallyPaid = farmerPaidAmount > tolerance && !isFarmerFullyPaid;

      // Check for overpayments (potential error)
      const buyerOverpaid = buyerPaidAmount > (totalAmount + tolerance);
      const farmerOverpaid = farmerPaidAmount > (farmerEarning + tolerance);

      if (buyerOverpaid || farmerOverpaid) {
        console.warn('[TXN STATUS] Overpayment detected', {
          transactionId: id,
          buyerOverpaid,
          farmerOverpaid,
          buyerPaidAmount,
          farmerPaidAmount,
          expectedBuyer: totalAmount,
          expectedFarmer: farmerEarning
        });
      }

      // Handle metadata and commission confirmation
      const newMetadata = transaction.metadata && typeof transaction.metadata === 'object' ? { ...transaction.metadata } : {};
      let commissionConfirmed = Boolean(newMetadata.commission_confirmed);

      // Auto-confirm commission when both parties are fully paid (unless manually overridden)
      if (isBuyerFullyPaid && isFarmerFullyPaid && !('commission_confirmed' in newMetadata)) {
        commissionConfirmed = true;
        newMetadata.commission_confirmed = true;
      }

      // Determine new transaction status based on comprehensive rules
      // Available statuses: PENDING, COMPLETED, CANCELLED, SETTLED
      let newStatus: TransactionStatus;

      if (status === 'CANCELLED' || status === 'cancelled') {
        // Manual cancellation
        newStatus = TransactionStatus.Cancelled;
      } else if (isBuyerFullyPaid && isFarmerFullyPaid && commissionConfirmed) {
        // Fully completed transaction - all payments made and commission confirmed
        newStatus = TransactionStatus.Completed;
      } else if (isBuyerFullyPaid && isFarmerFullyPaid && !commissionConfirmed) {
        // All payments made but commission not confirmed - use SETTLED
        newStatus = TransactionStatus.Settled;
      } else if (isBuyerPartiallyPaid || isFarmerPartiallyPaid || 
                 (buyerPendingAmount > tolerance) || (farmerPendingAmount > tolerance)) {
        // Some payments made or pending - transaction is still pending completion
        newStatus = TransactionStatus.Pending;
      } else {
        // No significant payments made
        newStatus = TransactionStatus.Pending;
      }

      // Comprehensive logging for audit trail
      console.info('[TXN STATUS] Status calculation complete', {
        transactionId: id,
        oldStatus: transaction.status,
        newStatus,
        financials: {
          totalAmount,
          farmerEarning,
          commissionAmount,
          expectedCommission
        },
        payments: {
          buyerPaidAmount,
          farmerPaidAmount,
          buyerPendingAmount,
          farmerPendingAmount,
          isBuyerFullyPaid,
          isFarmerFullyPaid,
          isBuyerPartiallyPaid,
          isFarmerPartiallyPaid
        },
        commission: {
          confirmed: commissionConfirmed,
          autoConfirmed: isBuyerFullyPaid && isFarmerFullyPaid && !('commission_confirmed' in newMetadata)
        },
        warnings: {
          buyerOverpaid,
          farmerOverpaid
        }
      });

      const updatedEntity = new TransactionEntity({
        ...transaction,
        status: newStatus.toLowerCase() as 'pending' | 'completed' | 'partial' | 'cancelled' | 'settled',
        metadata: newMetadata
      });

      const updatedTransaction = await this.transactionRepository.update(id, updatedEntity);
      if (!updatedTransaction) {
        throw new DatabaseError('Transaction update failed or transaction not found');
      }
      return updatedTransaction;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update transaction status', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get detailed transaction status information including payment breakdown
   */
  async getTransactionStatusDetails(id: number): Promise<{
    transaction: TransactionEntity;
    paymentAnalysis: {
      buyerPayments: {
        total: number;
        paid: number;
        pending: number;
        failed: number;
        isFullyPaid: boolean;
        isPartiallyPaid: boolean;
        isOverpaid: boolean;
      };
      farmerPayments: {
        total: number;
        paid: number;
        pending: number;
        failed: number;
        isFullyPaid: boolean;
        isPartiallyPaid: boolean;
        isOverpaid: boolean;
      };
    };
    financialValidation: {
      isBalanced: boolean;
      expectedCommission: number;
      actualCommission: number;
      discrepancy: number;
    };
    statusRecommendation: TransactionStatus;
    commissionConfirmed: boolean;
  }> {
    const transaction = await this.getTransactionById(id);
    const payments = await (await import('../models/payment')).Payment.findAll({ where: { transaction_id: id } });
    
    const totalAmount = Number(transaction.total_amount || 0);
    const farmerEarning = Number(transaction.farmer_earning || 0);
    const commissionAmount = Number(transaction.commission_amount || 0);
    const expectedCommission = totalAmount - farmerEarning;
    const tolerance = 0.01;

  // Analyze buyer payments (normalize party/status values)
  const buyerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP);
  const buyerPaid = buyerPayments.filter(p => p.status === PaymentStatusEnum.Paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const buyerPending = buyerPayments.filter(p => p.status === PaymentStatusEnum.Pending).reduce((sum, p) => sum + Number(p.amount), 0);
  const buyerFailed = buyerPayments.filter(p => p.status === PaymentStatusEnum.Failed).reduce((sum, p) => sum + Number(p.amount), 0);

  // Analyze farmer payments
  const farmerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER);
  const farmerPaid = farmerPayments.filter(p => p.status === PaymentStatusEnum.Paid).reduce((sum, p) => sum + Number(p.amount), 0);
  const farmerPending = farmerPayments.filter(p => p.status === PaymentStatusEnum.Pending).reduce((sum, p) => sum + Number(p.amount), 0);
  const farmerFailed = farmerPayments.filter(p => p.status === PaymentStatusEnum.Failed).reduce((sum, p) => sum + Number(p.amount), 0);

    // Payment status analysis
    const isBuyerFullyPaid = Math.abs(totalAmount - buyerPaid) < tolerance;
    const isFarmerFullyPaid = Math.abs(farmerEarning - farmerPaid) < tolerance;
    const isBuyerPartiallyPaid = buyerPaid > tolerance && !isBuyerFullyPaid;
    const isFarmerPartiallyPaid = farmerPaid > tolerance && !isFarmerFullyPaid;
    const isBuyerOverpaid = buyerPaid > (totalAmount + tolerance);
    const isFarmerOverpaid = farmerPaid > (farmerEarning + tolerance);

    // Determine status based on payment completion
    const metadata = transaction.metadata && typeof transaction.metadata === 'object' ? transaction.metadata : {};
    const commissionConfirmed = Boolean(metadata.commission_confirmed);
    
    let statusRecommendation: TransactionStatus;
    
    // Simple logic: settled only if both buyer and farmer payments are complete
    if (isBuyerFullyPaid && isFarmerFullyPaid && commissionConfirmed) {
      statusRecommendation = TransactionStatus.Completed;
    } else if (isBuyerFullyPaid && isFarmerFullyPaid) {
      statusRecommendation = TransactionStatus.Settled;
    } else if (isBuyerPartiallyPaid || isFarmerPartiallyPaid) {
      // Partial payments = still pending
      statusRecommendation = TransactionStatus.Pending;
    } else if (buyerPending > tolerance || farmerPending > tolerance) {
      statusRecommendation = TransactionStatus.Pending;
    } else {
      statusRecommendation = TransactionStatus.Pending;
    }

    return {
      transaction,
      paymentAnalysis: {
        buyerPayments: {
          total: buyerPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          paid: buyerPaid,
          pending: buyerPending,
          failed: buyerFailed,
          isFullyPaid: isBuyerFullyPaid,
          isPartiallyPaid: isBuyerPartiallyPaid,
          isOverpaid: isBuyerOverpaid
        },
        farmerPayments: {
          total: farmerPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          paid: farmerPaid,
          pending: farmerPending,
          failed: farmerFailed,
          isFullyPaid: isFarmerFullyPaid,
          isPartiallyPaid: isFarmerPartiallyPaid,
          isOverpaid: isFarmerOverpaid
        }
      },
      financialValidation: {
        isBalanced: Math.abs(expectedCommission - commissionAmount) < tolerance,
        expectedCommission,
        actualCommission: commissionAmount,
        discrepancy: Math.abs(expectedCommission - commissionAmount)
      },
      statusRecommendation,
      commissionConfirmed
    };
  }

  /**
   * Validate and fix transaction financial inconsistencies
   * This method detects and corrects common financial calculation errors
   */
  async validateAndFixTransactionFinancials(id: number, options?: {
    autoFix?: boolean;
    recalculateFromPayments?: boolean;
  }): Promise<{
    wasFixed: boolean;
    issues: string[];
    corrections: Record<string, { old: number; new: number }>;
    transaction: TransactionEntity;
  }> {
    const transaction = await this.getTransactionById(id);
    const payments = await (await import('../models/payment')).Payment.findAll({ where: { transaction_id: id } });
    
    const issues: string[] = [];
    const corrections: Record<string, { old: number; new: number }> = {};
    let wasFixed = false;

    const totalAmount = Number(transaction.total_amount || 0);
    const farmerEarning = Number(transaction.farmer_earning || 0);
    const commissionAmount = Number(transaction.commission_amount || 0);
    const quantity = Number(transaction.quantity || 0);
    const unitPrice = Number(transaction.unit_price || 0);

    // Validate basic calculation: quantity × unit_price should equal total_amount
    const expectedTotal = quantity * unitPrice;
    if (Math.abs(expectedTotal - totalAmount) > 0.01) {
      issues.push(`Total amount mismatch: ${quantity} × ${unitPrice} = ${expectedTotal}, but total_amount is ${totalAmount}`);
      if (options?.autoFix) {
        corrections.total_amount = { old: totalAmount, new: expectedTotal };
      }
    }

    // Validate commission calculation
    const expectedCommission = totalAmount - farmerEarning;
    if (Math.abs(expectedCommission - commissionAmount) > 0.01) {
      issues.push(`Commission calculation error: ${totalAmount} - ${farmerEarning} = ${expectedCommission}, but commission_amount is ${commissionAmount}`);
      if (options?.autoFix) {
        corrections.commission_amount = { old: commissionAmount, new: expectedCommission };
      }
    }

    // Check if payments match transaction amounts
    if (options?.recalculateFromPayments && payments.length > 0) {
      const buyerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP);
      const farmerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER);
      
      const buyerTotalPayment = buyerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const farmerTotalPayment = farmerPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      if (buyerTotalPayment > 0 && Math.abs(buyerTotalPayment - totalAmount) > 0.01) {
        issues.push(`Buyer payment total (${buyerTotalPayment}) doesn't match transaction total (${totalAmount})`);
        if (options?.autoFix) {
          corrections.total_amount = { old: totalAmount, new: buyerTotalPayment };
        }
      }

      if (farmerTotalPayment > 0 && Math.abs(farmerTotalPayment - farmerEarning) > 0.01) {
        issues.push(`Farmer payment total (${farmerTotalPayment}) doesn't match farmer earning (${farmerEarning})`);
        if (options?.autoFix) {
          corrections.farmer_earning = { old: farmerEarning, new: farmerTotalPayment };
        }
      }
    }

    // Apply corrections if autoFix is enabled
    let updatedTransaction = transaction;
    if (options?.autoFix && Object.keys(corrections).length > 0) {
      const updates: Partial<TransactionEntity> = {};
      
      if (corrections.total_amount) {
        updates.total_amount = corrections.total_amount.new;
      }
      if (corrections.farmer_earning) {
        updates.farmer_earning = corrections.farmer_earning.new;
      }
      if (corrections.commission_amount) {
        updates.commission_amount = corrections.commission_amount.new;
      }

      const updatedEntity = new TransactionEntity({ ...transaction, ...updates });
      const result = await this.transactionRepository.update(id, updatedEntity);
      if (result) {
        updatedTransaction = result;
        wasFixed = true;
      }
    }

    return {
      wasFixed,
      issues,
      corrections,
      transaction: updatedTransaction
    };
  }

  /**
   * Confirm commission for a transaction: mark metadata.commission_confirmed = true
   * and re-run status computation.
   */
  async confirmCommission(id: number, _userId?: number): Promise<TransactionEntity> {
    try {
      const txn = await this.getTransactionById(id);
      if (!txn) throw new NotFoundError('Transaction not found');

      const newMetadata = txn.metadata && typeof txn.metadata === 'object' ? { ...txn.metadata } : {};
      newMetadata.commission_confirmed = true;

      // Update transaction record metadata
      const updatedEntity = new TransactionEntity({ ...txn, metadata: newMetadata });
      const persisted = await this.transactionRepository.update(id, updatedEntity);
      if (!persisted) throw new DatabaseError('Failed to persist commission confirmation');

      // Recompute status based on payments + confirmed commission
      return await this.updateTransactionStatus(id);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError('Failed to confirm commission', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Emergency method to fix corrupted transactions with calculation errors
   * Use this method to repair transactions that have basic math errors
   * 
   * WARNING: This method should only be used to fix obvious data corruption
   */
  async fixCorruptedTransaction(id: number, options?: {
    recalculateFromQuantityAndPrice?: boolean;
    recalculateFromPayments?: boolean;
    confirmFix?: boolean;
  }): Promise<{
    wasCorrupted: boolean;
    fixes: string[];
    oldValues: Record<string, number>;
    newValues: Record<string, number>;
    transaction: TransactionEntity;
  }> {
    const transaction = await this.getTransactionById(id);
    const payments = await (await import('../models/payment')).Payment.findAll({ where: { transaction_id: id } });
    
    const fixes: string[] = [];
    const oldValues: Record<string, number> = {};
    const newValues: Record<string, number> = {};
    let wasCorrupted = false;

    const quantity = Number(transaction.quantity || 0);
    const unitPrice = Number(transaction.unit_price || 0);
    const currentTotal = Number(transaction.total_amount || 0);
    const currentFarmerEarning = Number(transaction.farmer_earning || 0);
    const currentCommission = Number(transaction.commission_amount || 0);
    const commissionRate = Number(transaction.commission_rate || 10);

    // Check for basic calculation error (quantity × unit_price ≠ total_amount)
    const expectedTotal = quantity * unitPrice;
    if (Math.abs(expectedTotal - currentTotal) > 0.01) {
      wasCorrupted = true;
      fixes.push(`Fixed basic calculation: ${quantity} × ${unitPrice} = ${expectedTotal} (was ${currentTotal})`);
      oldValues.total_amount = currentTotal;
      newValues.total_amount = expectedTotal;
    }

    // Recalculate commission and farmer earning based on corrected total
    let correctedTotal = newValues.total_amount || currentTotal;
    let correctedFarmerEarning = currentFarmerEarning;
    let correctedCommission = currentCommission;

    if (options?.recalculateFromQuantityAndPrice || wasCorrupted) {
      correctedTotal = expectedTotal;
      correctedCommission = (correctedTotal * commissionRate) / 100;
      correctedFarmerEarning = correctedTotal - correctedCommission;
      
      if (Math.abs(correctedFarmerEarning - currentFarmerEarning) > 0.01) {
        fixes.push(`Recalculated farmer earning: ${correctedFarmerEarning} (was ${currentFarmerEarning})`);
        oldValues.farmer_earning = currentFarmerEarning;
        newValues.farmer_earning = correctedFarmerEarning;
      }
      
      if (Math.abs(correctedCommission - currentCommission) > 0.01) {
        fixes.push(`Recalculated commission: ${correctedCommission} (was ${currentCommission})`);
        oldValues.commission_amount = currentCommission;
        newValues.commission_amount = correctedCommission;
      }
    }

    // Alternative: recalculate from payments if they exist and are more reliable
    if (options?.recalculateFromPayments && payments.length > 0) {
      const buyerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP);
      const farmerPayments = payments.filter(p => p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER);
      
      const totalFromBuyerPayments = buyerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalFromFarmerPayments = farmerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      if (totalFromBuyerPayments > 0 && Math.abs(totalFromBuyerPayments - correctedTotal) > 0.01) {
        fixes.push(`Corrected total from buyer payments: ${totalFromBuyerPayments} (was ${correctedTotal})`);
        oldValues.total_amount = correctedTotal;
        newValues.total_amount = totalFromBuyerPayments;
        correctedTotal = totalFromBuyerPayments;
      }
      
      if (totalFromFarmerPayments > 0 && Math.abs(totalFromFarmerPayments - correctedFarmerEarning) > 0.01) {
        fixes.push(`Corrected farmer earning from payments: ${totalFromFarmerPayments} (was ${correctedFarmerEarning})`);
        oldValues.farmer_earning = correctedFarmerEarning;
        newValues.farmer_earning = totalFromFarmerPayments;
        correctedFarmerEarning = totalFromFarmerPayments;
      }
      
      // Recalculate commission based on the difference
      const recalculatedCommission = correctedTotal - correctedFarmerEarning;
      if (Math.abs(recalculatedCommission - correctedCommission) > 0.01) {
        fixes.push(`Recalculated commission from payments: ${recalculatedCommission} (was ${correctedCommission})`);
        oldValues.commission_amount = correctedCommission;
        newValues.commission_amount = recalculatedCommission;
      }
    }

    // Apply fixes if confirmed
    let updatedTransaction = transaction;
    if (fixes.length > 0 && options?.confirmFix) {
      const updates: Partial<TransactionEntity> = {};
      
      if ('total_amount' in newValues) {
        updates.total_amount = newValues.total_amount;
      }
      if ('farmer_earning' in newValues) {
        updates.farmer_earning = newValues.farmer_earning;
      }
      if ('commission_amount' in newValues) {
        updates.commission_amount = newValues.commission_amount;
      }

      const updatedEntity = new TransactionEntity({ ...transaction, ...updates });
      const result = await this.transactionRepository.update(id, updatedEntity);
      if (result) {
        updatedTransaction = result;
        console.info('[transaction:corruption:fixed]', {
          transactionId: id,
          fixes,
          oldValues,
          newValues
        });
      }
    }

    return {
      wasCorrupted,
      fixes,
      oldValues,
      newValues,
      transaction: updatedTransaction
    };
  }

  /**
   * Get transaction summary for shop
   */
  async getTransactionSummary(shopId: number, startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number;
    totalAmount: number;
    totalCommission: number;
    totalFarmerEarnings: number;
  }> {
    try {
      // Fetch transactions for the shop
      const transactions = await this.transactionRepository.findByShop(shopId);
      let filteredTransactions = transactions;
      if (startDate && endDate) {
        filteredTransactions = transactions.filter(t => 
          t.transaction_date && 
          t.transaction_date >= startDate && 
          t.transaction_date <= endDate
        );
      }

      const summary = filteredTransactions.reduce((acc, transaction) => {
        return {
          totalTransactions: acc.totalTransactions + 1,
          totalAmount: acc.totalAmount + (transaction.total_amount || 0),
          totalCommission: acc.totalCommission + (transaction.commission_amount || 0),
          totalFarmerEarnings: acc.totalFarmerEarnings + (transaction.farmer_earning || 0)
        };
      }, {
        totalTransactions: 0,
        totalAmount: 0,
        totalCommission: 0,
        totalFarmerEarnings: 0
      });

      return summary;
    } catch (error) {
      throw new DatabaseError('Failed to get transaction summary', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Private helper to update user balances
   */
  private async updateUserBalances(
    farmer: UserEntity,
    buyer: UserEntity,
    farmerDelta: number,
    buyerDelta: number,
    farmerGross: number,
    buyerGross: number,
    transactionStatus: string,
    tx?: import('sequelize').Transaction
  ): Promise<void> {
    try {
      // Ensure numeric conversion to prevent string concatenation issues
      const _currentFarmerBalance = Number(farmer.balance || 0);
      const currentBuyerBalance = Number(buyer.balance || 0);
      const currentFarmerCumulative = Number(farmer.cumulative_value || 0);
      const currentBuyerCumulative = Number(buyer.cumulative_value || 0);

      // Fast-path: when explicit deltas are provided (transaction creation path),
      // apply them directly to avoid a full recomputation across all transactions.
      // This prevents double-counting and keeps the balance change atomic with the
      // transaction flow (payments are created separately and allocations recorded).
      const deltaProvided = typeof farmerDelta === 'number' || typeof buyerDelta === 'number';
      if (deltaProvided) {
        console.error(`[DELTA PATH] FarmerID=${farmer.id}, BuyerID=${buyer.id}, farmerDelta=${farmerDelta}, buyerDelta=${buyerDelta}, farmerGross=${farmerGross}, buyerGross=${buyerGross}`);
        
        const newFarmerCumulative = currentFarmerCumulative + Number(farmerGross);
        const newBuyerCumulative = currentBuyerCumulative + Number(buyerGross);
        
        const newFarmerBalance = Math.round(((_currentFarmerBalance) + (Number(farmerDelta) || 0)) * 100) / 100;
        const newBuyerBalance = Math.round((currentBuyerBalance + (Number(buyerDelta) || 0)) * 100) / 100;
        
        console.error(`[DELTA PATH RESULT] Old Farmer=${_currentFarmerBalance} New=${newFarmerBalance}, Old Buyer=${currentBuyerBalance} New=${newBuyerBalance}`);

        // CRITICAL FIX: Use direct Sequelize model update instead of repository
        // to ensure balance updates are persisted correctly
        const { User } = await import('../models/user');
        await User.update(
          { 
            balance: newFarmerBalance,
            cumulative_value: Math.round(newFarmerCumulative * 100) / 100
          },
          { 
            where: { id: farmer.id! },
            transaction: tx
          }
        );
        
        await User.update(
          { 
            balance: newBuyerBalance,
            cumulative_value: Math.round(newBuyerCumulative * 100) / 100
          },
          { 
            where: { id: buyer.id! },
            transaction: tx
          }
        );

        // Always create a snapshot for traceability, even if balance didn't change
        try {
          const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
          await BalanceSnapshot.create({
            user_id: farmer.id!,
            balance_type: BalanceType.Farmer,
            previous_balance: _currentFarmerBalance,
            amount_change: newFarmerBalance - _currentFarmerBalance,
            new_balance: newFarmerBalance,
            transaction_type: 'transaction',
            reference_type: 'transaction',
            description: `Transaction balance update (delta path): farmer earning ${farmerGross}`
          }, tx ? { transaction: tx } : undefined);
        } catch (snapshotError) {
          console.warn(`[BALANCE SNAPSHOT] Failed to create farmer snapshot (delta path):`, snapshotError);
        }

        try {
          const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
          await BalanceSnapshot.create({
            user_id: buyer.id!,
            balance_type: BalanceType.Buyer,
            previous_balance: currentBuyerBalance,
            amount_change: newBuyerBalance - currentBuyerBalance,
            new_balance: newBuyerBalance,
            transaction_type: 'transaction',
            reference_type: 'transaction',
            description: `Transaction balance update (delta path): buyer total ${buyerGross}`
          }, tx ? { transaction: tx } : undefined);
        } catch (snapshotError) {
          console.warn(`[BALANCE SNAPSHOT] Failed to create buyer snapshot (delta path):`, snapshotError);
        }

        // Fast-path applied; return early
        return;
      }

      // Always increment cumulative_value for total earned/spent
      const newFarmerCumulative = currentFarmerCumulative + Number(farmerGross);
      const newBuyerCumulative = currentBuyerCumulative + Number(buyerGross);

      // Calculate new farmer balance: sum of unpaid earnings for all their transactions
      // IMPORTANT: This calculation includes ALL payments (both transaction payments and settlement payments)
      // via PaymentAllocation records. The PaymentService skips balance updates for transaction payments
      // to avoid double-counting.
      const allFarmerTxns = await Transaction.findAll({ where: { farmer_id: farmer.id }, transaction: tx });
      const { Op } = await import('sequelize');
  const txnIds = allFarmerTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');
      const allocations = await (await import('../models/paymentAllocation')).PaymentAllocation.findAll({ where: { transaction_id: { [Op.in]: txnIds } }, transaction: tx });
      // CRITICAL FIX: Get ALL payments to farmer (both transaction-linked AND standalone settlement payments)
      // Previous bug: only got payments with transaction_id, missing standalone payments
      const PaymentModel = (await import('../models/payment')).Payment;
      const payments = await PaymentModel.findAll({
        where: {
          payee_type: PARTY_TYPE.FARMER,
          status: PaymentStatusEnum.Paid
        },
        transaction: tx
      });
      const newFarmerBalance = allFarmerTxns.reduce((sum, t) => {
        const paidToFarmer = allocations
          .filter(a => a.transaction_id === t.id)
          .map(a => {
            const payment = payments.find(p => p.id === a.payment_id);
            if (payment && payment.payee_type === PARTY_TYPE.FARMER && payment.status === PaymentStatusEnum.Paid) {
              console.log(`[BALANCE_CALC] Transaction ${t.id}: Found payment ${payment.id}, allocated ₹${a.allocated_amount}`);
              return Number(a.allocated_amount || 0);
            }
            if (payment) {
              console.log(`[BALANCE_CALC] Transaction ${t.id}: Payment ${payment.id} SKIPPED - payee_type=${payment.payee_type}, status=${payment.status}`);
            }
            return 0;
          })
          .reduce((s, v) => s + v, 0);
        const unpaid = Math.max(Number(t.farmer_earning || 0) - paidToFarmer, 0);
        console.log(`[BALANCE_CALC] Transaction ${t.id}: earning=₹${t.farmer_earning}, paid=₹${paidToFarmer}, unpaid=₹${unpaid}`);
        return sum + unpaid;
      }, 0);      // Round to 2 decimal places to prevent floating point precision issues
      // Subtract UNSETTLED expenses from farmer balance
      // Expenses represent money farmer owes to shop (advances, reimbursements, etc.)
      const ExpenseSettlement = (await import('../models/expenseSettlement')).default;
      const Expense = (await import('../models/expense')).default;
      
      // Get all expenses for this farmer
      const farmerExpenses = await Expense.findAll({
        where: {
          user_id: farmer.id!,
          shop_id: farmer.shop_id!
        }
      });
      
      // For each expense, calculate unsettled amount
      let totalUnsettledExpenses = 0;
      for (const expense of farmerExpenses) {
        const expenseAmount = Number(expense.amount || 0);
        
        // Get sum of settled amounts for this expense
        const settlements = await ExpenseSettlement.findAll({
          where: { expense_id: expense.id }
        });
        const settledAmount = settlements.reduce((sum: number, s) => 
          sum + Number(s.amount || 0), 0);
        
        // Unsettled portion = expense amount - settled amount
        const unsettled = Math.max(0, expenseAmount - settledAmount);
        totalUnsettledExpenses += unsettled;
      }
      
      const adjustedFarmerBalance = newFarmerBalance - totalUnsettledExpenses;      const updatedFarmer = new UserEntity({
        ...farmer,
        balance: Math.round(adjustedFarmerBalance * 100) / 100,
        cumulative_value: Math.round(newFarmerCumulative * 100) / 100
      });
      await this.userRepository.update(farmer.id!, updatedFarmer, tx ? { tx } : undefined);

      // Create balance snapshot for farmer
      const farmerBalanceChange = (updatedFarmer.balance ?? 0) - _currentFarmerBalance;
      if (farmerBalanceChange !== 0 && updatedFarmer.balance !== undefined) {
        try {
          const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
          await BalanceSnapshot.create({
            user_id: farmer.id!,
            balance_type: BalanceType.Farmer,
            previous_balance: _currentFarmerBalance,
            amount_change: farmerBalanceChange,
            new_balance: updatedFarmer.balance,
            transaction_type: 'transaction',
            reference_type: 'transaction',
            description: `Transaction balance update: farmer earning ${farmerGross}, unsettled expenses deducted ${totalUnsettledExpenses}`
          }, tx ? { transaction: tx } : undefined);
        } catch (snapshotError) {
          console.warn(`[BALANCE SNAPSHOT] Failed to create farmer snapshot:`, snapshotError);
        }
      }

      // Calculate new buyer balance: sum of unpaid amounts for all their transactions
      // IMPORTANT: Similar to farmer logic, this accounts for ALL payments via PaymentAllocation
      const allBuyerTxns = await Transaction.findAll({ where: { buyer_id: buyer.id }, transaction: tx });
      const buyerTxnIds = allBuyerTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');
      const buyerAllocations = await (await import('../models/paymentAllocation')).PaymentAllocation.findAll({ 
        where: { transaction_id: { [Op.in]: buyerTxnIds } },
        transaction: tx
      });
      // CRITICAL FIX: Get ALL payments from buyer (both transaction-linked AND standalone settlement payments)
      // Previous bug: only got payments with transaction_id, missing standalone payments
      const PaymentModel2 = (await import('../models/payment')).Payment;
      const buyerPayments = await PaymentModel2.findAll({
        where: {
          payer_type: PARTY_TYPE.BUYER,
          status: PaymentStatusEnum.Paid
        },
        transaction: tx
      });
      
      console.log(`[BUYER BALANCE CALC] Buyer ID ${buyer.id}: Found ${allBuyerTxns.length} transactions, ${buyerAllocations.length} allocations, ${buyerPayments.length} payments`);
      
      let debugSum = 0;
      const newBuyerBalance = allBuyerTxns.reduce((sum, t) => {
        const paidByBuyer = buyerAllocations
          .filter(a => a.transaction_id === t.id)
          .map(a => {
            const payment = buyerPayments.find(p => p.id === a.payment_id);
            // Only count completed payments from buyer to shop
            if (payment && payment.payer_type === PARTY_TYPE.BUYER && payment.status === PaymentStatusEnum.Paid) {
              return Number(a.allocated_amount || 0);
            }
            return 0;
          })
          .reduce((s, v) => s + v, 0);
        const unpaid = Math.max(Number(t.total_amount || 0) - paidByBuyer, 0);
        console.log(`[BUYER BALANCE CALC] TXN ${t.id}: total=₹${t.total_amount}, paid=₹${paidByBuyer}, unpaid=₹${unpaid}`);
        debugSum += unpaid;
        return sum + unpaid;
      }, 0);
      
      console.log(`[BUYER BALANCE CALC] Final buyer balance: ₹${newBuyerBalance} (debug sum: ₹${debugSum})`);

      
      const updatedBuyer = new UserEntity({
        ...buyer,
        balance: Math.round(newBuyerBalance * 100) / 100,
        cumulative_value: Math.round(newBuyerCumulative * 100) / 100
      });
      await this.userRepository.update(buyer.id!, updatedBuyer, tx ? { tx } : undefined);

      // Create balance snapshot for buyer
      const buyerBalanceChange = (updatedBuyer.balance ?? 0) - currentBuyerBalance;
      if (buyerBalanceChange !== 0 && updatedBuyer.balance !== undefined) {
        try {
          const { default: BalanceSnapshot } = await import('../models/balanceSnapshot');
          await BalanceSnapshot.create({
            user_id: buyer.id!,
            balance_type: BalanceType.Buyer,
            previous_balance: currentBuyerBalance,
            amount_change: buyerBalanceChange,
            new_balance: updatedBuyer.balance,
            transaction_type: 'transaction',
            reference_type: 'transaction',
            description: `Transaction balance update: buyer total ${buyerGross}`
          }, tx ? { transaction: tx } : undefined);
        } catch (snapshotError) {
          console.warn(`[BALANCE SNAPSHOT] Failed to create buyer snapshot:`, snapshotError);
        }
      }
    } catch (error) {
      throw new DatabaseError('Failed to update user balances', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async getShopEarnings(shopId: number, period?: { start: Date; end: Date }): Promise<Record<string, unknown>> {
    try {
      console.log('[getShopEarnings] shopId:', shopId);
      if (period) {
        console.log('[getShopEarnings] period:', period);
      }
  const params: Record<string, unknown> = { shopId };
      if (period) {
        params.startDate = period.start;
        params.endDate = period.end;
      }
      console.log('[getShopEarnings] filters:', params);
      const { rows: transactions } = await this.transactionRepository.findByFilters(params);
      console.log('[getShopEarnings] transactions found:', transactions.length);
      const total_sales = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const total_commission = transactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);
      const total_farmer_earnings = transactions.reduce((sum, t) => sum + (t.farmer_earning || 0), 0);
      console.log('[getShopEarnings] totals:', { total_sales, total_commission, total_farmer_earnings });
      return {
        total_transactions: transactions.length,
        total_sales,
        total_commission,
        total_farmer_earnings
      };
    } catch (error) {
      console.error('[getShopEarnings] error:', error);
      throw new DatabaseError('Failed to retrieve shop earnings', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  async getFarmerEarnings(
    farmerId: number,
    shopId?: number,
    period?: { start: Date; end: Date }
  ): Promise<Record<string, unknown>> {
    try {
      // Get farmer user data first
      const farmer = await this.userRepository.findById(farmerId);
      
      const transactions = await this.transactionRepository.findByFarmer(farmerId);
      
      let filteredTransactions = transactions;
      
      if (shopId) {
        filteredTransactions = transactions.filter(t => t.shop_id === shopId);
      }
      
      if (period) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.created_at && t.created_at >= period.start && t.created_at <= period.end
        );
      }

      // Calculate analytics
      const allTimeTransactions = transactions.filter(t => (t.farmer_earning || 0) > 0);
      const periodEarnings = filteredTransactions.reduce((sum, t) => sum + (t.farmer_earning || 0), 0);
      const lifetimeEarnings = allTimeTransactions.reduce((sum, t) => sum + (t.farmer_earning || 0), 0);
      const completedCount = filteredTransactions.filter(t => t.status === 'completed').length;
      const pendingAmount = filteredTransactions
        .filter(t => t.status !== 'completed')
        .reduce((sum, t) => sum + (t.farmer_earning || 0), 0);
      
      return {
        // User info
        farmer_info: {
          id: farmer?.id,
          username: farmer?.username,
          firstname: farmer?.firstname,
          contact: farmer?.contact,
          balance: farmer?.balance || 0,
          cumulative_value: farmer?.cumulative_value || lifetimeEarnings
        },
        // Period analytics
        period_summary: {
          total_transactions: filteredTransactions.length,
          total_value: periodEarnings,
          completed_transactions: completedCount,
          pending_amount: pendingAmount,
          average_transaction_value: filteredTransactions.length > 0 ? periodEarnings / filteredTransactions.length : 0
        },
        // Lifetime analytics
        lifetime_summary: {
          total_transactions: allTimeTransactions.length,
          total_earnings: lifetimeEarnings,
          success_rate: allTimeTransactions.length > 0 ? (allTimeTransactions.filter(t => t.status === 'completed').length / allTimeTransactions.length) * 100 : 0
        },
        // Standard fields for backward compatibility
        total_transactions: filteredTransactions.length,
        total_value: periodEarnings,
        total_commission: 0, // Not relevant for farmers
        pending_count: filteredTransactions.filter(t => t.status === 'pending').length,
        completed_count: completedCount,
        average_transaction_value: filteredTransactions.length > 0 ? periodEarnings / filteredTransactions.length : 0
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve farmer earnings', error instanceof Error ? { message: error.message } : undefined);
    }
  }
  /**
   * Calculate dashboard summary for a shop (or owner dashboard)
   * Returns correct buyer_total_spent, farmer_total_earned, commission_realized, payments_due, etc.
   */
  async getDashboardSummary(shopId: number, date?: Date): Promise<Record<string, unknown>> {
    // Get all transactions for the shop (optionally filter by date)
    const transactions = await this.transactionRepository.findByShop(shopId);
    let filteredTxns = transactions;
    if (date) {
      // Filter by transaction_date (UTC day)
      const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
      const dayEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
      filteredTxns = transactions.filter(t => t.transaction_date && t.transaction_date >= dayStart && t.transaction_date <= dayEnd);
    }

    // Collect all transaction IDs
    const txnIds = filteredTxns.map(t => t.id).filter((id): id is number => typeof id === 'number');
    
    // Get all payments for these transactions
  let payments: Payment[] = [];
    if (txnIds.length > 0) {
      const { Op } = await import('sequelize');
      payments = await (await import('../models/payment')).Payment.findAll({ 
        where: { transaction_id: { [Op.in]: txnIds } } 
      });
    }

    // Calculate buyer_total_spent, farmer_total_earned, commission_realized, payments_due
    let buyer_total_spent = 0;
    let farmer_total_earned = 0;
    let commission_realized = 0;
    let buyer_payments_due = 0;
    let farmer_payments_due = 0;

    // Debug logging
    console.log('[getDashboardSummary] Debug info:', {
      filteredTxns: filteredTxns.length,
      txnIds,
      paymentsFound: payments.length,
      samplePayment: payments[0]
    });

    for (const txn of filteredTxns) {
      // Buyer payments (to shop)
  const buyerPayments = payments.filter(p => Number(p.transaction_id) === Number(txn.id) && p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP);
  const buyerPaid = buyerPayments.filter(p => p.status === PaymentStatusEnum.Paid).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
      // buyer_total_spent should be total transaction amount (what buyer is responsible for)
      buyer_total_spent += Number(txn.total_amount || 0);
      buyer_payments_due += Math.max(Number(txn.total_amount || 0) - buyerPaid, 0);

      // Farmer payments (from shop)
  const farmerPayments = payments.filter(p => Number(p.transaction_id) === Number(txn.id) && p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER);
  const farmerPaid = farmerPayments.filter(p => p.status === PaymentStatusEnum.Paid).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
      // farmer_total_earned should be what they actually received
      farmer_total_earned += farmerPaid;
      farmer_payments_due += Math.max(Number(txn.farmer_earning || 0) - farmerPaid, 0);

      // Commission realized (only if transaction is fully paid by buyer)
      if (buyerPaid >= Number(txn.total_amount || 0)) {
        commission_realized += Number(txn.commission_amount || 0);
      }

      // Debug per transaction
      try {
        console.log(`[getDashboardSummary] Transaction ${txn.id}:`, {
          total_amount: txn.total_amount,
          farmer_earning: txn.farmer_earning,
          buyerPayments: buyerPayments.length,
          buyerPaid,
          farmerPayments: farmerPayments.length,
          farmerPaid
        });
      } catch (e) { /* ignore */ }
    }

    return {
      today_sales: filteredTxns.reduce((sum, t) => sum + (t.total_amount || 0), 0),
      today_transactions: filteredTxns.length,
      today_commission: filteredTxns.reduce((sum, t) => sum + (t.commission_amount || 0), 0),
      buyer_total_spent,
      farmer_total_earned,
      buyer_payments_due,
      farmer_payments_due,
  total_users: (await this.userRepository.findAll()).length,
      commission_realized,
      duration_ms: 0 // You can add timing if needed
    };
  }

  /**
   * Add backdated payments to an existing transaction
   * Only owners can use this functionality
   */
  async addBackdatedPayments(
    transactionId: number,
    payments: Array<{
      payer_type: 'BUYER' | 'SHOP';
      payee_type: 'SHOP' | 'FARMER';
      amount: number;
      method?: string;
      payment_date: string;
      notes?: string;
    }>,
    _userId: number
  ): Promise<{ success: boolean; payments: Payment[]; message: string }> {
    try {
      // Validate transaction exists
      const transaction = await this.getTransactionById(transactionId);
      if (!transaction) {
        throw new NotFoundError('Transaction not found');
      }

      const createdPayments: Payment[] = [];

      await sequelize.transaction(async (tx) => {
        for (const paymentData of payments) {
          // Create payment record  
          const { PaymentParty, PaymentStatus, PaymentMethod } = await import('../models/payment');
          const payment = await Payment.create({
            transaction_id: transactionId,
            payer_type: PaymentParty[paymentData.payer_type as keyof typeof PaymentParty],
            payee_type: PaymentParty[paymentData.payee_type as keyof typeof PaymentParty],
            amount: paymentData.amount,
            method: PaymentMethod[paymentData.method as keyof typeof PaymentMethod] || PaymentMethod.Cash,
            status: PaymentStatus.Paid,
            payment_date: new Date(paymentData.payment_date),
            notes: paymentData.notes
          }, { transaction: tx });

          createdPayments.push(payment);

          // Note: Balance updates and ledger entries are handled by existing payment processing logic
          // This simplified version focuses on creating the backdated payment records
        }
      });

      return {
        success: true,
        payments: createdPayments,
        message: `Successfully added ${createdPayments.length} backdated payment(s)`
      };

    } catch (error) {
      console.error('Error adding backdated payments:', error);
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to add backdated payments');
    }
  }

  /**
   * Create a transaction and optionally create linked expenses and payments atomically
   * - expenses: array of { amount, description, type }
   * - buyerPayment: optional { amount, method }
   * - shopPaysFarmer: optional { amount, method }
   */
  async createTransactionWithPayments(params: {
    transaction: {
      shop_id: number;
      farmer_id: number;
      buyer_id: number;
      product_id?: number | null;
      category_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      commission_rate?: number;
      transaction_date?: Date;
      notes?: string;
      payments?: Array<{
        payer_type: 'BUYER' | 'SHOP';
        payee_type: 'SHOP' | 'FARMER';
        amount: number;
        method: string;
        status?: string;
        payment_date?: string;
        notes?: string;
      }>;
    };
    expenses?: Array<{ amount: number; description?: string; type?: 'expense' | 'advance' }>;
    buyerPayment?: { amount: number; method?: string } | null;
    shopPaysFarmer?: { amount: number; method?: string } | null;
  }, requestingUser?: { role?: string; id?: number }): Promise<TransactionEntity> {
    const txn = await sequelize.transaction();
    const { PaymentService } = await import('./paymentService');
    const paymentService = new PaymentService();
    // Dynamically import createExpense function
    let createExpense: ((data: { shop_id: number; user_id: number; amount: number; type: string; description: string; transaction_id?: number | null }, options?: { tx?: import('sequelize').Transaction }) => Promise<unknown>) | null = null;
    try {
      const mod = await import('./expenseService');
      createExpense = mod.createExpense;
    } catch (e: unknown) {
      // If createExpense is not found, throw a clear error
      throw new Error('createExpense could not be imported: ' + (e instanceof Error ? e.message : String(e)));
    }
    try {
      // 1) create transaction within tx
      const transactionEntity = await this.createTransaction(params.transaction, requestingUser as { role: string; id: number } | undefined, { tx: txn });

      // 2) create expense rows (if any)
      if (Array.isArray(params.expenses) && params.expenses.length) {
        for (const e of params.expenses) {
          await createExpense({
            shop_id: params.transaction.shop_id,
            user_id: params.transaction.farmer_id,
            transaction_id: transactionEntity.id,
            amount: e.amount,
            type: e.type || 'expense',
            description: e.description || ''
          }, { tx: txn });
        }
      }

      // 3) buyer payment (if provided)
      if (params.buyerPayment && params.buyerPayment.amount > 0) {
        await paymentService.createPayment({
          payer_type: 'BUYER',
          payee_type: 'SHOP',
          amount: params.buyerPayment.amount,
          transaction_id: transactionEntity.id,
          counterparty_id: params.transaction.buyer_id,
          shop_id: params.transaction.shop_id,
          method: (params.buyerPayment.method || 'CASH') as PaymentMethod,
          payment_date: new Date()
        }, requestingUser?.id || 0, { tx: txn });
      }

      // 4) shop pays farmer (if provided) — paymentService will apply FIFO on expenses
      if (params.shopPaysFarmer && params.shopPaysFarmer.amount > 0) {
        await paymentService.createPayment({
          payer_type: 'SHOP',
          payee_type: 'FARMER',
          amount: params.shopPaysFarmer.amount,
          counterparty_id: params.transaction.farmer_id,
          shop_id: params.transaction.shop_id,
          method: (params.shopPaysFarmer.method || 'CASH') as PaymentMethod,
          payment_date: new Date()
        }, requestingUser?.id || 0, { tx: txn });
      }

      await txn.commit();
      return transactionEntity;
    } catch (err) {
      await txn.rollback();
      throw err;
    }
  }

  /**
   * Validates that a transaction has complete and consistent payments
   */
  async validateTransactionPaymentCompleteness(transactionId: number): Promise<{
    isComplete: boolean;
    buyerPaid: number;
    farmerPaid: number;
    expectedBuyer: number;
    expectedFarmer: number;
    issues: string[];
  }> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${transactionId} not found`);
    }

    const payments = await Payment.findAll({
      where: { transaction_id: transactionId }
    });

    const buyerPayments = payments.filter(p =>
      p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP
    );
    const farmerPayments = payments.filter(p =>
      p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER
    );

    const buyerPaid = buyerPayments
      .filter(p => p.status === PaymentStatusEnum.Paid)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const farmerPaid = farmerPayments
      .filter(p => p.status === PaymentStatusEnum.Paid)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const expectedBuyer = Number(transaction.total_amount);
    const expectedFarmer = Number(transaction.farmer_earning);

    const issues: string[] = [];

    if (buyerPaid < expectedBuyer) {
      issues.push(`Buyer payment incomplete: ${buyerPaid} paid vs ${expectedBuyer} expected`);
    }

    if (farmerPaid < expectedFarmer) {
      issues.push(`Farmer payment incomplete: ${farmerPaid} paid vs ${expectedFarmer} expected`);
    }

    if (buyerPayments.length === 0) {
      issues.push('No buyer payments found');
    }

    if (farmerPayments.length === 0) {
      issues.push('No farmer payments found');
    }

    return {
      isComplete: issues.length === 0,
      buyerPaid,
      farmerPaid,
      expectedBuyer,
      expectedFarmer,
      issues
    };
  }

  /**
   * Gets payment status summary for a transaction
   */
  async getTransactionPaymentSummary(transactionId: number): Promise<{
    totalPayments: number;
    buyerPayments: number;
    farmerPayments: number;
    pendingPayments: number;
    completedPayments: number;
    failedPayments: number;
  }> {
    const payments = await Payment.findAll({
      where: { transaction_id: transactionId }
    });

    const buyerPayments = payments.filter(p =>
      p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP
    ).length;

    const farmerPayments = payments.filter(p =>
      p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER
    ).length;

    const pendingPayments = payments.filter(p => p.status === PaymentStatusEnum.Pending).length;
    const completedPayments = payments.filter(p => p.status === PaymentStatusEnum.Paid).length;
    const failedPayments = payments.filter(p => p.status === PaymentStatusEnum.Failed).length;

    return {
      totalPayments: payments.length,
      buyerPayments,
      farmerPayments,
      pendingPayments,
      completedPayments,
      failedPayments
    };
  }

  /**
   * Finds transactions with incomplete payments
   */
  async findIncompleteTransactions(limit: number = 50): Promise<Array<{
    transactionId: number;
    issues: string[];
    buyerPaid: number;
    farmerPaid: number;
  }>> {
    const transactions = await this.transactionRepository.findAll({ limit });

    const incomplete: Array<{
      transactionId: number;
      issues: string[];
      buyerPaid: number;
      farmerPaid: number;
    }> = [];

    for (const txn of transactions) {
      if (!txn.id) continue;
      const validation = await this.validateTransactionPaymentCompleteness(txn.id);
      if (!validation.isComplete) {
        incomplete.push({
          transactionId: txn.id,
          issues: validation.issues,
          buyerPaid: validation.buyerPaid,
          farmerPaid: validation.farmerPaid
        });
      }
    }

    return incomplete;
  }
}