// Legacy credit-advance API compatibility layer
// Credits are now modelled as expenses of type 'advance'. To keep backward compatibility
// with callers that use the creditAdvanceService API, we map issueCredit -> createExpense
// and provide a minimal repayCredit that records a payment/settlement pathway.

import { createExpense, settleAmount, CreateExpenseInput } from './settlementService';

export class CreditAdvanceService {
  async issueCredit(data: { user_id: number; shop_id?: number; amount: number; description?: string }) {
    // Map to expense creation with type 'advance'
    const payload: CreateExpenseInput = {
      shop_id: data.shop_id || 1,
      user_id: String(data.user_id),
      user_type: 'farmer',
      amount: Number(data.amount),
      type: 'advance',
      description: data.description || 'Credit advance issued'
    };
    const expense = await createExpense(payload);
    return expense;
  }

  async repayCredit(data: { credit_id: number; amount: number }) {
    // Minimal implementation: apply repayment to the underlying expense record.
    // If fully repaid, mark settled.
    // This function expects callers to pass expense id as credit_id.
    const { credit_id, amount } = data;
    // Use settleAmount which handles full/partial settle logic
    const updated = await settleAmount(credit_id, Number(amount));
    return updated;
  }

  async getAllCredits(shopId?: number) {
    // For now, list expenses of type 'advance' via settlementService helpers
    // settlementService.getExpenses exists as getExpenses in the module; import if needed.
    const { getExpenses } = await import('./settlementService');
    if (shopId) return getExpenses({ shop_id: String(shopId) });
    // If no shop provided, return empty to avoid broad queries
    return [];
  }
}

export const creditAdvanceService = new CreditAdvanceService();
export const issueCredit = (data: { user_id: number; shop_id?: number; amount: number; description?: string }) => creditAdvanceService.issueCredit(data);
export const repayCredit = (data: { credit_id: number; amount: number }) => creditAdvanceService.repayCredit(data);


