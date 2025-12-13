
// Mock models/index to avoid Sequelize associations being executed during tests
jest.mock('../src/models', () => ({
  User: { findByPk: jest.fn() }
}), { virtual: false });

jest.mock('../src/services/settlementService', () => ({
  applyRepaymentFIFO: jest.fn().mockResolvedValue({ remaining: 20, settlements: [{ expenseId: 1, settledAmount: 30 }] })
}));

// Prevent Sequelize from initializing a DB connection in tests
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

// Also mock the specific user model file to prevent Sequelize init side-effects
jest.mock('../src/models/user', () => ({
  User: { findByPk: jest.fn(), prototype: { update: jest.fn() } }
}), { virtual: false });

// Lightweight mocks for other model modules to avoid Sequelize initialization
jest.mock('../src/models/payment', () => ({
  Payment: class {},
  PaymentParty: { FARMER: 'FARMER', SHOP: 'SHOP', BUYER: 'BUYER' },
  PaymentMethod: { CASH: 'CASH' },
  PaymentStatus: { Paid: 'PAID' }
}), { virtual: false });

jest.mock('../src/models/transaction', () => ({ Transaction: class {} }), { virtual: false });
jest.mock('../src/models/paymentAllocation', () => ({ PaymentAllocation: class {} }), { virtual: false });
jest.mock('../src/models/auditLog', () => ({ AuditLog: { create: jest.fn() } }), { virtual: false });
jest.mock('../src/models/balanceSnapshot', () => ({ default: { create: jest.fn() } }), { virtual: false });
jest.mock('../src/models/transactionLedger', () => ({ TransactionLedger: { create: jest.fn() } }), { virtual: false });

// Mock TransactionService to avoid importing repository/model-heavy code
jest.mock('../src/services/transactionService', () => ({
  TransactionService: jest.fn().mockImplementation(() => ({
    updateTransactionStatus: jest.fn(),
    updateUserBalances: jest.fn()
  }))
}), { virtual: false });

jest.mock('../src/repositories/TransactionIdempotencyRepository', () => ({
  TransactionIdempotencyRepository: jest.fn().mockImplementation(() => ({
    findByKey: jest.fn(),
    create: jest.fn()
  }))
}), { virtual: false });
jest.mock('../src/models/transactionIdempotency', () => ({ TransactionIdempotency: class {} }), { virtual: false });

// Mock PaymentRepository to avoid DB operations
jest.mock('../src/repositories/PaymentRepository', () => ({
  PaymentRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn()
  }))
}));

const { PaymentService } = require('../src/services/paymentService');
const { User } = require('../src/models');

describe('FARMER -> SHOP payment flow', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('applies FIFO and updates farmer balance correctly', async () => {
    // Setup mocks: FIFO settles 30 to expenses, remaining 20 goes to balance
    // Mock is already set up in jest.mock above

    // Fake user with existing balance 100
    const fakeUser = { id: 20, balance: 100, update: jest.fn().mockResolvedValue(true) };
    (User.findByPk as jest.Mock).mockResolvedValue(fakeUser);

    const { PaymentService: PS } = require('../src/services/paymentService');
    const svc = new PS();
    // Mock payment repository to return a payment object
    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({ id: 555, toJSON: () => ({ id: 555 }), transaction_id: null, amount: 50, payer_type: 'FARMER', payee_type: 'SHOP', counterparty_id: 20, shop_id: 1 });

    const paymentData: any = {
      payer_type: 'FARMER',
      payee_type: 'SHOP',
      amount: 50,
      method: 'cash',
      counterparty_id: 20,
      shop_id: 1,
      payment_date: new Date().toISOString()
    };

  const res = await svc.createPayment(paymentData as any, 1);
  expect(res).toBeDefined();
  // The service should report how much was applied to expenses and to balance
  expect(res.applied_to_expenses).toBe(30);
  expect(res.applied_to_balance).toBe(20);
  });
});
