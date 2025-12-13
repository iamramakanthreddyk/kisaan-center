import { Shop } from '../models/shop';
import { User } from '../models/user';
import { Transaction } from '../models/transaction';
import { PaymentAllocation } from '../models/paymentAllocation';
import { Payment } from '../models/payment';
import { PARTY_TYPE } from '../shared/partyTypes';
import { Op } from 'sequelize';

export class OwnerDashboardService {
  // Returns dashboard stats for the owner (by ownerId)
  async getOwnerDashboardStats(ownerId: string | number) {
    const started = Date.now();
    const logPrefix = `[OwnerDashboardService]`;
    try {
      // 1. Get all shops for this owner
      const shops = await Shop.findAll({ where: { owner_id: ownerId } });
      const shopIds = shops.map((s) => s.id);

      // 2. Get users and transactions for these shops
      const users = shopIds.length ? await User.findAll({ where: { shop_id: { [Op.in]: shopIds } } }) : [];
      const transactions = shopIds.length ? await Transaction.findAll({ where: { shop_id: { [Op.in]: shopIds } } }) : [];

      // 3. Fetch allocations and payments
      const transactionIds = transactions.map(t => t.id).filter(Boolean) as number[];
      const allocations = transactionIds.length ? await PaymentAllocation.findAll({ where: { transaction_id: { [Op.in]: transactionIds } } }) : [];
      const payments = shopIds.length ? await Payment.findAll({ where: { shop_id: { [Op.in]: shopIds } } }) : [];

      console.log(`${logPrefix} shops=${shopIds.length} users=${users.length} transactions=${transactions.length} payments=${payments.length} allocations=${allocations.length}`);

      // Index payments by id
      const paymentsById: Record<string, Payment> = {};
      for (const p of payments) paymentsById[String(p.id)] = p;

      // Compute buyer_total_spent and farmer_total_earned (direct + allocated)
      let buyer_total_spent = 0;
      let farmer_total_earned = 0;
      for (const t of transactions) {
        const txnId = Number(t.id);
        const directPayments = payments.filter(p => Number(p.transaction_id) === txnId);
        const directBuyerPaid = directPayments.filter(p => p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP).reduce((s, p) => s + Number(p.amount || 0), 0);
        const directFarmerPaid = directPayments.filter(p => p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER).reduce((s, p) => s + Number(p.amount || 0), 0);

        const allocsFor = allocations.filter(a => Number(a.transaction_id) === txnId);
        let allocBuyer = 0; let allocFarmer = 0;
        for (const a of allocsFor) {
          const lp = paymentsById[String(a.payment_id)];
          if (!lp) continue;
          const status = String(lp.status).toUpperCase();
          if (!(status === 'PAID' || status === 'PENDING' || status === 'COMPLETED')) continue;
          if (lp.payer_type === PARTY_TYPE.BUYER && lp.payee_type === PARTY_TYPE.SHOP) allocBuyer += Number(a.allocated_amount || 0);
          if (lp.payer_type === PARTY_TYPE.SHOP && lp.payee_type === PARTY_TYPE.FARMER) allocFarmer += Number(a.allocated_amount || 0);
        }

        buyer_total_spent += directBuyerPaid + allocBuyer;
        farmer_total_earned += directFarmerPaid + allocFarmer;
      }

      buyer_total_spent = Number(buyer_total_spent.toFixed(2));
      farmer_total_earned = Number(farmer_total_earned.toFixed(2));

      // Compute buyer and farmer dues using aggregated approach
      const directBuyerByTxn: Record<string, number> = {};
      const allocBuyerByTxn: Record<string, number> = {};
      const directFarmerByTxn: Record<string, number> = {};
      const allocFarmerByTxn: Record<string, number> = {};

      for (const p of payments) {
        const st = String(p.status).toUpperCase();
        if (!(st === 'PAID' || st === 'PENDING' || st === 'COMPLETED')) continue;
        if (p.transaction_id != null) {
          if (p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP) directBuyerByTxn[String(p.transaction_id)] = (directBuyerByTxn[String(p.transaction_id)] || 0) + Number(p.amount || 0);
          if (p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER) directFarmerByTxn[String(p.transaction_id)] = (directFarmerByTxn[String(p.transaction_id)] || 0) + Number(p.amount || 0);
        }
      }
      for (const a of allocations) {
        const lp = paymentsById[String(a.payment_id)];
        if (!lp) continue;
        const st = String(lp.status).toUpperCase();
        if (!(st === 'PAID' || st === 'PENDING' || st === 'COMPLETED')) continue;
        if (lp.payer_type === PARTY_TYPE.BUYER && lp.payee_type === PARTY_TYPE.SHOP) allocBuyerByTxn[String(a.transaction_id)] = (allocBuyerByTxn[String(a.transaction_id)] || 0) + Number(a.allocated_amount || 0);
        if (lp.payer_type === PARTY_TYPE.SHOP && lp.payee_type === PARTY_TYPE.FARMER) allocFarmerByTxn[String(a.transaction_id)] = (allocFarmerByTxn[String(a.transaction_id)] || 0) + Number(a.allocated_amount || 0);
      }

      let buyerTransactionBasedDue = 0;
      let farmerTransactionBasedDue = 0;
      for (const t of transactions) {
        const total = Number((t as Transaction).total_amount || 0);
        const paidByBuyer = (directBuyerByTxn[String(t.id)] || 0) + (allocBuyerByTxn[String(t.id)] || 0);
        buyerTransactionBasedDue += Math.max(total - Math.min(paidByBuyer, total), 0);

        const farmerEarning = Number((t as Transaction).farmer_earning || 0);
        const paidToFarmer = (directFarmerByTxn[String(t.id)] || 0) + (allocFarmerByTxn[String(t.id)] || 0);
        farmerTransactionBasedDue += Math.max(farmerEarning - Math.min(paidToFarmer, farmerEarning), 0);
      }

      const bookkeepingBuyerTotal = payments.filter(p => p.transaction_id == null && p.payer_type === PARTY_TYPE.BUYER && p.payee_type === PARTY_TYPE.SHOP).reduce((s, p) => s + Number(p.amount || 0), 0);
      const bookkeepingFarmerTotal = payments.filter(p => p.transaction_id == null && p.payer_type === PARTY_TYPE.SHOP && p.payee_type === PARTY_TYPE.FARMER).reduce((s, p) => s + Number(p.amount || 0), 0);

      const buyer_payments_due = Number(Math.max(buyerTransactionBasedDue - bookkeepingBuyerTotal, 0).toFixed(2));
      const farmer_payments_due = Number(Math.max(farmerTransactionBasedDue - bookkeepingFarmerTotal, 0).toFixed(2));

      // Compute today's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTransactions = transactions.filter(t => {
        const createdAt = t.created_at ? new Date(t.created_at) : null;
        const transactionDate = t.transaction_date ? new Date(t.transaction_date) : null;
        // Use transaction_date if available, otherwise created_at
        const dateToCheck = transactionDate || createdAt;
        return dateToCheck && dateToCheck >= today && dateToCheck < tomorrow;
      });

