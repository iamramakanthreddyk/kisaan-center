import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const OwnerSettings: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [commission, setCommission] = useState('');
  const [commissionMessage, setCommissionMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current commission rate for the shop
    const fetchCommission = async () => {
      if (!user?.shop_id) return;
      try {
        const res = await apiClient.get<{ data: { id: number; rate: string }[] | { id: number; rate: string } }>(`/commissions?shop_id=${user.shop_id}`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCommission(res.data[0].rate);
        } else if (res.data && (res.data as { rate?: string }).rate) {
          setCommission((res.data as { rate: string }).rate);
        }
      } catch {
        setCommission('');
      }
    };
    fetchCommission();
  }, [user]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    if (!user) {
      setPasswordMessage('User not found.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/users/${user.id}/reset-password`, {
        currentPassword,
        newPassword
      });
      setPasswordMessage('Password updated successfully. Please log in again.');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message) {
        setPasswordMessage((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update password.');
      } else {
        setPasswordMessage('Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommissionMessage('');
    if (!commission || isNaN(Number(commission))) {
      setCommissionMessage('Enter a valid commission rate.');
      return;
    }
    if (!user) {
      setCommissionMessage('User not found.');
      return;
    }
    setLoading(true);
    try {
      // Fetch all commissions for shop
      const res = await apiClient.get<{ data: { id: number; rate: string }[] | { id: number; rate: string } }>(`/commissions?shop_id=${user.shop_id}`);
      let commissionId: number | null = null;
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Pick the latest commission (highest id)
        const latest = res.data.sort((a, b) => Number(b.id) - Number(a.id))[0];
        commissionId = latest.id;
      } else if (res.data && (res.data as { id?: number }).id) {
        commissionId = (res.data as { id: number }).id;
      }
      if (!commissionId) {
        setCommissionMessage('No commission record found to update.');
        setLoading(false);
        return;
      }
      await apiClient.put(`/commissions/${commissionId}`, {
        rate: Number(commission),
        type: 'percentage'
      });
      setCommissionMessage('Commission rate updated successfully.');
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message) {
        setCommissionMessage((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update commission.');
      } else {
        setCommissionMessage('Failed to update commission.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold mb-4">Owner Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-3">
            <Input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
            {passwordMessage && (
              <div className={passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}>{passwordMessage}</div>
            )}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change Shop Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCommissionChange} className="space-y-3">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Commission Rate (%)"
              value={commission}
              onChange={e => setCommission(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Commission'}
            </Button>
            {commissionMessage && (
              <div className={commissionMessage.includes('success') ? 'text-green-600' : 'text-red-600'}>{commissionMessage}</div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSettings;
