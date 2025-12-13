export type UserRole = 'owner' | 'farmer' | 'buyer' | string;

export const getRoleBadgeClass = (role: UserRole) => {
  if (role === 'owner') {
    return 'bg-orange-100 text-orange-800 border border-orange-400 font-bold rounded-full px-3 py-1 shadow-sm';
  }
  if (role === 'farmer') {
    return 'bg-blue-100 text-blue-800 font-semibold rounded-full px-3 py-1 border border-blue-300 shadow-sm';
  }
  if (role === 'buyer') {
    return 'bg-purple-100 text-purple-800 font-semibold rounded-full px-3 py-1 border border-purple-300 shadow-sm';
  }
  return 'bg-gray-100 text-gray-800 rounded-full px-3 py-1 border border-gray-300 shadow-sm';
};
