import React, { useEffect, useState } from 'react';
import type { Transaction, Payment } from '@/types/api';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { transactionsApi, paymentsApi } from '@/services/api';

interface FarmerDrilldownModalProps {
  farmerId: number;
  open: boolean;
  onClose: () => void;
}

export const FarmerDrilldownModal: React.FC<FarmerDrilldownModalProps> = ({ farmerId, open, onClose }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    Promise.all([
      transactionsApi.getAll({ farmer_id: farmerId }),
      paymentsApi.getFarmerPayments(farmerId)
    ]).then(([txs, pays]) => {
      setTransactions(txs.data || []);
      setPayments(pays.data || []);
    }).finally(() => setIsLoading(false));
  }, [farmerId, open]);

  // Calculate running balance using standardized field names
  const totalDue = transactions.reduce((sum, t) => sum + ((t.total_amount || 0) - (t.farmer_paid || 0)), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const outstanding = totalDue - totalPaid;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Farmer Bookkeeping & History</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="mb-4">
              <strong>Total Due:</strong> {formatCurrency(totalDue)}<br />
              <strong>Total Paid:</strong> {formatCurrency(totalPaid)}<br />
              <strong>Outstanding:</strong> {formatCurrency(outstanding)}
            </div>
            <h3 className="font-semibold mb-2">Transactions</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.transaction_date)}</TableCell>
                    <TableCell>{t.product_name}</TableCell>
                    <TableCell>{formatCurrency(t.total_amount || 0)}</TableCell>
                    <TableCell>{formatCurrency(t.farmer_paid || 0)}</TableCell>
                    <TableCell>{t.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <h3 className="font-semibold mt-4 mb-2">Payments</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date || '')}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
