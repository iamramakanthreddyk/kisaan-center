import { getUserDisplayWithRoleAndId } from '../utils/userDisplayName';
import React, { useEffect, useState } from 'react';
import type { User } from '../types/api';
import { useTransactionStore } from '../store/transactionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { creditAdvanceApi } from '../services/creditAdvanceApi';

const CreditAdvanceManagement: React.FC = () => {
  const transactionStore = useTransactionStore();
  const [shopId, setShopId] = useState<string>('');
  const [users, setUsers] = useState<User[]>(shopId ? transactionStore.getUsers(String(shopId)) : []);
  const fetchUsersZustand = async () => {
    if (!shopId) return;
    try {
  const response = await import('../services/api').then(m => m.usersApi.getAll({ shop_id: Number(shopId), limit: 100 }));
  const userList: User[] = Array.isArray(response.data) ? response.data : [];
  const filteredUsers = userList.filter((u) => ['farmer', 'buyer'].includes(u.role));
  setUsers(filteredUsers);
  transactionStore.setUsers(String(shopId), filteredUsers);
    } catch {
      setUsers([]);
      transactionStore.setUsers(String(shopId), []);
    }
  };
  useEffect(() => {
    if (shopId && users.length === 0) {
      fetchUsersZustand();
    }
  }, [shopId]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  type CreditAdvance = {
    id: number | string;
    amount: number;
    repaid_amount: number;
    status: string;
    issued_date?: string;
    due_date?: string;
    user_id?: string | number;
  };
  const [credits, setCredits] = useState<CreditAdvance[]>([]);
  // Filter credits by selected user
  const filteredCredits = selectedUser ? credits.filter(c => String(c.user_id) === selectedUser) : credits;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Issue credit form
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Repay credit form
  const [repayAmount, setRepayAmount] = useState('');
  const [repayCreditId, setRepayCreditId] = useState('');

  const fetchCredits = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await creditAdvanceApi.getAll(shopId);
      setCredits(Array.isArray(res) ? (res as CreditAdvance[]) : []);
    } catch {
      setError('Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleIssueCredit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        user_id: userId,
        shop_id: shopId,
        amount: parseFloat(amount),
        issued_date: issuedDate,
        due_date: dueDate,
      };
      const res = await creditAdvanceApi.issue(payload);
      if (res && (res as { success?: boolean; data?: unknown }).success || (res as { data?: unknown }).data) {
        setSuccess('Credit issued successfully');
        fetchCredits();
        setUserId(''); setShopId(''); setAmount(''); setIssuedDate(''); setDueDate('');
      } else {
        setError((res as { error?: string; message?: string })?.error || (res as { message?: string })?.message || 'Failed to issue credit');
      }
    } catch {
      setError('Failed to issue credit');
    } finally {
      setLoading(false);
    }
  };

  const handleRepayCredit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        credit_id: parseInt(repayCreditId),
        amount: parseFloat(repayAmount),
      };
      const res = await creditAdvanceApi.repay(payload);
      if (res && (res as { success?: boolean; data?: unknown }).success || (res as { data?: unknown }).data) {
        setSuccess('Repayment successful');
        fetchCredits();
        setRepayCreditId(''); setRepayAmount('');
      } else {
        setError((res as { error?: string; message?: string })?.error || (res as { message?: string })?.message || 'Failed to repay credit');
      }
    } catch {
      setError('Failed to repay credit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
  <h1 className="text-3xl font-bold mb-4">Advance Management</h1>
      <Card>
        <CardHeader>
          <CardTitle style={{whiteSpace: 'nowrap'}}>Select User</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose user" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {getUserDisplayWithRoleAndId(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Issue Advance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-2">
            <Input placeholder="User ID" value={selectedUser} disabled />
            <Input placeholder="Shop ID" value={shopId} onChange={e => setShopId(e.target.value)} />
            <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <Input placeholder="Issued Date (YYYY-MM-DD)" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            <Input placeholder="Due Date (YYYY-MM-DD)" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <Button onClick={handleIssueCredit} disabled={loading || !selectedUser}>Issue</Button>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">{success}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Repay Advance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-2">
            <Select value={repayCreditId} onValueChange={setRepayCreditId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Credit" />
              </SelectTrigger>
              <SelectContent>
                {filteredCredits.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={String(c.id)} value={String(c.id)}>
                    {`Credit #${c.id} - ₹${c.amount}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Amount" type="number" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} />
            <Button onClick={handleRepayCredit} disabled={loading || !repayCreditId || !repayAmount}>Repay</Button>
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">{success}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Advances for Selected User</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div>Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Repaid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredits.map(c => (
                  <TableRow key={String(c.id)}>
                    <TableCell>{String(c.id)}</TableCell>
                    <TableCell>₹{c.amount}</TableCell>
                    <TableCell>₹{c.repaid_amount}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{c.issued_date ? String(c.issued_date).slice(0,10) : '-'}</TableCell>
                    <TableCell>{c.due_date ? String(c.due_date).slice(0,10) : '-'}</TableCell>
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

export default CreditAdvanceManagement;
