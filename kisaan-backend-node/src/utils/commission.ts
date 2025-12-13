export function computeCommissionShare(allocationAmount: number, txnTotal: number, txnCommission: number): number {
  if (txnTotal <= 0 || txnCommission <= 0 || allocationAmount <= 0) return 0;
  const share = allocationAmount * (txnCommission / txnTotal);
  // Round to 2 decimal places like the service code
  return Math.round(share * 100) / 100;
}

export default computeCommissionShare;
