// General utility functions for frontend

export function classNames(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
// Export 'classNames' as 'cn' for compatibility
export { classNames as cn };
