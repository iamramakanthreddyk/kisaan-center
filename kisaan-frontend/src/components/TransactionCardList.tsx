


import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../utils/format';
import { formatDisplayDate } from '../utils/dateUtils';
import type { Transaction, User, Payment } from '../types/api';
import { getUserDisplayNameById } from '../utils/userDisplayName';

// Helper: resolve user name with robust fallback
function resolveUserName(users: User[], id: string | number): string {
  if (!Array.isArray(users)) return String(id) || 'Unknown';
  let name = getUserDisplayNameById(users, id);
  if (!name || name === 'undefined') {
    const fallbackUser = users.find(u => String(u.id) === String(id));
    name = fallbackUser?.firstname || fallbackUser?.username || String(id) || 'Unknown';
  }
  return name;
}

// Helper: resolve shop name
function resolveShopName(users: User[], shop_id: string | number): string {
  const shopUser = Array.isArray(users) ? users.find(u => String(u.id) === String(shop_id)) : undefined;
  return shopUser ? (shopUser.firstname || shopUser.username || 'Shop') : 'Shop';
}

// Helper: get payment label
function getPaymentLabel(p: Payment, buyerName: string, farmerName: string, shopName: string): string {
  const payerRole = String(p.payer_type);
  const payeeRole = String(p.payee_type);
  if (payerRole === 'BUYER' && payeeRole === 'SHOP') return `Paid by ${buyerName} (BUYER) to ${shopName} (SHOP)`;
  if (payerRole === 'SHOP' && payeeRole === 'FARMER') return `Paid by ${shopName} (SHOP) to ${farmerName} (FARMER)`;
  if (payerRole === 'SHOP' && payeeRole === 'SHOP') return `Commission (${shopName} (SHOP))`;
  const payer = payerRole === 'BUYER' ? `${buyerName} (BUYER)` : payerRole === 'FARMER' ? `${farmerName} (FARMER)` : payerRole === 'SHOP' ? `${shopName} (SHOP)` : payerRole;
  const payee = payeeRole === 'BUYER' ? `${buyerName} (BUYER)` : payeeRole === 'FARMER' ? `${farmerName} (FARMER)` : payeeRole === 'SHOP' ? `${shopName} (SHOP)` : payeeRole;
  return `Paid by ${payer} to ${payee}`;
}

// Helper: render payment details
function PaymentDetails({ payments, buyerName, farmerName, shopName }: { payments: Payment[]; buyerName: string; farmerName: string; shopName: string }) {
  if (!payments || payments.length === 0) return <div className="text-gray-400 text-xs">No payments</div>;
  return (
    <ul className="space-y-1">
      {payments.map((p, pidx) => {
        const payerRole = String(p.payer_type);
        const payeeRole = String(p.payee_type);
        const payer = payerRole === 'BUYER' ? `${buyerName} (BUYER)` : payerRole === 'FARMER' ? `${farmerName} (FARMER)` : payerRole === 'SHOP' ? `${shopName} (SHOP)` : payerRole;
        const payee = payeeRole === 'BUYER' ? `${buyerName} (BUYER)` : payeeRole === 'FARMER' ? `${farmerName} (FARMER)` : payeeRole === 'SHOP' ? `${shopName} (SHOP)` : payeeRole;
        const label = getPaymentLabel(p, buyerName, farmerName, shopName);
        return (
          <li key={p.id ?? `${pidx}` } className="bg-gray-50 rounded p-2 border text-xs">
            <div><span className="font-medium">{label}:</span> {formatCurrency(p.amount)}</div>
            <div><span className="font-medium">From:</span> {payer}</div>
            <div><span className="font-medium">To:</span> {payee}</div>
            <div><span className="font-medium">Method:</span> {p.method}</div>
            {p.payment_date && <div><span className="font-medium">Date:</span> {formatDisplayDate(p.payment_date)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

interface TransactionCardListProps {
  paginatedTransactions: Transaction[];
  getTransactionStatus: (transaction: Transaction) => string;
  getTransactionStatusColor: (status: string) => string;
  users: User[];
}


export const TransactionCardList: React.FC<TransactionCardListProps> = ({
  paginatedTransactions,
  getTransactionStatus,
  getTransactionStatusColor,
  users,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  return (
    <div className="block sm:hidden space-y-3 w-full">
      {paginatedTransactions.map((transaction, idx) => {
        const derivedStatus = getTransactionStatus(transaction);
        const farmerName = resolveUserName(users, transaction.farmer_id);
        const buyerName = resolveUserName(users, transaction.buyer_id);
        const shopName = resolveShopName(users, transaction.shop_id);
        const isExpanded = expandedIdx === idx;
        return (
          <div key={transaction.id + '-' + idx} className="rounded-lg border p-3 bg-white shadow-sm w-full mx-auto break-words">
            <div className="flex justify-between items-center mb-1 gap-2">
              <div className="flex flex-col max-w-[60%]">
                <span className="font-semibold text-xs text-gray-500">Product:</span>
                <span className="font-semibold text-base break-words truncate">{transaction.product_name}</span>
                <span className="font-semibold text-xs text-gray-500 mt-1">Buyer:</span>
                <span className="font-semibold text-base break-words truncate">{buyerName}</span>
                <span className="font-semibold text-xs text-gray-500 mt-1">Seller:</span>
                <span className="font-semibold text-base break-words truncate">{farmerName}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={getTransactionStatusColor(derivedStatus)}>{derivedStatus}</Badge>
                <button
                  className="text-xs text-blue-600 underline mt-1 focus:outline-none"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-1 break-words">{formatDisplayDate(transaction.created_at)}</div>
            <div className="flex flex-wrap gap-2 text-xs mb-1">
              <div className="break-words max-w-[48%]"><span className="font-medium">Total:</span> {formatCurrency(typeof transaction.total_amount !== 'undefined' ? transaction.total_amount : 0)}</div>
              <div className="break-words max-w-[48%]"><span className="font-medium">Buyer Paid:</span> {formatCurrency(transaction.buyer_paid)}</div>
              <div className="break-words max-w-[48%]"><span className="font-medium">Buyer Pending:</span> {formatCurrency(transaction.deficit)}</div>
              <div className="break-words max-w-[48%]"><span className="font-medium">Farmer Paid:</span> {formatCurrency(transaction.farmer_paid)}</div>
              <div className="break-words max-w-[48%]"><span className="font-medium">Farmer Pending:</span> {formatCurrency(transaction.farmer_due)}</div>
            </div>
            {isExpanded && (
              <div className="mt-2 border-t pt-2">
                <div className="text-xs font-semibold mb-1">Payments</div>
                <PaymentDetails payments={transaction.payments} buyerName={buyerName} farmerName={farmerName} shopName={shopName} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
