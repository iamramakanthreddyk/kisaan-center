import { createContext } from 'react';
import type { User } from '../types/api';
import type { Dispatch, SetStateAction } from 'react';

type UsersContextType = {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  total: number;
  setTotal: Dispatch<SetStateAction<number>>;
  allUsers: User[];
  refreshUsers: (force?: boolean) => Promise<void>;
  allUsersFetched: boolean;
};

export const UsersContext = createContext<UsersContextType | undefined>(undefined);