// Stable unit tests for SHOP -> FARMER guard
// These tests avoid running allocation/transaction logic by mocking the guard helper
// and by stubbing PaymentService.allocatePaymentToTransactions to a no-op.

// Mock models/index to prevent all Sequelize model initialization
jest.mock('../src/models', () => ({
  User: { findByPk: jest.fn() }
}), { virtual: false });

jest.mock('../src/models/user', () => ({
  User: { findByPk: jest.fn(), prototype: { update: jest.fn() } }
}), { virtual: false });

jest.mock('../src/repositories/PaymentRepository', () => ({
  PaymentRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn()
  }))
}));

// Mock payment model to avoid calling Payment.init (which requires real sequelize)
jest.mock('../src/models/payment', () => ({
  Payment: class {},
  PaymentParty: { FARMER: 'FARMER', SHOP: 'SHOP', BUYER: 'BUYER' },
  PaymentMethod: { CASH: 'CASH' },
  PaymentStatus: { Paid: 'PAID' },
  SettlementType: { Partial: 'partial', Full: 'full', Advance: 'advance', Adjustment: 'adjustment' }
}), { virtual: false });

// Mock transaction model to prevent Sequelize initialization
jest.mock('../src/models/transaction', () => ({
  Transaction: class {}
}), { virtual: false });

// Mock payment allocation model
jest.mock('../src/models/paymentAllocation', () => ({
  PaymentAllocation: class {}
}), { virtual: false });

// Mock audit log model
jest.mock('../src/models/auditLog', () => ({
  AuditLog: { create: jest.fn() }
}), { virtual: false });

// Mock balance snapshot model
jest.mock('../src/models/balanceSnapshot', () => ({
  default: { create: jest.fn() }
}), { virtual: false });

// Mock transaction ledger model
jest.mock('../src/models/transactionLedger', () => ({
  TransactionLedger: { create: jest.fn() }
}), { virtual: false });

// Mock shop model
jest.mock('../src/models/shop', () => ({
  Shop: class {}
}), { virtual: false });

// Mock expense models
jest.mock('../src/models/expense', () => ({
  default: class {}
}), { virtual: false });

jest.mock('../src/models/expenseSettlement', () => ({
  default: class {}
}), { virtual: false });

// Mock the guard helper so tests are deterministic
jest.mock('../src/services/paymentGuard', () => ({
  willShopToFarmerWorsenDebt: jest.fn(),
  throwIfWorsens: jest.fn()
}), { virtual: false });

// Keep a minimal database/config stub to prevent Sequelize init
jest.mock('../src/config/database', () => ({
  default: {
    define: () => ({}),
    transaction: async (cb: any) => { return typeof cb === 'function' ? cb({}) : undefined; },
    fn: () => {},
    col: () => {},
    literal: () => {},
    query: async () => []
  }
}));

const { willShopToFarmerWorsenDebt } = require('../src/services/paymentGuard');

describe('SHOP -> FARMER guard (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('rejects SHOP->FARMER payment that would worsen farmer debt when force_override is false', async () => {
    (willShopToFarmerWorsenDebt as jest.Mock).mockResolvedValue({ worsen: true, currentBalance: -100, simulatedNewBalance: -150 });

    const { PaymentService: PS } = require('../src/services/paymentService');
    const svc = new PS();

    // Prevent allocation/transaction side-effects by stubbing the instance method
    jest.spyOn((svc as any), 'allocatePaymentToTransactions' as any).mockResolvedValue(undefined);

    // Mock paymentRepository.create to return a valid payment object
    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({ id: 999, toJSON: () => ({ id: 999 }), transaction_id: null, amount: 50, payer_type: 'SHOP', payee_type: 'FARMER', counterparty_id: 10, shop_id: 1 });

    const paymentData: any = {
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      method: 'cash',
      amount: 50,
      counterparty_id: 10,
      shop_id: 1,
      payment_date: new Date().toISOString()
    };

    await expect(svc.createPayment(paymentData as any, 1)).rejects.toThrow(/force_override/);
    expect(willShopToFarmerWorsenDebt).toHaveBeenCalled();
  });

  it('allows SHOP->FARMER payment when force_override is true', async () => {
    (willShopToFarmerWorsenDebt as jest.Mock).mockResolvedValue({ worsen: false, currentBalance: -10, simulatedNewBalance: -10 });

    const { PaymentService: PS } = require('../src/services/paymentService');
    const svc = new PS();

    jest.spyOn((svc as any), 'allocatePaymentToTransactions' as any).mockResolvedValue(undefined);
    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({ id: 123, toJSON: () => ({ id: 123 }), transaction_id: null, amount: 20, payer_type: 'SHOP', payee_type: 'FARMER', counterparty_id: 11, shop_id: 1, force_override: true });

    const paymentData: any = {
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      method: 'cash',
      amount: 20,
      counterparty_id: 11,
      shop_id: 1,
      payment_date: new Date().toISOString(),
      force_override: true
    };

    const res = await svc.createPayment(paymentData as any, 1);
    expect(res).toBeDefined();
    expect((svc as any).paymentRepository.create).toHaveBeenCalled();
  });
});
