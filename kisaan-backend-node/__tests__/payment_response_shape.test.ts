jest.mock('../src/services/settlementService', () => ({ applyRepaymentFIFO: jest.fn().mockResolvedValue({ remaining: 100, settlements: [] }) }));

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
  PaymentStatus: { Paid: 'PAID' },
  SettlementType: { Partial: 'partial', Adjustment: 'adjustment' }
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

jest.mock('../src/models/user', () => ({ User: { findByPk: jest.fn() } }), { virtual: false });

describe('Payment response shape normalization', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns normalized payment fields (amount string, amount_cents, uppercase enums)', async () => {
    const { PaymentService } = require('../src/services/paymentService');
    const { User } = require('../src/models/user');
    const svc = new PaymentService();

    jest.spyOn((svc as any), 'allocatePaymentToTransactions' as any).mockResolvedValue(undefined);

    const fakeUser = { id: 300, balance: 0, update: jest.fn().mockResolvedValue(true) };
    (User.findByPk as jest.Mock).mockResolvedValue(fakeUser);

    // Ensure repository.create returns a payment-like object
    jest.spyOn((svc as any).paymentRepository, 'create' as any).mockResolvedValue({
      id: '5001',
      toJSON: () => ({ id: '5001', amount: 250.5, payer_type: 'SHOP', payee_type: 'FARMER', method: 'CASH', status: 'PAID', counterparty_id: '300', shop_id: '1', payment_date: new Date().toISOString() })
    });

    const dto: any = { payer_type: 'shop', payee_type: 'farmer', amount: 250.5, method: 'cash', counterparty_id: 300, shop_id: 1, payment_date: new Date().toISOString() };

    const res = await svc.createPayment(dto, 1);
    expect(res).toBeDefined();
    // amount should be string with 2 decimals and amount_cents present
    expect(typeof res.amount).toBe('string');
    expect(res.amount).toBe('250.50');
    expect(res.amount_cents).toBe(25050);
    // ids normalized to numbers when possible
    expect(typeof res.id === 'number' || typeof res.id === 'string').toBeTruthy();
    expect(Number(res.counterparty_id)).toBe(300);
    // enums uppercased
    expect(res.payer_type).toBe('SHOP');
    expect(res.payee_type).toBe('FARMER');
    expect(res.method).toBe('CASH');
    // applied_to fields present
    expect(res.applied_to_expenses).toBeDefined();
    expect(res.applied_to_balance).toBeDefined();
  });
});
