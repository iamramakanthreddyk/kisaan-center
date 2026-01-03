import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const Login: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(formData.username, formData.password);
    // After successful login, navigate based on user role
    // The login function updates the auth context, so we can check error to know if it succeeded
    if (!error) {
      // Small delay to ensure auth state is updated
      setTimeout(() => {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user?.role === 'owner') {
              navigate('/simple-ledger', { replace: true });
            } else if (user?.role === 'superadmin') {
              navigate('/superadmin', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch {
            navigate('/dashboard', { replace: true });
          }
        }
      }, 50);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight">Login to KisaanCenter</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block mb-1 text-sm font-medium text-foreground">Username</label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-foreground">Password</label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && <div className="text-destructive text-sm text-center font-medium">{error}</div>}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
