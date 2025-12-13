import { getUserDisplayWithRoleAndId } from '../utils/userDisplayName';
import type { BalanceSnapshot, User, FarmerPaymentsExpenses, Payment } from '../types/api';
import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatDate';
import { paymentsApi, balanceSnapshotsApi, balanceApi } from '../services/api';
import { useUsers } from '../context/useUsers';
import { useAuth } from '../context/AuthContext';
import { fetchOwnerShop } from '../utils/shopUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserSearchDropdown } from '@/components/ui/UserSearchDropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SettlementBreakdownCard } from '@/components/ui/SettlementBreakdownCard';
import { Badge } from '@/components/ui/badge';
import { History, ArrowUpDown, CreditCard, Receipt, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PaymentManagement: React.FC = () => {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth();
  const [shopId, setShopId] = useState<number | null>(null);
  // Fetch the owner's shop_id on mount
  useEffect(() => {
    const fetchShop = async () => {
      if (user && user.role === 'owner') {
        const shop = await fetchOwnerShop(user.id, user.shop_id);
        setShopId(shop?.id || null);
      }
    };
    fetchShop();
  }, [user]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAuthenticated || !hasRole('owner')) {
    return <div className="p-8 text-center text-red-600 font-bold">Unauthorized: Only owners can access this page.</div>;
  }
  const { users, refreshUsers } = useUsers();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Remove top-level role filter; direction is chosen inline based on selected user
  const [searchRole] = useState<'farmer' | 'buyer' | 'all'>('all');
  // ...existing code...
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // direction chooser modal state (ask user whether this is a receive or pay)
  // Remove direction modal; payment direction is now explicit and inline
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expensesData, setExpensesData] = useState<FarmerPaymentsExpenses | null>(null);
  const [settlementBreakdown, setSettlementBreakdown] = useState<{
    applied_to_expenses: number;
    applied_to_balance: number;
    fifo_result?: {
      settlements?: {
        expense_id: number;
        amount_settled: number;
        expense_date?: string;
        reason?: string;
      }[];
      remaining?: number;
    };
  } | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  // modal removed; inline override checkbox used instead
  const [forceOverride, setForceOverride] = useState(false);
  // Inline direction selector: controls whether this is shop->farmer (pay) or receive (from buyer/farmer)
  const [paymentDirection, setPaymentDirection] = useState<'pay_to_farmer' | 'receive_from_buyer' | 'receive_from_farmer'>('pay_to_farmer');
  const [currentPage, setCurrentPage] = useState(1);
  const [snapshotsPage, setSnapshotsPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const itemsPerPage = 8;
  const EXPENSES_ITEMS_PER_PAGE = 10;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    direction: 'pay' | 'receive';
    forceOverride: boolean;
  } | null>(null);

  // Removed local fetchUsers; using users from context

  useEffect(() => {
    if (!selectedUser) {
      setSnapshots([]);
      setPayments([]);
      setSettlementBreakdown(null);
      setCurrentPage(1);
      setSnapshotsPage(1);
      setExpensesPage(1);
      setCurrentBalance(0);
      return;
    }
    
    const fetchData = async () => {
      try {
        // Fetch current balance directly from balance API
        const balanceRes = await balanceApi.getUserBalance(selectedUser.id);
        if (balanceRes.success && balanceRes.data) {
          setCurrentBalance(Number(balanceRes.data.current_balance || 0));
        } else {
          console.warn('Failed to fetch balance:', balanceRes);
          setCurrentBalance(0);
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        setCurrentBalance(0);
      }

      // Fetch balance snapshots for history display (don't fail if this errors)
      try {
        const snapshotsData = await balanceSnapshotsApi.getByUserId(selectedUser.id);
        setSnapshots(snapshotsData);
      } catch (error) {
        console.error('Error fetching balance snapshots:', error);
        setSnapshots([]);
      }

      // Fetch payments (don't fail if this errors)
      try {
        let res;
        if (selectedUser.role === 'farmer') {
          res = await paymentsApi.getFarmerPayments(selectedUser.id);
          const data = res.data;
          if (!data || Array.isArray(data)) {
            setPayments(Array.isArray(data) ? data : []);
            setExpensesData(null);
          } else {
            setPayments(data.payments || []);
            setExpensesData((data as { expenses: FarmerPaymentsExpenses }).expenses || null);
          }
        } else if (selectedUser.role === 'buyer') {
          res = await paymentsApi.getBuyerPayments(selectedUser.id);
          setPayments(res.data || []);
          setExpensesData(null);
        } else {
          setPayments([]);
          setExpensesData(null);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
        setExpensesData(null);
      }
    };
    
    fetchData();
  // Advance payment state removed
    setMessage('');
    setSettlementBreakdown(null);
  }, [selectedUser]);

  // Auto-adjust paymentDirection based on user role and balance
  useEffect(() => {
    if (!selectedUser) return;
    
    // For buyers: only "receive from buyer" is valid (buyers pay shop, never receive from shop)
    if (selectedUser.role === 'buyer') {
      if (paymentDirection !== 'receive_from_buyer') {
        setPaymentDirection('receive_from_buyer');
        setMessage('Buyer selected — action set to Receive from Buyer.');
      }
    }
    // For farmers with negative balance (they owe the shop)
    else if (selectedUser.role === 'farmer' && currentBalance < 0) {
      // Farmer owes shop -> prefer Receive from Farmer (farmer pays shop)
      if (paymentDirection === 'pay_to_farmer') {
        setPaymentDirection('receive_from_farmer');
        setMessage('Farmer has an outstanding advance — defaulting action to Receive from Farmer.');
      }
    }
    // For farmers with positive balance (shop owes them)
    else if (selectedUser.role === 'farmer' && currentBalance >= 0) {
      if (paymentDirection !== 'pay_to_farmer') {
        setPaymentDirection('pay_to_farmer');
        setMessage('');
      }
    }
  }, [selectedUser, currentBalance, paymentDirection]);

  // No transaction selection or bulk payment logic needed for bookkeeping mode

  // No bulk payment handler needed

  const handlePayment = async (directionParam: 'pay' | 'receive', forceOverrideFlag: boolean = false) => {
    if (!selectedUser || !paymentAmount || !shopId) return;
    setLoading(true);
    try {
      type PaymentPayload = {
        // allow buyer/farmer/shop as payer for flexibility
        payer_type: 'shop' | 'buyer' | 'farmer';
        payee_type: 'shop' | 'farmer';
        amount: number;
        method: string;
        status: 'PAID';
        notes: string;
        counterparty_id: number;
        shop_id: number;
        payment_date: string;
          force_override?: boolean | undefined;
      };
      let payload: PaymentPayload;
      // directionParam indicates whether this is a shop->user payment ('pay') or user->shop ('receive')
      if (directionParam === 'pay') {
        // Shop pays the selected user
        payload = {
          payer_type: 'shop',
          payee_type: selectedUser.role === 'farmer' ? 'farmer' : 'shop',
          amount: parseFloat(paymentAmount),
          method: paymentMethod.toLowerCase(),
          status: 'PAID',
          notes: `Payment to ${getUserDisplayWithRoleAndId(selectedUser)}` + (forceOverrideFlag ? ' (force_override)' : ''),
          counterparty_id: Number(selectedUser.id),
          shop_id: Number(shopId),
          payment_date: new Date().toISOString()
        };
      } else {
        // receive: user pays the shop
        payload = {
          payer_type: selectedUser.role === 'buyer' ? 'buyer' : 'farmer',
          payee_type: 'shop',
          amount: parseFloat(paymentAmount),
          method: paymentMethod.toLowerCase(),
          status: 'PAID',
          notes: `Payment from ${getUserDisplayWithRoleAndId(selectedUser)}`,
          counterparty_id: Number(selectedUser.id),
          shop_id: Number(shopId),
          payment_date: new Date().toISOString()
        };
      }
      const res = await paymentsApi.create(payload);
      if (res && res.success) {
        // Capture settlement breakdown from API response
        if (res.data && typeof res.data === 'object' && 'applied_to_expenses' in res.data) {
          setSettlementBreakdown({
            applied_to_expenses: res.data.applied_to_expenses || 0,
            applied_to_balance: res.data.applied_to_balance || 0,
            fifo_result: res.data.fifo_result || undefined
          });
        }
        setMessage('Payment recorded successfully!');
        setPaymentAmount('');
        // Refresh users, balance, snapshots, and payments after payment
        await refreshUsers();
        if (selectedUser) {
          // Refresh current balance from balance API
          const balanceRes = await balanceApi.getUserBalance(selectedUser.id);
          if (balanceRes.success && balanceRes.data) {
            setCurrentBalance(Number(balanceRes.data.current_balance || 0));
          }

          // Refresh balance snapshots for history
          const snapshotsData = await balanceSnapshotsApi.getByUserId(selectedUser.id);
          setSnapshots(snapshotsData);
          
          // Fetch payments for the selected user (either as farmer or buyer)
          let payRes;
          if (selectedUser.role === 'farmer') {
            payRes = await paymentsApi.getFarmerPayments(selectedUser.id);
            const refreshed: Payment[] | { payments: Payment[]; expenses: unknown } = payRes.data || {};
            if (Array.isArray(refreshed)) {
              setPayments(refreshed);
              setExpensesData(null);
            } else {
              setPayments(refreshed.payments || []);
              setExpensesData((refreshed as { expenses: FarmerPaymentsExpenses }).expenses || null);
            }
            } else if (selectedUser.role === 'buyer') {
              payRes = await paymentsApi.getBuyerPayments(selectedUser.id);
              setPayments(payRes.data || []);
              setExpensesData(null);
            } else {
              payRes = { data: [] };
              setPayments([]);
              setExpensesData(null);
            }
          // Refetch selectedUser to get updated balance from global users
          const updatedUser = users.find((u) => u.id === selectedUser.id);
          if (updatedUser) setSelectedUser(updatedUser);
        }
      } else if (res && res.message) {
        setMessage(`Error: ${res.message}`);
      }
    } catch (error) {
      const msg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      setMessage(typeof msg === 'string' ? msg : 'Error processing payment.');
    } finally {
      setLoading(false);
    }
  };

  // Inline payment direction: for buyers, always receive; for farmers, always pay
  const onRecordClick = () => {
    if (!selectedUser || !paymentAmount || !shopId) return;
    
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      setMessage('Please enter a valid payment amount greater than 0.');
      return;
    }

    // Show confirmation for large payments (> ₹10,000)
    if (amount > 10000) {
      setPendingPayment({
        direction: paymentDirection === 'pay_to_farmer' ? 'pay' : 'receive',
        forceOverride
      });
      setShowConfirmation(true);
      return;
    }

    // Determine effective direction from inline selector
    if (paymentDirection === 'pay_to_farmer') {
      // pay shop -> farmer
      // If farmer currently has negative balance (advance), require override to allow increasing debt
      if (currentBalance < 0 && !forceOverride) {
        setMessage('Farmer has a negative balance (advance). Enable Override to allow this payment to increase farmer debt.');
        return;
      }
      handlePayment('pay', forceOverride);
    } else if (paymentDirection === 'receive_from_buyer') {
      handlePayment('receive', false);
    } else if (paymentDirection === 'receive_from_farmer') {
      // receiving from farmer: user pays shop
      handlePayment('receive', false);
    }
  };

  const confirmPayment = () => {
    if (!pendingPayment) return;
    setShowConfirmation(false);
    handlePayment(pendingPayment.direction, pendingPayment.forceOverride);
    setPendingPayment(null);
  };

  // No longer needed: confirmDirectionAndSend (direction is explicit)


  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Payment Management</h1>
        <p className="text-sm text-gray-600">Record payments to farmers or receive payments from buyers</p>
      </div>

      {/* User Selection and Balance */}
      <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
            <span className="font-medium text-sm">Select User:</span>
            <div className="flex items-center gap-2">
              {/* Removed top role filter buttons — selection is done via the user dropdown */}
              <UserSearchDropdown
                onSelect={setSelectedUser}
                placeholder="Search user by name or phone"
                roleFilter={searchRole}
              />
            </div>
          </div>
              {selectedUser && (
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <div className="bg-gray-50 px-3 py-2 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">Net Balance:</span>
                    <div className="text-xs text-gray-500">After deducting unsettled expenses</div>
                    {expensesData && expensesData.totalUnsettled > 0 && (
                      <div className="text-xs text-orange-600 font-medium mt-1">
                        ⚠️ Farmer still owes ₹{expensesData.totalUnsettled.toLocaleString()} in expenses
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-lg">₹{currentBalance.toLocaleString()}</span>
                </div>
              </div>
              {selectedUser.role === 'farmer' && currentBalance < 0 && (
                <div className="bg-blue-50 px-3 py-2 rounded">
                  <span className="text-sm text-blue-600">Advance: ₹{Math.abs(currentBalance).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedUser && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Balance History and Payment Form */}
          <div className="space-y-6">
            {/* Balance Changes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-4 w-4" />
                  Balance Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {snapshots.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <History className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                    <div>No balance changes yet</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Balance Summary Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Balance Summary</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-900">₹{currentBalance.toLocaleString()}</div>
                          <div className="text-xs text-blue-600">
                            {snapshots.length} transactions • {snapshots.filter(s => Number(s.amount_change) > 0).length} increases • {snapshots.filter(s => Number(s.amount_change) < 0).length} decreases
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Recent Activity */}
                    <div className="bg-green-50 p-2 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-700">Latest Change</span>
                        <span className="text-green-600">
                          ₹{Number(snapshots[0]?.previous_balance || 0).toLocaleString()} → ₹{Number(snapshots[0]?.new_balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Compact Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-8">
                            <TableHead className="text-xs px-2 py-1">Date</TableHead>
                            <TableHead className="text-xs px-2 py-1">Type</TableHead>
                            <TableHead className="text-xs px-2 py-1 text-right">Before</TableHead>
                            <TableHead className="text-xs px-2 py-1 text-right">Change</TableHead>
                            <TableHead className="text-xs px-2 py-1 text-right">After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const startIndex = (snapshotsPage - 1) * itemsPerPage;
                            const endIndex = startIndex + itemsPerPage;
                            const paginatedSnapshots = snapshots.slice(startIndex, endIndex);
                            
                            return paginatedSnapshots.map(s => {
                              let dateStr = '';
                              const dateVal = s.createdAt || s.created_at;
                              if (dateVal) {
                                dateStr = formatDate(dateVal);
                              }
                              
                              const prev = Number(s.previous_balance || 0);
                              const change = Number(s.amount_change || 0);
                              const next = Number(s.new_balance || 0);
                              
                              const changeColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
                              
                              // Compact transaction icon
                              const getCompactIcon = (type?: string) => {
                                switch (type?.toLowerCase()) {
                                  case 'payment': return <CreditCard className="h-3 w-3 text-blue-600" />;
                                  case 'expense': return <Receipt className="h-3 w-3 text-red-600" />;
                                  default: return <ArrowUpDown className="h-3 w-3 text-gray-600" />;
                                }
                              };
                              
                              return (
                                <TableRow key={s.id} className="h-8 hover:bg-gray-50">
                                  <TableCell className="text-xs px-2 py-1 font-medium">{dateStr}</TableCell>
                                  <TableCell className="px-2 py-1">
                                    <div className="flex items-center gap-1">
                                      {getCompactIcon(s.transaction_type)}
                                      <span className="text-xs">{s.transaction_type || 'Update'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs px-2 py-1 text-right font-mono">₹{prev.toFixed(0)}</TableCell>
                                  <TableCell className={`text-xs px-2 py-1 text-right font-mono font-medium ${changeColor}`}>
                                    {change >= 0 ? '+' : ''}₹{Math.abs(change).toFixed(0)}
                                  </TableCell>
                                  <TableCell className="text-xs px-2 py-1 text-right font-mono font-medium">₹{next.toFixed(0)}</TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {snapshots.length > itemsPerPage && (
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-gray-500">
                          Showing {Math.min((snapshotsPage - 1) * itemsPerPage + 1, snapshots.length)} to {Math.min(snapshotsPage * itemsPerPage, snapshots.length)} of {snapshots.length} changes
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => setSnapshotsPage(Math.max(1, snapshotsPage - 1))}
                            disabled={snapshotsPage === 1}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <span className="text-xs text-gray-600 px-2">
                            {snapshotsPage} / {Math.ceil(snapshots.length / itemsPerPage)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => setSnapshotsPage(Math.min(Math.ceil(snapshots.length / itemsPerPage), snapshotsPage + 1))}
                            disabled={snapshotsPage === Math.ceil(snapshots.length / itemsPerPage)}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-4 w-4" />
                  Payment Recording
                </CardTitle>
                <div className="text-sm text-gray-600">
                  {selectedUser.role === 'buyer' ? (
                    <span className="font-medium text-blue-700">📥 Receive money from buyer (reduces what they owe)</span>
                  ) : currentBalance >= 0 ? (
                    <span className="font-medium text-green-700">📤 Pay money to farmer (reduces what shop owes them) - Does NOT settle expenses</span>
                  ) : (
                    <span className="font-medium text-orange-700">📥 Receive money from farmer (settles their advance/expenses first, then reduces balance)</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Payment Preview - Clear breakdown of what happens */}
                    {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    (() => {
                      const amt = Math.abs(parseFloat(paymentAmount));
                      
                      // Determine the money flow and balance impact
                      let moneyFlow = '';
                      let balanceChange = 0;
                      let balanceExplanation = '';
                      let newBalance = currentBalance;
                      
                      if (paymentDirection === 'pay_to_farmer') {
                        // SHOP PAYS FARMER: Shop gives money → Farmer balance DECREASES (shop owes less)
                        moneyFlow = '💵 Shop → Farmer';
                        balanceChange = -amt;
                        newBalance = currentBalance - amt;
                        balanceExplanation = 'Shop owes farmer LESS';
                      } else if (paymentDirection === 'receive_from_buyer') {
                        // BUYER PAYS SHOP: Buyer gives money → Buyer balance DECREASES (buyer owes less)
                        moneyFlow = '💵 Buyer → Shop';
                        balanceChange = -amt;
                        newBalance = currentBalance - amt;
                        balanceExplanation = 'Buyer owes shop LESS';
                      } else if (paymentDirection === 'receive_from_farmer') {
                        // FARMER PAYS SHOP: Farmer gives money → First settles expenses, then reduces negative balance
                        moneyFlow = '💵 Farmer → Shop';
                        // For farmers with negative balance (they owe shop), payment reduces debt
                        // Note: Backend applies FIFO to expenses first, remaining goes to balance
                        balanceChange = amt; // moves toward zero (less negative)
                        newBalance = currentBalance + amt;
                        balanceExplanation = currentBalance < 0 
                          ? 'Settles expenses first, then reduces farmer debt' 
                          : 'Reduces what shop owes farmer (but expenses are separate)';
                      }
                      
                      const isOverpay = (paymentDirection === 'receive_from_farmer' || paymentDirection === 'receive_from_buyer') && amt > Math.abs(currentBalance);
                      const bgClass = isOverpay ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-200';
                      const headerColor = isOverpay ? 'text-amber-800' : 'text-blue-800';

                      return (
                        <div className={`p-4 rounded-lg border-2 ${bgClass}`}>
                          <div className={`flex items-center justify-between mb-3 ${headerColor}`}>
                            <div className="flex items-center gap-2 font-semibold text-base">
                              <TrendingDown className="h-5 w-5" />
                              Payment Impact Preview
                            </div>
                            {isOverpay && (
                              <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded font-semibold">
                                ⚠️ OVERPAYMENT
                              </span>
                            )}
                          </div>
                          
                          {/* Money Flow */}
                          <div className="bg-white rounded p-2 mb-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Money Flow</div>
                            <div className="font-bold text-sm">{moneyFlow}</div>
                          </div>
                          
                          {/* Balance Changes */}
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <div className="text-gray-600 text-xs mb-1">Current Balance</div>
                              <div className={`font-mono font-bold ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₹{currentBalance.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {currentBalance > 0 && selectedUser.role === 'buyer' && 'Buyer owes'}
                                {currentBalance > 0 && selectedUser.role === 'farmer' && 'Shop owes'}
                                {currentBalance < 0 && 'Farmer owes'}
                                {currentBalance === 0 && 'Settled'}
                              </div>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <div className="text-gray-600 text-xs mb-1">Balance Change</div>
                              <div className={`font-mono font-bold ${balanceChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {balanceChange > 0 ? '+' : ''}₹{balanceChange.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{balanceExplanation}</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <div className="text-gray-600 text-xs mb-1">New Balance</div>
                              <div className={`font-mono font-bold text-lg ${newBalance < 0 ? 'text-red-600' : newBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                ₹{newBalance.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {newBalance > 0 && selectedUser.role === 'buyer' && 'Still owes'}
                                {newBalance > 0 && selectedUser.role === 'farmer' && 'Shop still owes'}
                                {newBalance < 0 && 'Farmer still owes'}
                                {newBalance === 0 && '✅ Fully settled'}
                              </div>
                            </div>
                          </div>
                          
                          {isOverpay && (
                            <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-900 border border-amber-300">
                              <strong>⚠️ Overpayment Warning:</strong> Payment amount exceeds current balance. 
                              {paymentDirection === 'receive_from_farmer' && ' For farmers, excess will be applied to unsettled expenses first (FIFO), then adjust balance.'}
                            </div>
                          )}
                          
                          {paymentDirection === 'receive_from_farmer' && (
                            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900 border border-blue-300">
                              <strong>ℹ️ How Farmer Payments Work:</strong> This payment will first settle any outstanding expenses (oldest first), then adjust the farmer's net balance. The displayed balance already accounts for unsettled expenses.
                            </div>
                          )}
                          
                          {paymentDirection === 'pay_to_farmer' && expensesData && expensesData.totalUnsettled > 0 && (
                            <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-900 border border-red-300">
                              <strong>⚠️ IMPORTANT:</strong> Paying the farmer will NOT settle their expenses! 
                              The farmer will still owe ₹{expensesData.totalUnsettled.toLocaleString()} for supplies/advances. 
                              Only payments FROM the farmer settle expenses.
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}

                  <div className="flex flex-col gap-3">
                    {/* Quick Amount Buttons */}
                    {selectedUser && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 self-center mr-2">Quick amounts:</span>
                        {[500, 1000, 2000, 5000].map(amount => (
                          <Button
                            key={amount}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => setPaymentAmount(amount.toString())}
                          >
                            ₹{amount.toLocaleString()}
                          </Button>
                        ))}
                        {currentBalance !== 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 text-blue-600"
                            onClick={() => setPaymentAmount(Math.abs(currentBalance).toString())}
                          >
                            Full balance (₹{Math.abs(currentBalance).toLocaleString()})
                          </Button>
                        )}
                        {expensesData && expensesData.totalUnsettled > 0 && paymentDirection === 'receive_from_farmer' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 text-green-600"
                            onClick={() => setPaymentAmount(expensesData.totalUnsettled.toString())}
                          >
                            Settle all expenses (₹{expensesData.totalUnsettled.toLocaleString()})
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col w-24 min-w-[6rem]">
                        <label className="text-sm font-medium text-gray-700 mb-1">Amount *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={e => {
                            // ensure amount stored as a positive string
                            const raw = e.target.value || '';
                            const n = parseFloat(raw);
                            if (!isNaN(n)) setPaymentAmount(String(Math.abs(n))); else setPaymentAmount(raw);
                          }}
                          placeholder="Enter amount"
                          className="w-full"
                          min="0"
                          required
                        />
                      </div>
                      {/* Payment Direction - Clear labels about money flow */}
                      <div className="flex flex-col w-56 min-w-[14rem]">
                        <label className="text-sm font-medium text-gray-700 mb-1">Payment Direction *</label>
                        <select
                          className="border rounded px-2 py-2 text-sm w-full font-medium"
                          value={paymentDirection}
                          onChange={e => setPaymentDirection(e.target.value as 'pay_to_farmer' | 'receive_from_buyer' | 'receive_from_farmer')}
                          required
                        >
                          {/* For FARMERS: Show both pay and receive options */}
                          {selectedUser?.role === 'farmer' && (
                            <>
                              <option value="pay_to_farmer" disabled={currentBalance < 0 && !forceOverride}>
                                💵 Pay Farmer (Shop → Farmer) - Reduces what shop owes
                                {currentBalance < 0 && !forceOverride && ' - Disabled: Has advance'}
                              </option>
                              <option value="receive_from_farmer">
                                💰 Receive from Farmer (Farmer → Shop) - Settles expenses first
                              </option>
                            </>
                          )}
                          {/* For BUYERS: Only receive option (buyers never receive from shop) */}
                          {selectedUser?.role === 'buyer' && (
                            <option value="receive_from_buyer">
                              💰 Receive from Buyer (Buyer → Shop)
                            </option>
                          )}
                        </select>
                      </div>
                      <div className="flex flex-col w-36 min-w-[8rem]">
                        <label className="text-sm font-medium text-gray-700 mb-1">Method</label>
                        <select
                          className="border rounded px-2 py-2 text-sm w-full"
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank_transfer">Bank</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center ml-auto">
                        <div className="flex items-center gap-2">
                          <input id="force-override" type="checkbox" checked={forceOverride} onChange={e => setForceOverride(e.target.checked)} />
                          <label htmlFor="force-override" className="text-sm">Override</label>
                        </div>
                        <div>
                          <Button
                            onClick={onRecordClick}
                            disabled={
                              loading || !paymentAmount || parseFloat(paymentAmount) <= 0 || !shopId ||
                              (paymentDirection === 'pay_to_farmer' && selectedUser?.role === 'farmer' && currentBalance < 0 && !forceOverride)
                            }
                            className={loading ? 'opacity-60 cursor-not-allowed' : ''}
                            size="sm"
                          >
                          {loading ? (
                            <span className="flex items-center">
                              <span className="loader mr-1"></span>
                              Processing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              {paymentDirection === 'pay_to_farmer' && (
                                <>
                                  <span className="text-base">💵</span>
                                  <span>Pay ₹{paymentAmount} to Farmer</span>
                                </>
                              )}
                              {paymentDirection === 'receive_from_buyer' && (
                                <>
                                  <span className="text-base">💰</span>
                                  <span>Receive ₹{paymentAmount} from Buyer</span>
                                </>
                              )}
                              {paymentDirection === 'receive_from_farmer' && (
                                <>
                                  <span className="text-base">💰</span>
                                  <span>Receive ₹{paymentAmount} from Farmer</span>
                                </>
                              )}
                            </span>
                          )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment History */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-4 w-4" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {payments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <Receipt className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                    <div>No payments yet</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Compact Payment Summary */}
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs">
                      <span className="font-medium">{payments.length} payments</span>
                      <span className="font-mono font-medium">₹{payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</span>
                      <span className="text-green-600">{payments.filter(p => p.status === 'PAID').length} completed</span>
                    </div>

                    {/* Compact Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="h-8">
                            <TableHead className="text-xs px-2 py-1">Date</TableHead>
                            <TableHead className="text-xs px-2 py-1 text-right">Amount</TableHead>
                            <TableHead className="text-xs px-2 py-1">Method</TableHead>
                            <TableHead className="text-xs px-2 py-1">Direction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => {
                            // Determine payment type from user's perspective
                            let paymentType = '';
                            let badgeColor = '';
                            
                            if (selectedUser?.role === 'farmer') {
                              // For farmers: payments received are "Received", payments made are "Paid"
                              if (p.payee_type === 'farmer') {
                                paymentType = 'Received';
                                badgeColor = 'border-green-500 text-green-700';
                              } else {
                                paymentType = 'Paid';
                                badgeColor = 'border-blue-500 text-blue-700';
                              }
                            } else if (selectedUser?.role === 'buyer') {
                              // For buyers: payments made are "Paid", payments received are "Received"
                              if (p.payer_type === 'buyer') {
                                paymentType = 'Paid';
                                badgeColor = 'border-blue-500 text-blue-700';
                              } else {
                                paymentType = 'Received';
                                badgeColor = 'border-green-500 text-green-700';
                              }
                            }
                            
                            return (
                              <TableRow key={p.id} className="h-8 hover:bg-gray-50">
                                <TableCell className="text-xs px-2 py-1 font-medium">{formatDate(p.created_at)}</TableCell>
                                <TableCell className="text-xs px-2 py-1 text-right font-mono font-medium">₹{Number(p.amount).toFixed(0)}</TableCell>
                                <TableCell className="px-2 py-1">
                                  <Badge variant="secondary" className="text-xs px-1 py-0">
                                    {p.method}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-2 py-1">
                                  <Badge variant="outline" className={`text-xs px-1 py-0 ${badgeColor}`}>
                                    {paymentType}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Payment Pagination Controls */}
                    {payments.length > itemsPerPage && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-gray-500">
                          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, payments.length)} to {Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length} payments
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="h-7 px-2"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <span className="text-xs px-2">
                            {currentPage} / {Math.ceil(payments.length / itemsPerPage)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(Math.min(Math.ceil(payments.length / itemsPerPage), currentPage + 1))}
                            disabled={currentPage === Math.ceil(payments.length / itemsPerPage)}
                            className="h-7 px-2"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Expenses removed from here and rendered as a full-width section after the grid to prevent overlap */}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Full-width Expenses section to avoid overlapping the payment form */}
      {expensesData && (
        <div className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-4 w-4" />
                Farmer Expenses & Advances
              </CardTitle>
              <div className="text-sm text-gray-600">
                Money farmer owes shop for supplies, advances, etc. (automatically deducted from balance)
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-2 text-sm text-gray-600">
                Total: <strong>₹{expensesData.totalExpenses.toLocaleString()}</strong>
                <span className="ml-4">Unsettled: <strong>₹{expensesData.totalUnsettled.toLocaleString()}</strong></span>
                <div className="text-xs text-orange-600 mt-1">💡 Unsettled expenses are already deducted from the farmer's balance above</div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="text-xs px-2 py-1">Date</TableHead>
                      <TableHead className="text-xs px-2 py-1">Amount</TableHead>
                      <TableHead className="text-xs px-2 py-1">Settled</TableHead>
                      <TableHead className="text-xs px-2 py-1">Unsettled</TableHead>
                      <TableHead className="text-xs px-2 py-1">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const startIndex = (expensesPage - 1) * EXPENSES_ITEMS_PER_PAGE;
                      const endIndex = startIndex + EXPENSES_ITEMS_PER_PAGE;
                      const paginatedExpenses = expensesData.expenses.slice(startIndex, endIndex);
                      
                      return paginatedExpenses.map((e: {
                        id: number;
                        created_at: string;
                        amount: number;
                        settled: number;
                        unsettled: number;
                        status: string;
                      }) => (
                        <TableRow key={e.id} className="h-8 hover:bg-gray-50">
                          <TableCell className="text-xs px-2 py-1">{formatDate(e.created_at)}</TableCell>
                          <TableCell className="text-xs px-2 py-1">₹{e.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-xs px-2 py-1">₹{e.settled.toLocaleString()}</TableCell>
                          <TableCell className="text-xs px-2 py-1">₹{e.unsettled.toLocaleString()}</TableCell>
                          <TableCell className="text-xs px-2 py-1"><Badge>{e.status}</Badge></TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
                
                {/* Expenses Pagination Controls */}
                {expensesData.expenses.length > EXPENSES_ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    <div className="text-xs text-gray-500">
                      Showing {Math.min((expensesPage - 1) * EXPENSES_ITEMS_PER_PAGE + 1, expensesData.expenses.length)} to {Math.min(expensesPage * EXPENSES_ITEMS_PER_PAGE, expensesData.expenses.length)} of {expensesData.expenses.length} expenses
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpensesPage(Math.max(1, expensesPage - 1))}
                        disabled={expensesPage === 1}
                        className="h-7 px-2"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="text-xs px-2">
                        {expensesPage} / {Math.ceil(expensesData.expenses.length / EXPENSES_ITEMS_PER_PAGE)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpensesPage(Math.min(Math.ceil(expensesData.expenses.length / EXPENSES_ITEMS_PER_PAGE), expensesPage + 1))}
                        disabled={expensesPage === Math.ceil(expensesData.expenses.length / EXPENSES_ITEMS_PER_PAGE)}
                        className="h-7 px-2"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Settlement Breakdown Display */}
      {settlementBreakdown && (
        <SettlementBreakdownCard settlementBreakdown={settlementBreakdown} />
      )}

      {/* Large Payment Confirmation Dialog */}
      {showConfirmation && pendingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Large Payment</h3>
                <p className="text-sm text-gray-600">You're about to record a payment of ₹{paymentAmount}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="bg-gray-50 rounded p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span>Amount:</span>
                  <span className="font-medium">₹{parseFloat(paymentAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>To/From:</span>
                  <span className="font-medium">{getUserDisplayWithRoleAndId(selectedUser)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direction:</span>
                  <span className="font-medium">
                    {pendingPayment.direction === 'pay' ? 'Shop → Farmer' : 'Farmer/Buyer → Shop'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmPayment}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={
          message.toLowerCase().includes('error')
            ? 'mt-4 text-center text-red-600 font-semibold'
            : 'mt-4 text-center text-green-600 font-semibold'
        }>
          {message}
        </div>
      )}
<style>
  {`
    .loader {
      border: 2px solid #cbd5e1;
      border-top: 2px solid #2563eb;
      border-radius: 50%;
      width: 1em;
      height: 1em;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}
</style>
    </div>
  );
};

export default PaymentManagement;
