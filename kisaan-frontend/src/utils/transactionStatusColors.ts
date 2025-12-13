// Transaction status to color mapping for global use
export const TRANSACTION_STATUS_COLORS: Record<string, string> = {
  'Buyer Due': 'bg-red-100 text-red-800',
  'Farmer Due': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-green-100 text-green-800',
  'pending': 'bg-yellow-100 text-yellow-800',
  'cancelled': 'bg-red-100 text-red-800',
  'default': 'bg-gray-100 text-gray-800',
};

export function getTransactionStatusColor(status: string): string {
  return TRANSACTION_STATUS_COLORS[status] || TRANSACTION_STATUS_COLORS['default'];
}
