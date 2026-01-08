import sequelize from '../config/database';
import { User } from './user';
import { Shop } from './shop';
import { Plan } from './plan';
import { Category } from './category';
import { Product } from './product';
import { ShopCategory } from './shopCategory';
import { Transaction } from './transaction';
import { Payment } from './payment';
import { ShopProducts } from './shopProducts';
import { Settlement } from './settlement';
import { Commission } from './commission';
import { AuditLog } from './auditLog';
import { PlanUsage } from './planValidation';
import BalanceSnapshot from './balanceSnapshot';
import { PaymentAllocation } from './paymentAllocation';
import { TransactionIdempotency } from './transactionIdempotency';
import { TransactionLedger } from './transactionLedger';
import { Feature, PlanFeature, UserFeatureOverride } from './feature';
import Expense from './expense';
import ExpenseSettlement from './expenseSettlement';
import LedgerEntry from './ledgerEntry';
import UserBalance from './userBalance';
import UserSession from './userSession';


// Initialize all models
const models = {
  User,
  Shop,
  Plan,
  Category,
  Product,
  ShopCategory,
  Transaction,
  ShopProducts,
  Payment,
  Settlement,
  Commission,
  AuditLog,
  PlanUsage,
  BalanceSnapshot,
  PaymentAllocation,
  TransactionIdempotency,
  TransactionLedger,
  Feature,
  PlanFeature,
  UserFeatureOverride,
  Expense,
  ExpenseSettlement,
  LedgerEntry,
  UserBalance,
  UserSession
};

// Plan associations
Plan.hasMany(Shop, { foreignKey: 'plan_id', as: 'shops' });
Shop.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

// Feature associations (logical). Rename alias to avoid collision with Plan.features attribute column
Plan.belongsToMany(Feature, { through: PlanFeature, foreignKey: 'plan_id', otherKey: 'feature_code', as: 'planFeatures' });
Feature.belongsToMany(Plan, { through: PlanFeature, foreignKey: 'feature_code', otherKey: 'plan_id', as: 'plans' });
User.belongsToMany(Feature, { through: UserFeatureOverride, foreignKey: 'user_id', otherKey: 'feature_code', as: 'featureOverrides' });
Feature.belongsToMany(User, { through: UserFeatureOverride, foreignKey: 'feature_code', otherKey: 'user_id', as: 'userOverrides' });

// Category associations
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Shop-Category many-to-many associations
Shop.belongsToMany(Category, { 
  through: ShopCategory, 
  foreignKey: 'shop_id', 
  otherKey: 'category_id',
  as: 'categories' 
});
Category.belongsToMany(Shop, { 
  through: ShopCategory, 
  foreignKey: 'category_id', 
  otherKey: 'shop_id',
  as: 'shops' 
});

// Direct associations for ShopCategory
ShopCategory.belongsTo(Shop, { foreignKey: 'shop_id', as: 'categoryShop' });
ShopCategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Shop.hasMany(ShopCategory, { foreignKey: 'shop_id', as: 'shopCategories' });
Category.hasMany(ShopCategory, { foreignKey: 'category_id', as: 'shopCategories' });

// Shop-Product many-to-many associations
Shop.belongsToMany(Product, {
  through: ShopProducts,
  foreignKey: 'shop_id',
  otherKey: 'product_id',
  as: 'products'
});
Product.belongsToMany(Shop, {
  through: ShopProducts,
  foreignKey: 'product_id',
  otherKey: 'shop_id',
  as: 'shops'
});

// Direct associations for ShopProducts
ShopProducts.belongsTo(Shop, { foreignKey: 'shop_id', as: 'productShop' });
ShopProducts.belongsTo(Product, { foreignKey: 'product_id', as: 'shopProduct' });
Shop.hasMany(ShopProducts, { foreignKey: 'shop_id', as: 'shopProducts' });
Product.hasMany(ShopProducts, { foreignKey: 'product_id', as: 'shopProducts' });

// User associations
User.belongsTo(Shop, { foreignKey: 'shop_id', as: 'userShop' });
Shop.hasMany(User, { foreignKey: 'shop_id', as: 'users' });

// User self-referential creator relationship (audit trail)
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });

