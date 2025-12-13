
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { usersApi } from '../services/api';
import type { User } from '../types/api';
import { UsersContext } from './UsersContextExport';





interface UsersProviderProps {
  children: React.ReactNode;
}

export const UsersProvider: React.FC<UsersProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]); // filtered/paged users
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const backendTotal = useRef<number>(0);
  const [allUsersFetched, setAllUsersFetched] = useState(false);

  // Fetch all users (large limit, e.g. 1000)
  const refreshUsers = async (force = false) => {
    if (!isAuthenticated) {
      setAllUsers([]);
      setUsers([]);
      setIsLoading(false);
      setTotal(0);
      backendTotal.current = 0;
      return;
    }
    setIsLoading(true);
    try {
      // Only fetch if forced or on initial load
      if (force || allUsers.length === 0) {
        const limit = 100;
        let page = 1;
  let allFetchedUsers: User[] = [];
        let total = 0;
        let done = false;
        while (!done) {
          const response = await usersApi.getAll({ page, limit });
          // ...removed log...
          if (response.data && response.data.length > 0) {
            allFetchedUsers = allFetchedUsers.concat(response.data);
          }
          total = response.total ?? allFetchedUsers.length;
          // If less than limit returned, or we've reached/exceeded total, stop
          if (!response.data || response.data.length < limit || allFetchedUsers.length >= total) {
            done = true;
          } else {
            page++;
          }
        }
  setAllUsers(allFetchedUsers);
        setTotal(total);
        setAllUsersFetched(allFetchedUsers.length >= total);
        setTimeout(() => {
          // ...removed log...
        }, 0);
      }
  } catch {
      setAllUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter, paginate users on the frontend
  useEffect(() => {
    const filtered = allUsers;
    // Optionally, you can add more filters here (e.g., role, search) via context if needed
    setTotal(filtered.length);
    const start = (page - 1) * pageSize;
    setUsers(filtered.slice(start, start + pageSize));
  }, [allUsers, page, pageSize]);

  // Fetch all users ONCE on init, using useRef to prevent re-fetches
  const initFetchDone = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !initFetchDone.current) {
      initFetchDone.current = true;
      // Get user from AuthContext
      const authUser = (typeof window !== 'undefined' && window.localStorage.getItem('auth_user')) ? JSON.parse(window.localStorage.getItem('auth_user')!) : null;
      if (authUser?.role !== 'farmer') {
        refreshUsers(true);
      } else {
        setAllUsers([]);
        setUsers([]);
        setIsLoading(false);
        setTotal(0);
        setAllUsersFetched(false);
      }
    } else if (!isAuthenticated) {
      initFetchDone.current = false;
      setAllUsers([]);
      setUsers([]);
      setIsLoading(false);
      setTotal(0);
      setAllUsersFetched(false);
    }
  }, [isAuthenticated]);

  return (
    <UsersContext.Provider value={{
      users,
      setUsers,
      isLoading,
      setIsLoading,
      page,
      setPage,
      pageSize,
      setPageSize,
      total,
      setTotal,
      allUsers,
      refreshUsers,
      allUsersFetched
    }}>
      {children}
    </UsersContext.Provider>
  );
}
