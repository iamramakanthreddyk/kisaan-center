import { PaymentService } from '../src/services/paymentService';
import { PaymentRepository } from '../src/repositories/PaymentRepository';

jest.mock('../src/repositories/PaymentRepository');

// Mock dependencies used inside PaymentService
jest.mock('../src/services/settlementService', () => ({ applyRepaymentFIFO: jest.fn(() => ({ remaining: 0 })) }));

// We'll mock paymentGuard module dynamically by creating a fake implementation
const mockGuard = {
  willShopToFarmerWorsenDebt: jest.fn()
};

jest.mock('../src/services/paymentGuard', () => mockGuard);

// Minimal CreatePaymentDTO shape
const basePayload: any = {
  payer_type: 'SHOP',
  payee_type: 'FARMER',
  amount: 1000,
  method: 'CASH',
  status: 'PAID',
  counterparty_id: 99,
  shop_id: 1,
  payment_date: new Date().toISOString()
};

describe('PaymentService force_override behavior', () => {
  let svc: PaymentService;
  let repoMock: jest.Mocked<PaymentRepository>;

  beforeEach(() => {
    repoMock = new (PaymentRepository as any)() as jest.Mocked<PaymentRepository>;
    // Ensure create resolves to a mock payment object with expected properties
    repoMock.create.mockImplementation(async (data: any) => ({ id: 123, ...data, toJSON: () => ({ id: 123, ...data }) } as any));

    // Replace PaymentService.paymentRepository with our mock instance
    svc = new PaymentService();
    // @ts-ignore - inject repo mock
    svc['paymentRepository'] = repoMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should reject shop->farmer payment that worsens debt when force_override is false', async () => {
    // guard says this will worsen
    (mockGuard.willShopToFarmerWorsenDebt as jest.Mock).mockResolvedValue({ worsen: true, currentBalance: -500, simulatedNewBalance: -1500 });

    await expect(svc.createPayment(basePayload, 1)).rejects.toThrow(/worsen farmer debt/i);

    // ensure repository.create was not called due to guard
    expect(repoMock.create).not.toHaveBeenCalled();
  });

  test('should allow shop->farmer payment when force_override is true even if it worsens debt', async () => {
    (mockGuard.willShopToFarmerWorsenDebt as jest.Mock).mockResolvedValue({ worsen: true, currentBalance: -500, simulatedNewBalance: -1500 });

    const payload = { ...basePayload, force_override: true };

    const res = await svc.createPayment(payload, 1);
    expect(res).toBeDefined();
    // repository.create should have been called once
    expect(repoMock.create).toHaveBeenCalled();
    expect(res.id).toBeDefined();
  });
});