// UserSession associations
User.hasMany(UserSession, { foreignKey: 'user_id', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Transaction associations
Transaction.belongsTo(Shop, { foreignKey: 'shop_id', as: 'transactionShop' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Transaction.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });
Transaction.belongsTo(User, { foreignKey: 'farmer_id', as: 'farmer' });

// Reverse associations for Transaction
Shop.hasMany(Transaction, { foreignKey: 'shop_id', as: 'transactions' });
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
User.hasMany(Transaction, { foreignKey: 'buyer_id', as: 'buyerTransactions' });
User.hasMany(Transaction, { foreignKey: 'farmer_id', as: 'farmerTransactions' });

// Payment associations
Payment.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Transaction.hasMany(Payment, { foreignKey: 'transaction_id', as: 'payments' });

// PaymentAllocation (junction allocation of payments to transactions)
PaymentAllocation.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
PaymentAllocation.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transactionAllocation' });
Payment.hasMany(PaymentAllocation, { foreignKey: 'payment_id', as: 'allocations' });
Transaction.hasMany(PaymentAllocation, { foreignKey: 'transaction_id', as: 'paymentAllocations' });

// Credit Advance associations
// ...existing code...

// Settlement associations
Settlement.belongsTo(Shop, { foreignKey: 'shop_id', as: 'settlementShop' });
Settlement.belongsTo(User, { foreignKey: 'user_id', as: 'settlementUser' });
Settlement.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Shop.hasMany(Settlement, { foreignKey: 'shop_id', as: 'settlements' });
User.hasMany(Settlement, { foreignKey: 'user_id', as: 'settlements' });
Transaction.hasMany(Settlement, { foreignKey: 'transaction_id', as: 'settlements' });

// Commission associations
Commission.belongsTo(Shop, { foreignKey: 'shop_id', as: 'commissionShop' });
Shop.hasMany(Commission, { foreignKey: 'shop_id', as: 'commissions' });

// AuditLog associations
AuditLog.belongsTo(Shop, { foreignKey: 'shop_id', as: 'auditShop' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'auditUser' });
Shop.hasMany(AuditLog, { foreignKey: 'shop_id', as: 'auditLogs' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// PlanUsage associations
PlanUsage.belongsTo(Shop, { foreignKey: 'shop_id', as: 'usageShop' });
PlanUsage.belongsTo(Plan, { foreignKey: 'plan_id', as: 'usagePlan' });
Shop.hasMany(PlanUsage, { foreignKey: 'shop_id', as: 'planUsage' });
Plan.hasMany(PlanUsage, { foreignKey: 'plan_id', as: 'planUsage' });

// Ownership association for Shop.owner_id
Shop.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Shop, { foreignKey: 'owner_id', as: 'ownedShops' });

// TransactionIdempotency associations (for observability / lookups)
TransactionIdempotency.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Transaction.hasMany(TransactionIdempotency, { foreignKey: 'transaction_id', as: 'idempotencyRecords' });
TransactionIdempotency.belongsTo(Shop, { foreignKey: 'shop_id', as: 'idempotencyShop' });
Shop.hasMany(TransactionIdempotency, { foreignKey: 'shop_id', as: 'idempotencyKeys' });
TransactionIdempotency.belongsTo(User, { foreignKey: 'buyer_id', as: 'idempotencyBuyer' });
TransactionIdempotency.belongsTo(User, { foreignKey: 'farmer_id', as: 'idempotencyFarmer' });

// TransactionLedger associations
TransactionLedger.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Transaction.hasMany(TransactionLedger, { foreignKey: 'transaction_id', as: 'ledgerEntries' });
TransactionLedger.belongsTo(User, { foreignKey: 'user_id', as: 'ledgerUser' });
User.hasMany(TransactionLedger, { foreignKey: 'user_id', as: 'ledgerEntries' });

// BalanceSnapshot associations
BalanceSnapshot.belongsTo(User, { foreignKey: 'user_id', as: 'snapshotUser' });
User.hasMany(BalanceSnapshot, { foreignKey: 'user_id', as: 'balanceSnapshots' });

// ExpenseSettlement associations
ExpenseSettlement.belongsTo(Expense, { foreignKey: 'expense_id', as: 'expense' });
ExpenseSettlement.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
Expense.hasMany(ExpenseSettlement, { foreignKey: 'expense_id', as: 'settlements' });
Payment.hasMany(ExpenseSettlement, { foreignKey: 'payment_id', as: 'expenseSettlements' });

// Export sequelize instance and all models
export { 
  sequelize, 
  User, 
  Shop, 
  Plan, 
  Category, 
  Product, 
  ShopCategory, 
  Transaction, 
  Payment,
  ShopProducts, 
  Settlement, 
  Commission,
  AuditLog,
  PlanUsage,
  BalanceSnapshot,
  PaymentAllocation,
  TransactionIdempotency,
  LedgerEntry,
  UserBalance,
  UserSession
};

export default models;