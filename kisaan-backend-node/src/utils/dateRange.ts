export interface DateRangeOptions {
  start?: string | Date;
  end?: string | Date;
  defaultToToday?: boolean;
}

export interface NormalizedDateRange {
  start: Date;
  end: Date;
}

function normalizeInput(input: string | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

export function normalizeDateRange(opts: DateRangeOptions): NormalizedDateRange | null {
  let { start, end } = opts;
  // If missing, default to today full day
  if (!start || !end) {
    if (!opts.defaultToToday) return null;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    start = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
    end = `${yyyy}-${mm}-${dd}T23:59:59.999Z`;
  }
  // If input is date-only string (YYYY-MM-DD), expand to full day
  const expandToFullDay = (d: string | Date, isStart: boolean) => {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return isStart
        ? new Date(`${d}T00:00:00.000Z`)
        : new Date(`${d}T23:59:59.999Z`);
    }
    return normalizeInput(d);
  };
  const startDate = expandToFullDay(start, true);
  const endDate = expandToFullDay(end, false);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  return { start: startDate, end: endDate };
}
