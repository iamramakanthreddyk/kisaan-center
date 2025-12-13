// Unit tests for payment direction / sign handling
// Mocks mirror patterns used in other tests to avoid DB initialization
jest.mock('../src/services/settlementService', () => ({
  applyRepaymentFIFO: jest.fn().mockImplementation((_shopId: any, _userId: any, amount: any) => Promise.resolve({ remaining: Number(amount), settlements: [] }))
}));

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
jest.mock('../src/models/shop', () => ({ Shop: { create: jest.fn() } }), { virtual: false });

jest.mock('../src/repositories/PaymentRepository', () => ({
  PaymentRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn()
  }))
}));

// Mock the User model file to control balance and updates per test
jest.mock('../src/models/user', () => ({
  User: { findByPk: jest.fn() }
}), { virtual: false });

// We'll require PaymentService and User within tests after jest.resetModules()

describe('Payment direction and balance arithmetic', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('Shop -> Farmer: pays outstanding 500, balance 500 -> 0', async () => {
  const { PaymentService } = require('../src/services/paymentService');
  const { User } = require('../src/models/user');
    const svc = new PaymentService();

    // stub allocation to avoid allocation side-effects
    jest.spyOn((svc as any), 'allocatePaymentToTransactions' as any).mockResolvedValue(undefined);

    // Fake user with balance +500 (shop owes farmer)
    const fakeFarmer = { id: 101, balance: 500, update: jest.fn().mockResolvedValue(true) };
  (User.findByPk as jest.Mock).mockResolvedValue(fakeFarmer);

    // Payment repository will return a payment object representing Shop->Farmer payment of 500
    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({
      id: 9001,
      toJSON: () => ({ id: 9001 }),
      transaction_id: null,
      amount: 500,
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      counterparty_id: 101,
      shop_id: 1
    });

    const paymentDto: any = {
      payer_type: 'SHOP',
      payee_type: 'FARMER',
      amount: 500,
      method: 'CASH',
      counterparty_id: 101,
      shop_id: 1,
      payment_date: new Date()
    };

    const res = await svc.createPayment(paymentDto, 1);
    expect(res).toBeDefined();
    // Verify the farmer's update call sets balance to 0
    expect(fakeFarmer.update).toHaveBeenCalledWith({ balance: 0 });
  });

  it('Farmer -> Shop: farmer repays advance 1000, balance -1000 -> 0', async () => {
  const { PaymentService } = require('../src/services/paymentService');
  const { User } = require('../src/models/user');
    const svc = new PaymentService();
    jest.spyOn((svc as any), 'allocatePaymentToTransactions' as any).mockResolvedValue(undefined);

    // Fake user with negative balance -1000 (farmer owes shop)
    const fakeFarmer = { id: 202, balance: -1000, update: jest.fn().mockResolvedValue(true) };
    (User.findByPk as jest.Mock).mockResolvedValue(fakeFarmer);

    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({
      id: 9002,
      toJSON: () => ({ id: 9002 }),
      transaction_id: null,
      amount: 1000,
      payer_type: 'FARMER',
      payee_type: 'SHOP',
      counterparty_id: 202,
      shop_id: 1
    });

    const paymentDto: any = {
      payer_type: 'FARMER',
      payee_type: 'SHOP',
      amount: 1000,
      method: 'CASH',
      counterparty_id: 202,
      shop_id: 1,
      payment_date: new Date()
    };

    const res = await svc.createPayment(paymentDto, 1);
    expect(res).toBeDefined();
    // Verify the farmer/user update call sets balance to 0
    expect(fakeFarmer.update).toHaveBeenCalledWith({ balance: 0 });
  });
});
