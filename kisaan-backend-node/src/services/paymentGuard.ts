import { applyRepaymentFIFO } from './settlementService';
import { User } from '../models/user';
import { ValidationError } from '../shared/utils/errors';

export async function willShopToFarmerWorsenDebt(payment: { shop_id?: number; counterparty_id?: number; amount?: number; force_override?: boolean }) {
  // If not shop->farmer shape or missing fields, treat as not-worsening
  if (!payment || !payment.shop_id || !payment.counterparty_id) return { worsen: false, currentBalance: 0, simulatedNewBalance: 0 };
  if (payment.force_override) return { worsen: false, currentBalance: 0, simulatedNewBalance: 0 };

  const paymentAmount = Number(payment.amount || 0);
  // Run a dry-run FIFO to estimate remaining amount applied to balance
  const fifoPreview = await applyRepaymentFIFO(payment.shop_id, payment.counterparty_id, paymentAmount, undefined, { dryRun: true });
  const remainingForBalance = fifoPreview.remaining;

  const farmer = await User.findByPk(payment.counterparty_id);
  const currentBalance = Number(farmer?.balance || 0);
  const simulatedNewBalance = currentBalance - remainingForBalance;

  // If the farmer already has a negative balance (i.e. owes the shop), a SHOP->FARMER
  // payment is very likely the wrong action: the shop should RECEIVE from the farmer
  // in that case. Enforce this explicitly unless force_override is true. This avoids
  // relying on FIFO allocation edge-cases where remainingForBalance may be 0.
  if (currentBalance < 0) {
    return { worsen: true, currentBalance, simulatedNewBalance, remainingForBalance };
  }

  // Otherwise, only block if the simulated new balance would be more negative than
  // the current balance (i.e., this payment increases farmer debt).
  const isWorsen = simulatedNewBalance < currentBalance && simulatedNewBalance < 0;
  return { worsen: isWorsen, currentBalance, simulatedNewBalance, remainingForBalance };
}

export function throwIfWorsens(payment: { shop_id?: number; counterparty_id?: number; amount?: number; force_override?: boolean }) {
  throw new ValidationError('Payment would increase farmer debt. Include force_override=true to proceed if you understand the consequences.', { payment });
}

export default { willShopToFarmerWorsenDebt, throwIfWorsens };