      const today_sales = todayTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
      const today_transactions = todayTransactions.length;
      const today_commission = todayTransactions.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);

      // Calculate total commission realized from all transactions
      const commission_realized = transactions.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);

      const result = {
        today_sales,
        today_transactions,
        today_commission,
        buyer_total_spent,
        farmer_total_earned,
        buyer_payments_due,
        farmer_payments_due,
        total_users: users.length,
        commission_realized,
        debug_info: {
          payments_count: payments.length,
          allocations_count: allocations.length,
          allocated_payment_ids_sample: Object.keys(paymentsById).slice(0, 50),
          buyer_due_debug: { transactionBasedDue: Number(buyerTransactionBasedDue.toFixed(2)), bookkeepingPaymentTotal: Number(bookkeepingBuyerTotal.toFixed(2)) },
          farmer_due_debug: { transactionBasedDue: Number(farmerTransactionBasedDue.toFixed(2)), bookkeepingPaymentTotal: Number(bookkeepingFarmerTotal.toFixed(2)) }
        },
        duration_ms: Date.now() - started
      };

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`${logPrefix} Failed to compute dashboard`, { ownerId, error: errorMsg });
      return {
        today_sales: 0,
        today_transactions: 0,
        today_commission: 0,
        buyer_payments_due: 0,
        farmer_payments_due: 0,
        total_users: 0,
        commission_realized: 0,
        error: 'dashboard_unavailable'
      };
    }
  }
}
