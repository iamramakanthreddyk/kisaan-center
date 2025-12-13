// Centralized user display name helper
// Usage: getUserDisplayName(user) or getUserDisplayNameById(users, id)
import type { User } from '../types/api';


export function getUserDisplayName(user: User | undefined | null): string {
  if (!user) return '';
  return user.firstname && user.firstname.trim() ? user.firstname : user.username;
}

// Centralized display: Name (role) [ID]
export function getUserDisplayWithRoleAndId(user: User | undefined | null): string {
  if (!user) return '';
  const name = user.firstname && user.firstname.trim() ? user.firstname : user.username || 'Unknown';
  const role = user.role ? `(${user.role})` : '';
  const id = user.id ? `[${user.id}]` : '';
  return `${name} ${role} ${id}`.replace(/ +/g, ' ').trim();
}

export function getUserDisplayNameById(users: User[], id: string | number): string {
  const user = users.find(u => String(u.id) === String(id));
  return getUserDisplayName(user);
}
