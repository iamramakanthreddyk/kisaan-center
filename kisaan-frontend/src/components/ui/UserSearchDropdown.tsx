
import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import type { User } from '../../types/api';
import { useUsers } from '../../context/useUsers';
import { getUserDisplayWithRoleAndId } from '../../utils/userDisplayName';


interface UserSearchDropdownProps {
  onSelect: (user: User) => void;
  placeholder?: string;
  // Optional role filter to limit results (e.g., 'buyer' or 'farmer')
  roleFilter?: 'farmer' | 'buyer' | 'all';
}

export const UserSearchDropdown: React.FC<UserSearchDropdownProps> = ({ onSelect, placeholder, roleFilter = 'all' }) => {
  const { allUsers, isLoading } = useUsers();
  const [query, setQuery] = useState('');
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  let filtered: User[] = [];
  if (allUsers.length === 0) {
    filtered = [];
  } else {
    // apply role filter if provided
    const roleFiltered = roleFilter === 'all' ? allUsers : allUsers.filter(u => u.role === roleFilter);
    if (query.length === 0) {
      filtered = roleFiltered.slice(0, 10); // Show first 10 users when no query
    } else {
      filtered = roleFiltered.filter(
        u =>
          (u.firstname && u.firstname.toLowerCase().includes(query.toLowerCase())) ||
          (u.username && u.username.toLowerCase().includes(query.toLowerCase())) ||  
          (u.contact && u.contact.includes(query))
      );
    }
  }
  useEffect(() => {
    if (!show || filtered.length === 0) return;
    setActiveIndex(0);
  }, [show, query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
      scrollToActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
      scrollToActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        const user = filtered[activeIndex];
        setSelectedUser(user);
        onSelect(user);
        setShow(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setShow(false);
    }
  };

  const scrollToActive = () => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('.user-dropdown-active');
      if (activeEl && activeEl instanceof HTMLElement) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div className="relative w-56">
      <Input
        value={selectedUser ? getUserDisplayWithRoleAndId(selectedUser) : query}
        onChange={e => {
          setQuery(e.target.value);
          setSelectedUser(null);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Search user...'}
        className="w-full"
        autoComplete="off"
        readOnly={!!selectedUser}
      />
      {selectedUser && (
        <button
          type="button"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onClick={() => { setSelectedUser(null); onSelect(null as unknown as User); setQuery(''); setShow(false); }}
          aria-label="Clear selection"
        >
          ×
        </button>
      )}
      {isLoading && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded shadow p-2 text-gray-500 text-sm">Loading users...</div>
      )}
      {show && (query.length >= 2 || (!selectedUser && allUsers.length > 0)) && (
        <div ref={listRef} className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-2 text-gray-500">No users found</div>
          ) : (
            filtered.map((user, idx) => (
              <div
                key={user.id}
                className={
                  'p-2 cursor-pointer ' +
                  (idx === activeIndex ? 'bg-blue-100 user-dropdown-active' : 'hover:bg-blue-50')
                }
                onClick={() => { setSelectedUser(user); onSelect(user); setShow(false); setQuery(''); }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {getUserDisplayWithRoleAndId(user)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
