import type { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  UsersRound, 
  CreditCard, 
  Wallet, 
  BarChart4, 
  ReceiptText, 
  ShoppingBasket, 
  Settings2, 
  Building2, 
  FolderTree, 
  LinkIcon, 
  Package2,
  Home,
  Zap,
  BookOpen
} from 'lucide-react';

// Canonical roles used internally (lowercase)
export type AppRole = 'superadmin' | 'owner' | 'employee' | 'farmer' | 'buyer';

export interface AppNavItem {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  roles: AppRole[]; // Which roles see this item
  exact?: boolean;  // If true, active only on exact match
  quick?: boolean;  // Eligible for quick actions section (mobile etc.)
  order?: number;   // Sorting weight (lower first)
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

// Single source of truth for navigation items across sidebar, mobile navigation, etc.
// NOTE: Keep list sorted by order then label for consistency.
export const NAV_ITEMS: AppNavItem[] = [
  // Owner
  { key: 'owner-dashboard', label: 'Overview', href: '/owner', icon: LayoutDashboard, roles: ['owner'], exact: true, order: 10 },
  { key: 'simple-transactions', label: '⚡ Quick Sale', href: '/simple-transactions', icon: Zap, roles: ['owner', 'employee'], order: 15, quick: true },
  { key: 'owner-transactions', label: 'Transaction History', href: '/transactions', icon: ArrowRightLeft, roles: ['owner'], order: 20, quick: true },
  { key: 'owner-users', label: 'Team Members', href: '/users', icon: UsersRound, roles: ['owner'], order: 30 },
  { key: 'owner-payments', label: 'Payment Management', href: '/payments', icon: CreditCard, roles: ['owner'], order: 40, quick: true },
  { key: 'owner-balance', label: 'Account Balance', href: '/balance', icon: Wallet, roles: ['owner'], order: 50 },
  { key: 'owner-reports', label: 'Analytics & Reports', href: '/reports', icon: BarChart4, roles: ['owner'], order: 60 },
  { key: 'owner-expenses', label: 'Expense Tracking', href: '/expenses', icon: ReceiptText, roles: ['owner'], order: 65 },
  { key: 'owner-products', label: 'Product Catalog', href: '/products', icon: ShoppingBasket, roles: ['owner'], order: 70, quick: true },
  { key: 'owner-simple-ledger', label: 'Simple Ledger', href: '/simple-ledger', icon: BookOpen, roles: ['owner'], order: 75, quick: true },
  { key: 'owner-settings', label: 'Shop Settings', href: '/settings', icon: Settings2, roles: ['owner'], order: 80 },

  // Superadmin
  { key: 'superadmin-dashboard', label: 'System Overview', href: '/superadmin', icon: LayoutDashboard, roles: ['superadmin'], exact: true, order: 10 },
  { key: 'superadmin-shops', label: 'Shop Management', href: '/superadmin/shops', icon: Building2, roles: ['superadmin'], order: 20 },
  { key: 'superadmin-users', label: 'User Management', href: '/superadmin/users', icon: UsersRound, roles: ['superadmin'], order: 30 },
  // Plans management moved to public pricing page at /pricing
  { key: 'superadmin-categories', label: 'Product Categories', href: '/superadmin/categories', icon: FolderTree, roles: ['superadmin'], order: 40 },
  { key: 'superadmin-assign-products', label: 'Product Assignment', href: '/superadmin/shop-products', icon: LinkIcon, roles: ['superadmin'], order: 50 },
  { key: 'superadmin-reports', label: 'System Reports', href: '/superadmin/reports', icon: BarChart4, roles: ['superadmin'], order: 60 },
  { key: 'superadmin-products', label: 'Global Products', href: '/superadmin/products', icon: Package2, roles: ['superadmin'], order: 70 },
  { key: 'superadmin-settings', label: 'System Settings', href: '/superadmin/settings', icon: Settings2, roles: ['superadmin'], order: 80 },

  // Employee / Farmer / Buyer generic dashboard
  { key: 'generic-dashboard', label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['employee', 'farmer', 'buyer'], order: 10 },
  { key: 'employee-products', label: 'Product Catalog', href: '/products', icon: ShoppingBasket, roles: ['employee'], order: 50 },
];

// Helper: Normalize role (case-insensitive) from backend user object
export function normalizeRole(role: string | undefined | null): AppRole | undefined {
  if (!role) return undefined;
  const r = role.toLowerCase();
  if (['superadmin','owner','employee','farmer','buyer'].includes(r)) return r as AppRole;
  return undefined;
}

export function getVisibleNavItems(role: AppRole | undefined, opts?: { includeQuick?: boolean }) {
  return NAV_ITEMS
    .filter(item => role && item.roles.includes(role))
    .filter(item => (opts?.includeQuick ? true : !item.quick))
    .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getQuickActions(role: AppRole | undefined) {
  return NAV_ITEMS.filter(i => i.quick && role && i.roles.includes(role));
}

export function isActive(pathname: string, item: AppNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

// Simple integrity check (can be used in a test)
export function validateNavConfig() {
  const keys = new Set<string>();
  for (const item of NAV_ITEMS) {
    if (keys.has(item.key)) throw new Error('Duplicate nav key: ' + item.key);
    keys.add(item.key);
    if (!item.label || !item.href) throw new Error('Invalid nav item (missing label/href): ' + item.key);
  }
  return true;
}
