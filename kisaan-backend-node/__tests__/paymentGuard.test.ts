import { willShopToFarmerWorsenDebt } from '../src/services/paymentGuard';

jest.mock('../src/services/settlementService', () => ({
  applyRepaymentFIFO: jest.fn()
}));

jest.mock('../src/models/user', () => ({
  User: { findByPk: jest.fn() }
}), { virtual: false });

import { applyRepaymentFIFO } from '../src/services/settlementService';
const { User } = require('../src/models/user');

describe('paymentGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects worsening when dry-run remaining reduces balance', async () => {
    (applyRepaymentFIFO as jest.Mock).mockResolvedValue({ remaining: 50 });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 1, balance: -100 });

    const result = await willShopToFarmerWorsenDebt({ shop_id: 1, counterparty_id: 1, amount: 50 });
    expect(result.worsen).toBe(true);
    expect(result.currentBalance).toBe(-100);
  });

  it('does not worsen when force_override true', async () => {
    (applyRepaymentFIFO as jest.Mock).mockResolvedValue({ remaining: 50 });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 2, balance: -100 });

    const result = await willShopToFarmerWorsenDebt({ shop_id: 1, counterparty_id: 2, amount: 50, force_override: true });
    expect(result.worsen).toBe(false);
  });
});
