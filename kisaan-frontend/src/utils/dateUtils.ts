// src/utils/dateUtils.ts

import { formatDate } from './formatDate';
// Standard date utility functions for KisaanCenter

/**
 * Format a JS Date or ISO string to 'YYYY-MM-DD' (for input[type=date], API, etc.)
 */


/**
 * Format a JS Date or ISO string to 'DD-MM-YYYY' (for display)
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse a date string (any format) to JS Date
 */
export function parseDate(date: string): Date {
  return new Date(date);
}

/**
 * Get today's date as 'YYYY-MM-DD'
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * Add days to a date and return 'YYYY-MM-DD'
 */
export function addDays(date: Date | string, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(a: Date | string, b: Date | string): boolean {
  return formatDate(a) === formatDate(b);
}
