// Utility to format ISO date string as DD/MM/YYYY
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
