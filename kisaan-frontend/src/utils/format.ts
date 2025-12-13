// Shared formatting utilities for numbers, currency, percentages, etc.

export function formatNumber(value: number | null | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, ...opts }).format(value);
}


/**
 * Formats a number as INR currency (₹1,234.56) by default.
 * @param value The number to format
 * @param currency The currency code (default: 'INR')
 * @param options Intl.NumberFormat options (optional)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'INR',
  options?: Intl.NumberFormatOptions
) {
  if (value === null || value === undefined || isNaN(value)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(fractionDigits)}%`;
}
