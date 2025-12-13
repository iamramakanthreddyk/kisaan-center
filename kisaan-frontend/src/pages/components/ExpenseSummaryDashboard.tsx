import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
  BarChart3,
  User
} from 'lucide-react';
import type { ExpenseUserSummary } from '../../types/api';

interface ExpenseSummaryDashboardProps {
  expenseSummary: ExpenseUserSummary[];
}

const ExpenseSummaryDashboard: React.FC<ExpenseSummaryDashboardProps> = ({ expenseSummary }) => {
  // Calculate totals
  const totalExpenses = expenseSummary.reduce((sum, user) => sum + user.total_expense_amount, 0);
  const totalPendingCount = expenseSummary.reduce((sum, user) => sum + user.pending_count, 0);
  const totalSettledCount = expenseSummary.reduce((sum, user) => sum + (user.total_expense_amount > 0 ? 1 : 0) - user.pending_count, 0);
  const totalOutstanding = expenseSummary.reduce((sum, user) => sum + (user.balance < 0 ? Math.abs(user.balance) : 0), 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-gray-500">All time expenses paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Expenses</p>
                <p className="text-2xl font-bold text-orange-600">{totalPendingCount}</p>
                <p className="text-xs text-gray-500">Expenses awaiting settlement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Settled Expenses</p>
                <p className="text-2xl font-bold text-green-600">{totalSettledCount}</p>
                <p className="text-xs text-gray-500">Fully paid expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Outstanding Amount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                <p className="text-xs text-gray-500">Amount owed to users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User-wise Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Expense Breakdown by User
          </CardTitle>
          <p className="text-sm text-gray-600">
            Detailed view of expenses, balances, and settlement status for each user
          </p>
        </CardHeader>
        <CardContent>
          {expenseSummary.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expense data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Total Expenses</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Pending Expenses</TableHead>
                  <TableHead>Settlement Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseSummary.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        user.role === 'farmer' ? 'border-green-500 text-green-700' :
                        user.role === 'buyer' ? 'border-blue-500 text-blue-700' :
                        'border-gray-500 text-gray-700'
                      }>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(user.total_expense_amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${user.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(user.balance)}
                      </span>
                      <div className="text-xs text-gray-500">
                        {user.balance >= 0 ? 'Credit (Shop owes)' : 'Debit (User owes)'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${user.pending_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {user.pending_count}
                      </span>
                      <div className="text-xs text-gray-500">
                        {user.pending_count === 0 ? 'All settled' : 'Pending settlement'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.pending_count === 0 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Fully Settled
                        </Badge>
                      ) : user.pending_count > 0 && user.balance < 0 ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Partial Settlement
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Outstanding
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSummaryDashboard;