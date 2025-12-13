import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { formatDisplayDate } from '../utils/dateUtils';
import { getUserDisplayNameById } from '../utils/userDisplayName';
import type { Transaction, User } from '../types/api';

interface TransactionTableProps {
  paginatedTransactions: Transaction[];
  users: User[];
  openRows: { [key: string]: boolean };
  toggleRow: (rowKey: string) => void;
  getTransactionStatus: (transaction: Transaction) => string;
  getTransactionStatusColor: (status: string) => string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  paginatedTransactions,
  users,
  openRows,
  toggleRow,
  getTransactionStatus,
  getTransactionStatusColor,
}) => (
  <Table className="min-w-[700px] text-xs sm:text-sm">
    <TableHeader>
      <TableRow className="!py-1 !px-2">
        <TableHead className="!py-1 !px-2">Txn</TableHead>
        <TableHead colSpan={4} className="!py-1 !px-2"></TableHead>
        <TableHead className="text-right !py-1 !px-2" style={{ minWidth: 180 }}></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {paginatedTransactions.map((transaction, idx) => {
        const derivedStatus = getTransactionStatus(transaction);
        const rowKey = transaction.id + '-' + idx;
        const open = openRows[rowKey] || false;
        const farmerUser = users.find(u => String(u.id) === String(transaction.farmer_id));
        const farmerName = farmerUser?.firstname?.trim() ? farmerUser.firstname : farmerUser?.username ?? '';
        return (
          <React.Fragment key={rowKey}>
            <TableRow>
              <TableCell colSpan={6} style={{ padding: 0 }}>
                <button
                  type="button"
                  className="flex items-center cursor-pointer py-2 px-1 w-full text-left focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                  aria-pressed={open}
                  aria-label={open ? 'Collapse transaction details' : 'Expand transaction details'}
                  tabIndex={0}
                  onClick={() => toggleRow(rowKey)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleRow(rowKey);
                    }
                  }}
                  onTouchStart={() => toggleRow(rowKey)}
                >
                  <Badge className={getTransactionStatusColor(derivedStatus)} style={{ marginRight: 8 }}>{derivedStatus}</Badge>
                  <span className="font-semibold mr-2">{farmerName}</span>
                  {farmerUser && <Badge userType="FARMER" className="mr-2 align-middle" />}
                  <span className="text-xs text-gray-500 mr-2">{formatDisplayDate(transaction.created_at)}</span>
                  <span className="text-xs text-gray-500 mr-2">Product: {transaction.product_name}</span>
                  <span className="font-medium mr-2">{formatCurrency(transaction.total_amount)}</span>
                  {open ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                </button>
              </TableCell>
            </TableRow>
            {open && (
              <TableRow>
                <TableCell colSpan={6} style={{ background: '#f9fafb', padding: '12px 16px' }}>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="col-span-1">
                      <div>
                        <span className="font-medium">Buyer:</span> {getUserDisplayNameById(users, transaction.buyer_id)} {(() => {
                          const buyerUser = users.find(u => String(u.id) === String(transaction.buyer_id));
                          return buyerUser ? <Badge userType="BUYER" /> : null;
                        })()}
                      </div>
                      <div>
                        <span className="font-medium">Seller:</span> {getUserDisplayNameById(users, transaction.farmer_id)} {(() => {
                          const farmerUser = users.find(u => String(u.id) === String(transaction.farmer_id));
                          return farmerUser ? <Badge userType="FARMER" /> : null;
                        })()}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {(() => {
                        let buyerPaid = 0, buyerTotal = 0, farmerPaid = 0, farmerTotal = 0;
                        if (transaction.payments && transaction.payments.length > 0) {
                          transaction.payments.forEach(p => {
                            if (p.payer_type === 'BUYER' && p.payee_type === 'SHOP') {
                              buyerPaid += Number(p.amount);
                              buyerTotal += Number(p.amount);
                            }
                            if (p.payer_type === 'SHOP' && p.payee_type === 'FARMER') {
                              farmerPaid += Number(p.amount);
                              farmerTotal += Number(p.amount);
                            }
                          });
                        }
                        if (transaction.total_amount) buyerTotal = Number(transaction.total_amount);
                        if (transaction.farmer_earning) farmerTotal = Number(transaction.farmer_earning);
                        const buyerPending = buyerTotal - buyerPaid;
                        const farmerPending = farmerTotal - farmerPaid;
                        return (
                          <>
                            <div><span className="font-medium">Buyer Paid:</span> {formatCurrency(buyerPaid)}</div>
                            <div><span className="font-medium">Buyer Pending:</span> {formatCurrency(buyerPending)}</div>
                            <div><span className="font-medium">Farmer Paid:</span> {formatCurrency(farmerPaid)}</div>
                            <div><span className="font-medium">Farmer Pending:</span> {formatCurrency(farmerPending)}</div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="col-span-1">
                      <span className="font-medium">Payments:</span>
                      {transaction.payments && transaction.payments.length > 0 ? (
                        <ul className="mt-1 ml-2 list-disc">
                          {transaction.payments.map((p, i) => {
                            const renderParty = (type: string) => {
                              if (type === 'BUYER' || type === 'FARMER' || type === 'SHOP') return <Badge userType={type} />;
                              if (type === String(transaction.buyer_id)) return getUserDisplayNameById(users, transaction.buyer_id);
                              if (type === String(transaction.farmer_id)) return getUserDisplayNameById(users, transaction.farmer_id);
                              return type;
                            };
                            const payer = renderParty(String(p.payer_type));
                            const payee = renderParty(String(p.payee_type));
                            return (
                              <li key={i} className="mb-1 flex items-center gap-1">
                                <span className="font-medium flex items-center gap-1">{payer} <span className="mx-1">→</span> {payee}:</span> {formatCurrency(p.amount)}
                                {' '}<span className="text-gray-500">({p.method}{p.payment_date ? `, ${formatDisplayDate(p.payment_date)}` : ''})</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-xs">No payments</span>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        );
      })}
    </TableBody>
  </Table>
);
