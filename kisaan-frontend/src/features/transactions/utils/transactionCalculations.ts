// Reusable calculation utilities for transaction amounts

export interface CalculationInput {
  quantity: number;
  unit_price: number;
  commissionRateDecimal: number; // 0.10 for 10%
}

export interface CalculationSummary {
  total_sale_value: number;
  shop_commission: number;
  farmer_earning: number;
}

export function calculateTransactionAmounts(input: CalculationInput): CalculationSummary {
  const total = input.quantity * input.unit_price;
  const commission = total * input.commissionRateDecimal;
  const farmer = total - commission;
  return {
    total_sale_value: total,
    shop_commission: commission,
    farmer_earning: farmer
  };
}

export function roundCurrency(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}
