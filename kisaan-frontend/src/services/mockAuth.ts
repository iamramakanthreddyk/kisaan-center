/**
 * Mock authentication service for development
 * Provides dummy users for testing different roles
 */

import { User, UserRole } from '@/types';

// Mock users for testing
export const MOCK_USERS: Array<{
  username: string;
  password: string;
  user: User;
}> = [
  {
    username: 'owner',
    password: 'password',
    user: {
      id: '1',
      username: 'owner',
      role: 'OWNER' as UserRole,
      shop_id: '1',
      contact: '+91-9876543210',
      credit_limit: 0,
      status: 'active',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    username: 'farmer',
    password: 'password',
    user: {
      id: '2',
      username: 'farmer',
      role: 'FARMER' as UserRole,
      shop_id: '1',
      contact: '+91-9876543211',
      credit_limit: 50000,
      status: 'active',
      created_by: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    username: 'buyer',
    password: 'password',
    user: {
      id: '3',
      username: 'buyer',
      role: 'BUYER' as UserRole,
      shop_id: '1',
      contact: '+91-9876543212',
      credit_limit: 25000,
      status: 'active',
      created_by: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    username: 'employee',
    password: 'password',
    user: {
      id: '4',
      username: 'employee',
      role: 'EMPLOYEE' as UserRole,
      shop_id: '1',
      contact: '+91-9876543213',
      credit_limit: 0,
      status: 'active',
      created_by: '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  {
    username: 'superadmin',
    password: 'password',
    user: {
      id: '5',
      username: 'superadmin',
      role: 'SUPERADMIN' as UserRole,
      shop_id: null,
      contact: '+91-9876543214',
      credit_limit: 0,
      status: 'active',
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
];

/**
 * Mock authentication function
 * Simulates backend login process
 */
export const mockLogin = async (username: string, password: string): Promise<{
  user: User;
  access_token: string;
}> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const mockUser = MOCK_USERS.find(
    u => u.username === username && u.password === password
  );

  if (!mockUser) {
    throw new Error('Invalid username or password');
  }

  return {
    user: mockUser.user,
    access_token: `mock_token_${mockUser.user.id}_${Date.now()}`
  };
};

/**
 * Mock user validation
 * Simulates token validation
 */
export const mockValidateToken = async (token: string): Promise<User | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Extract user ID from mock token
  const tokenParts = token.split('_');
  if (tokenParts.length !== 3 || tokenParts[0] !== 'mock' || tokenParts[1] !== 'token') {
    return null;
  }

  const userId = tokenParts[2];
  const mockUser = MOCK_USERS.find(u => u.user.id === userId);
  
  return mockUser ? mockUser.user : null;
};