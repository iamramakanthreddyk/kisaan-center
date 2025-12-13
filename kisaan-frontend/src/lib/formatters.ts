// Utility functions for formatting values in the frontend

export function formatCurrency(value: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatQuantity(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    // Try ISO, fallback to parse
    date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      // Try parsing as number string
      const num = Number(dateInput);
      if (!isNaN(num)) {
        date = new Date(num);
      }
    }
  } else {
    return '-';
  }
  if (isNaN(date.getTime())) return '-';
  // Always return YYYY-MM-DD for input[type=date]
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// Utility functions for formatting values in the frontend
