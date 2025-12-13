import React from 'react';

import { Input } from '../components/ui/input';
import { UserSearchDropdown } from '../components/ui/UserSearchDropdown';



  interface TransactionFiltersProps {
  filters: { search: string; user: string; from_date: string; to_date: string };
  setFilters: React.Dispatch<React.SetStateAction<{ search: string; user: string; from_date: string; to_date: string }>>;
  }


export const TransactionFilters: React.FC<TransactionFiltersProps> = ({ filters, setFilters }) => {
  // No effect: parent always controls date values
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center w-full sm:w-auto">
        <div className="relative flex-1 min-w-0">
          <Input
            placeholder="Search"
            value={filters.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters((prev: typeof filters) => ({ ...prev, search: e.target.value }))}
            className="pl-10 text-sm w-full sm:w-64"
          />
        </div>
        <div className="ml-2 w-56">
          <UserSearchDropdown
            onSelect={user => setFilters((prev: typeof filters) => ({ ...prev, user: user ? String(user.id) : '' }))}
            placeholder="Search and select user"
          />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <Input
          type="date"
          placeholder="From date"
          value={filters.from_date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setFilters((prev: typeof filters) => ({ ...prev, from_date: val }));
          }}
          className="text-sm w-32"
        />
        <span className="text-xs text-gray-500">to</span>
        <Input
          type="date"
          placeholder="To date"
          value={filters.to_date}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setFilters((prev: typeof filters) => ({ ...prev, to_date: val }));
          }}
          className="text-sm w-32"
        />
      </div>
    </div>
  );
};
