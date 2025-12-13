import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { PaymentAllocation } from '../models/paymentAllocation';
import { Transaction } from '../models/transaction';
import { Payment } from '../models/payment';
import { Shop } from '../models/shop';
import { Op } from 'sequelize';

const router = express.Router();

// Dev-only: get buyer due breakdown
router.get('/buyer-due/:buyerId', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const buyerId = Number(req.params.buyerId);
    const ownerId = req.query.owner_id ? Number(req.query.owner_id) : undefined;
    if (!buyerId) return res.status(400).json({ error: 'buyerId required' });

    // transaction-based due
    const txns = await Transaction.findAll({ where: { buyer_id: buyerId } });
    const txnIds = txns.map(t => t.id).filter(Boolean) as number[];

    // sum allocations for these txns where allocation originates from buyer payments
    const allocs = txnIds.length ? await PaymentAllocation.findAll({ where: { transaction_id: { [Op.in]: txnIds } } }) : [];
    const payments = txnIds.length ? await Payment.findAll({ where: { transaction_id: { [Op.in]: txnIds } } }) : [];

    let transactionBasedDue = 0;
    for (const t of txns) {
      const total = Number(t.total_amount || 0);
      const buyerPaid = allocs.filter(a => Number(a.transaction_id) === Number(t.id))
        .map(a => {
          const p = payments.find(pp => pp.id === a.payment_id);
          if (p && String(p.payer_type).toUpperCase() === 'BUYER' && String(p.status).toUpperCase() === 'PAID') return Number(a.allocated_amount || 0);
          return 0;
        }).reduce((s, v) => s + v, 0);
      transactionBasedDue += Math.max(total - buyerPaid, 0);
    }

    // bookkeeping payments (standalone buyer->shop) not allocated
    const bkPayments = await Payment.findAll({ where: { transaction_id: null, payer_type: 'BUYER', payee_type: 'SHOP', counterparty_id: buyerId, status: 'PAID' } });
    const bookkeepingPaymentTotal = bkPayments.reduce((s: number, p: Payment) => s + Number(p.amount || 0), 0);

    // If ownerId provided, compute owner-scoped bookkeeping totals (payments made to shops owned by owner)
    let ownerScope: { transactionBasedDue?: number; bookkeepingPaymentTotal?: number; txns?: number; bkCount?: number } | undefined = undefined;
    if (ownerId) {
      // fetch shops for owner
      const shops = await Shop.findAll({ where: { owner_id: ownerId } });
      const shopIds = shops.map((s: Shop) => s.id);
      // transactions for this buyer filtered by owner's shops
      const ownerTxns = await Transaction.findAll({ where: { buyer_id: buyerId, shop_id: shopIds } });
      const ownerTxnIds = ownerTxns.map(t => t.id).filter(Boolean) as number[];
      const ownerAlloc = ownerTxnIds.length ? await (await import('../models/paymentAllocation')).PaymentAllocation.findAll({ where: { transaction_id: { [Op.in]: ownerTxnIds } } }) : [];
      const ownerPayments = shopIds.length ? await (await import('../models/payment')).Payment.findAll({ where: { shop_id: { [Op.in]: shopIds } } }) : [];

      // compute transaction-based due for owner scope
      let ownerTransactionBasedDue = 0;
      for (const t of ownerTxns) {
        const total = Number(t.total_amount || 0);
        const allocsFor = ownerAlloc.filter(a => Number(a.transaction_id) === Number(t.id));
        const buyerPaid = allocsFor.reduce((s, a) => {
          const p = ownerPayments.find(pp => Number(pp.id) === Number(a.payment_id));
          if (p && String(p.payer_type).toUpperCase() === 'BUYER' && String(p.status).toUpperCase() === 'PAID') return s + Number(a.allocated_amount || 0);
          return s;
        }, 0);
        ownerTransactionBasedDue += Math.max(total - buyerPaid, 0);
      }

      const ownerBookkeepingPayments = ownerPayments.filter(p => p.transaction_id === null && p.payer_type === 'BUYER' && p.payee_type === 'SHOP' && Number(p.counterparty_id) === buyerId && String(p.status).toUpperCase() === 'PAID');
      const ownerBookkeepingTotal = ownerBookkeepingPayments.reduce((s: number, p: Payment) => s + Number(p.amount || 0), 0);

      ownerScope = { transactionBasedDue: ownerTransactionBasedDue, bookkeepingPaymentTotal: ownerBookkeepingTotal, txns: ownerTxns.length, bkCount: ownerBookkeepingPayments.length };
    }

    return res.json({ transactionBasedDue, bookkeepingPaymentTotal, txns: txns.length, bkCount: bkPayments.length, ownerScope });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
