import { create } from 'zustand';
import type { Transaction, Shop, User } from '../types/api';

/**
 * TransactionState keeps lightweight cached slices keyed by shop & date to avoid
 * refetching daily transaction lists and associated user lists.
 * Invalidation removes only specific date buckets to preserve other cached days.
 */
interface TransactionState {
  /** shopId -> date(YYYY-MM-DD) -> transactions */
  transactionsByShopAndDate: Record<string, Record<string, Transaction[]>>;
  /** shopId -> users for that shop (farmer/buyer subsets derived by filtering) */
  usersByShop: Record<string, User[]>;
  /** currently selected / context shop */
  shop: Shop | null;
  setShop: (shop: Shop | null) => void;
  getShop: () => Shop | null;
  setTransactions: (shopId: string, date: string, txns: Transaction[]) => void;
  getTransactions: (shopId: string, dates: string[]) => Transaction[];
  setUsers: (shopId: string, users: User[]) => void;
  getUsers: (shopId: string) => User[];
  clearStore: () => void;
  invalidateTransactions: (shopId: string, dates: string[]) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactionsByShopAndDate: {},
  usersByShop: {},
  shop: null,
  setShop: (shop) => set({ shop }),
  getShop: () => get().shop,
  setTransactions: (shopId, date, txns) => set(state => ({
    transactionsByShopAndDate: {
      ...state.transactionsByShopAndDate,
      [shopId]: {
        ...(state.transactionsByShopAndDate[shopId] || {}),
        [date]: txns
      }
    }
  })),
  getTransactions: (shopId, dates) => {
    const shopData = get().transactionsByShopAndDate[shopId] || {};
    return dates.flatMap(date => shopData[date] || []);
  },
  setUsers: (shopId, users) => set(state => ({
    usersByShop: {
      ...state.usersByShop,
      [shopId]: users
    }
  })),
  getUsers: (shopId) => get().usersByShop[shopId] || [],
  clearStore: () => set({ transactionsByShopAndDate: {}, usersByShop: {} }),
  invalidateTransactions: (shopId: string, dates: string[]) => set(state => {
    const updated = { ...state.transactionsByShopAndDate };
    if (updated[shopId]) {
      dates.forEach(date => { delete updated[shopId][date]; });
      // Prune empty shop bucket to free memory
      if (Object.keys(updated[shopId]).length === 0) {
        delete updated[shopId];
      }
    }
    return { transactionsByShopAndDate: updated };
  })
}));

// ------------------ Selectors (for optimal subscription granularity) ------------------
export const selectShop = (s: TransactionState) => s.shop;
export const selectUsersForShop = (shopId: string) => (s: TransactionState) => s.usersByShop[shopId] || [];
export const selectTransactionsForShopDates = (shopId: string, dates: string[]) => (s: TransactionState) => {
  const shopData = s.transactionsByShopAndDate[shopId] || {};
  return dates.flatMap(d => shopData[d] || []);
};

/** Convenience: build a memo-friendly key for caching derived selectors externally if needed */
export const buildTxnCacheKey = (shopId: string, dates: string[]) => `${shopId}::${dates.sort().join(',')}`;
