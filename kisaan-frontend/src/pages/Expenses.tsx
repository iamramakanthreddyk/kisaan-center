// This file has been renamed to Expenses.tsx. Please use Expenses.tsx instead.

import { useState, useEffect, useCallback, useRef } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpensesTable from './components/ExpensesTable';
import ExpenseSummaryDashboard from './components/ExpenseSummaryDashboard';
import { useTransactionStore } from '../store/transactionStore';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { expenseApi, usersApi } from '../services/api';
import { fetchOwnerShop } from '../utils/shopUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import {
  ArrowLeft,
  Receipt
} from 'lucide-react';

import type { Expense, ExpenseUserSummary } from '../types/api';

  // Clean, working Expenses page with Expenses and Summary tabs (settlements removed)

  // SettlementCard and SettlementDialog removed - settlements functionality removed


export default function Expenses() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'summary'>('expenses');
  const [recoverableExpensesPage, setRecoverableExpensesPage] = useState(1);

  // Example usage: render UserAmountsOwedTable with summary and recoverableExpenses
  // <UserAmountsOwedTable summary={summary} recoverableExpenses={recoverableExpenses} />
  const REASONS = [
    { value: 'food', label: 'Food' },
    { value: 'tea', label: 'Tea' },
    { value: 'transport', label: 'Transport' },
    { value: 'advance', label: 'Advance' }
  ];
  const transactionStoreGetUsers = useTransactionStore(state => state.getUsers);
  const transactionStoreSetUsers = useTransactionStore(state => state.setUsers);
  const { toast } = useToast();
  const { user } = useAuth();
  const storeShop = useTransactionStore(state => state.shop);
  const setStoreShop = useTransactionStore(state => state.setShop);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    reason: '',
    userId: '',
    amount: '',
    description: ''
  });
  const [recoverableExpenses, setRecoverableExpenses] = useState<Expense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseUserSummary[]>([]);
  // Removed unused shopExpenses state
  const [isLoading, setIsLoading] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Pagination for recoverable expenses
  const RECOVERABLE_ITEMS_PER_PAGE = 5;
  const totalRecoverablePages = Math.ceil(recoverableExpenses.length / RECOVERABLE_ITEMS_PER_PAGE);
  const recoverableStartIndex = (recoverableExpensesPage - 1) * RECOVERABLE_ITEMS_PER_PAGE;
  const recoverableEndIndex = recoverableStartIndex + RECOVERABLE_ITEMS_PER_PAGE;
  const currentRecoverableExpenses = recoverableExpenses.slice(recoverableStartIndex, recoverableEndIndex);

  // Reset recoverable expenses page when data changes
  useEffect(() => {
    setRecoverableExpensesPage(1);
  }, [recoverableExpenses.length]);

  const handleRecoverablePageChange = (page: number) => {
    setRecoverableExpensesPage(page);
  };

  // Helper function for pagination display
  const getRecoverablePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalRecoverablePages <= maxVisiblePages) {
      for (let i = 1; i <= totalRecoverablePages; i++) {
        pages.push(i);
      }
    } else {
      if (recoverableExpensesPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalRecoverablePages);
      } else if (recoverableExpensesPage >= totalRecoverablePages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalRecoverablePages - 3; i <= totalRecoverablePages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = recoverableExpensesPage - 1; i <= recoverableExpensesPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalRecoverablePages);
      }
    }
    return pages;
  };

    useEffect(() => {
      // If storeShop is missing but user.shop_id exists, set it globally
      if (!storeShop && user?.shop_id) {
        // Create a minimal Shop object with required fields
        setStoreShop({
          id: user.shop_id,
          name: '',
          owner_id: user.id,
          address: '',
          contact: '',
          created_at: '',
          updated_at: '',
          status: 'active'
        });
      }
    }, [user?.shop_id, user?.id, storeShop]);

    useEffect(() => {
      // Load users into transaction store when storeShop changes
      // Use selector functions to avoid re-running due to store object identity changes
      if (storeShop?.id) {
        const shopIdStr = String(storeShop.id);
        let users = transactionStoreGetUsers(shopIdStr);
        if (!users || users.length === 0) {
          (async () => {
            try {
              // Prefer the dedicated users endpoint to fetch users for the shop
              const usersRes = await usersApi.getAll({ shop_id: storeShop.id });
              users = usersRes.data || [];
            } catch {
              // Fallback to empty array on error
              users = [];
            }
            transactionStoreSetUsers(shopIdStr, users);
          })();
        }
      }
    }, [storeShop?.id, transactionStoreGetUsers, transactionStoreSetUsers]);

    // Set storeShop when user changes
    useEffect(() => {
      let cancelled = false;
      const getShop = async () => {
        if (user?.id && user?.shop_id) {
          const shop = await fetchOwnerShop(user.id, user.shop_id);
          if (!cancelled) setStoreShop(shop);
        }
      };
      getShop();
      return () => { cancelled = true; };
    }, [user?.id, user?.shop_id]);

    // Only fetch data when storeShop is set (and not null)
    // Only fetch data for the active tab
    const fetchData = useCallback(async () => {
      if (!user?.id || !storeShop?.id) return;
      setIsLoading(true);
      try {
        if (activeTab === 'expenses') {
          // Expenses (fetch from expense API)
          const expensesRes = await expenseApi.getExpenses(storeShop.id);
          const expensesData = expensesRes?.data || [];
          setExpenses(expensesData);
        } else if (activeTab === 'summary') {
          // Expense summary (fetch detailed breakdown by user)
          const summaryRes = await expenseApi.getExpenseSummary(storeShop.id);
          const summaryData = summaryRes?.data || [];
          setExpenseSummary(summaryData);
          
          // Also fetch pending expenses for the recoverable expenses section
          const expensesRes = await expenseApi.getExpenses(storeShop.id);
          const expensesData = expensesRes?.data || [];
          setRecoverableExpenses(expensesData.filter(exp => exp.status === 'pending'));
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error && typeof error === 'object' && error && 'message' in error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : 'Failed to fetch expenses',
          variant: 'destructive'
        });
  // ...removed log...
      } finally {
        setIsLoading(false);
      }
    }, [user?.id, storeShop?.id, activeTab, toast]);

    useEffect(() => {
      if (!storeShop?.id) return;
      // Only fetch for the active tab and its relevant filters
      if (activeTab === 'expenses' || activeTab === 'summary') {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
          fetchData();
        }, 150); // 150ms debounce
      }
      return () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      };
    }, [storeShop?.id, activeTab, refreshFlag, fetchData]);

    // Add Expense
    const handleAddExpense = async () => {
      if (!storeShop?.id || !expenseForm.amount || !expenseForm.description || !expenseForm.userId) {
        // Required fields missing
        return;
      }
      setIsLoading(true);
      try {
        await expenseApi.addExpense({
          shop_id: storeShop.id,
          user_id: Number(expenseForm.userId),
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description
        });
        setExpenseForm({ reason: '', userId: '', amount: '', description: '' });
        setRefreshFlag(f => !f);
        toast({
          title: 'Expense Added',
          description: 'Expense has been successfully recorded.',
          variant: 'success'
        });
      } catch (error) {
        const errMsg = error && typeof error === 'object' && 'message' in error ? (error as { message?: string }).message : 'Failed to add expense';
        toast({
          title: 'Error',
          description: errMsg,
          variant: 'destructive'
        });
  // ...removed log...
      } finally {
        setIsLoading(false);
      }
    };

    if (!user || user.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Owner role required.",
        variant: "destructive",
      });
      return <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">Owner role required to access this page.</p>
        </div>
      </div>;
    }
    if (!user.shop_id) {
      toast({
        title: "Setup Required",
        description: "No shop assigned to your account. Please contact support or your administrator.",
        variant: "destructive",
      });
      return <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Setup Required</h2>
          <p className="text-gray-600">No shop assigned to your account. Please contact support.</p>
        </div>
      </div>;
    }

    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="ghost" size="sm" className="md:hidden">
              <Link to="/owner">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Expenses</h1>
            </div>
          </div>
          <p className="text-muted-foreground">
            Manage daily expenses paid to farmers. Use payments to settle outstanding balances.
          </p>
        </div>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <ExpenseSummaryDashboard expenseSummary={expenseSummary} />
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Daily Expense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!storeShop?.id && (
                  <div className="text-red-600 text-sm mb-2">Shop not loaded. Please wait or check your account.</div>
                )}
                <ExpenseForm
                  expenseForm={expenseForm}
                  setExpenseForm={setExpenseForm}
                  handleAddExpense={handleAddExpense}
                  isLoading={isLoading}
                  reasons={REASONS}
                  storeShop={storeShop}
                />
              </CardContent>
            </Card>

            {/* List all expenses */}
            <ExpensesTable expenses={expenses} />
          </TabsContent>

          {/* Outstanding Recoverable Expenses */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Outstanding Recoverable Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Only show recoverable expenses if summary tab is active */}
              {activeTab === 'summary' && (
                recoverableExpenses.length === 0 ? (
                  <div>No outstanding recoverable expenses.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Pending</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell className="text-right">Balance</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRecoverableExpenses.map((exp, idx) => (
                        <TableRow key={exp.id || idx}>
                          <TableCell>{'username' in exp && typeof exp.username === 'string' ? exp.username : ''}</TableCell>
                          <TableCell className="capitalize">{'user_type' in exp && typeof exp.user_type === 'string' ? exp.user_type : ''}</TableCell>
                          <TableCell>{'pending_count' in exp && typeof exp.pending_count === 'number' ? exp.pending_count : ''}</TableCell>
                          <TableCell>{exp.amount}</TableCell>
                          <TableCell className="text-right font-semibold"></TableCell>
                          <TableCell>{exp.status}</TableCell>
                          <TableCell>
                            {exp.status}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
              {/* Pagination for recoverable expenses */}
              {activeTab === 'summary' && recoverableExpenses.length > RECOVERABLE_ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {recoverableStartIndex + 1}-{Math.min(recoverableEndIndex, recoverableExpenses.length)} of {recoverableExpenses.length} expenses
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => recoverableExpensesPage > 1 && handleRecoverablePageChange(recoverableExpensesPage - 1)}
                          className={recoverableExpensesPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {getRecoverablePageNumbers().map((page, index) => (
                        <PaginationItem key={index}>
                          {page === '...' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => handleRecoverablePageChange(page as number)}
                              isActive={page === recoverableExpensesPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => recoverableExpensesPage < totalRecoverablePages && handleRecoverablePageChange(recoverableExpensesPage + 1)}
                          className={recoverableExpensesPage >= totalRecoverablePages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          )}
        </Tabs>
      </div>
    );
  }