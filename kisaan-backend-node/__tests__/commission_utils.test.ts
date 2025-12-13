import { computeCommissionShare } from '../src/utils/commission';

describe('commission utils', () => {
  test('computes proportional commission correctly', () => {
    const share = computeCommissionShare(200, 1000, 50); // 20% of 50 = 10
    expect(share).toBe(10);
  });

  test('returns 0 for invalid inputs', () => {
    expect(computeCommissionShare(0, 1000, 50)).toBe(0);
    expect(computeCommissionShare(100, 0, 50)).toBe(0);
    expect(computeCommissionShare(100, 1000, 0)).toBe(0);
  });
});
