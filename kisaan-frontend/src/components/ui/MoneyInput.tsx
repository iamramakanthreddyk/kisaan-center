import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

/**
 * MoneyInput
 * A controlled currency input that:
 * - Accepts a string or number value (major units) via `value`
 * - Emits raw number (major units) through `onValueChange`
 * - Formats display with fixed 2 decimals (configurable via `decimals`)
 * - Prevents non-numeric / multiple decimal input
 * - Optional min / max validation (inclusive)
 * - Provides `onValidityChange` callback when error state changes
 * - Accessible: ties error to input via aria-describedby, announces via aria-live
 */
export interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onValueChange?: (value: number) => void;
  onRawChange?: (raw: string) => void; // before parsing
  onValidityChange?: (valid: boolean) => void;
  minValue?: number;
  maxValue?: number;
  decimals?: number; // default 2
  allowNegative?: boolean; // default false
  /** Optional external error override (takes precedence over internal validation) */
  error?: string;
  /** Provide an id for the error message container (auto-generated if omitted) */
  errorId?: string;
  /** If true, do not format while typing (format on blur only) */
  deferFormatting?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onValueChange,
  onRawChange,
  onValidityChange,
  minValue,
  maxValue,
  decimals = 2,
  allowNegative = false,
  error,
  errorId,
  className,
  deferFormatting = false,
  onBlur,
  onFocus,
  ...rest
}) => {
  const [internalRaw, setInternalRaw] = useState(() => normalizeInitial(value));
  const [internalError, setInternalError] = useState<string | null>(null);
  const prevErrorRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync when external value changes (controlled usage)
  useEffect(() => {
    const normalized = normalizeInitial(value);
    if (normalized !== internalRaw) {
      setInternalRaw(normalized);
    }
  }, [value]);

  const effectiveError = error ?? internalError;

  useEffect(() => {
    if (effectiveError !== prevErrorRef.current) {
      onValidityChange?.(!effectiveError);
      prevErrorRef.current = effectiveError;
    }
  }, [effectiveError, onValidityChange]);

  // parsedNumber reserved for potential future display logic (currently unused)

  const validate = useCallback((raw: string) => {
    if (!raw.trim()) return null; // empty allowed unless minValue enforces > 0
    const num = parseRaw(raw, decimals);
    if (Number.isNaN(num)) return 'Invalid number';
    if (!allowNegative && num < 0) return 'Negative not allowed';
    if (minValue != null && num < minValue) return `Must be ≥ ${formatFixed(minValue, decimals)}`;
    if (maxValue != null && num > maxValue) return `Must be ≤ ${formatFixed(maxValue, decimals)}`;
    return null;
  }, [allowNegative, minValue, maxValue, decimals]);

  const formatDisplay = useCallback((raw: string) => {
    if (!raw) return '';
    const num = parseRaw(raw, decimals);
    if (Number.isNaN(num)) return raw; // show raw so user can correct
    return formatFixed(num, decimals);
  }, [decimals]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Strip invalid characters
    raw = raw.replace(/[^0-9.,-]/g, '');
    raw = raw.replace(/,/g, '.'); // unify decimal
    // Only one decimal point
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    if (!allowNegative) raw = raw.replace(/-/g, '');
    // Prevent leading zeros like 0005 (but allow 0.x)
    raw = normalizeLeadingZeros(raw);

    setInternalRaw(raw);
    onRawChange?.(raw);

    const err = validate(raw);
    setInternalError(err);

    if (!err) {
      const num = parseRaw(raw, decimals);
      if (!Number.isNaN(num)) {
        onValueChange?.(num);
      }
    }
  }, [allowNegative, decimals, onValueChange, onRawChange, validate]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (!deferFormatting) {
      setInternalRaw(prev => formatDisplay(prev));
    } else {
      // still enforce numeric formatting on blur
      setInternalRaw(prev => {
        const num = parseRaw(prev, decimals);
        return Number.isNaN(num) ? '' : formatFixed(num, decimals);
      });
    }
    onBlur?.(e);
  }, [decimals, deferFormatting, formatDisplay, onBlur]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Show raw without fixed trailing zeros when focusing for easier editing
    setInternalRaw(prev => {
      const num = parseRaw(prev, decimals);
      if (Number.isNaN(num)) return prev; // keep as is
      // Trim trailing zeros for editing clarity
      return trimTrailingZeros(num, decimals);
    });
    onFocus?.(e);
  }, [decimals, onFocus]);

  const describedBy = useMemo(() => {
    if (effectiveError && errorContainerId(errorId)) return errorContainerId(errorId);
    return rest['aria-describedby'];
  }, [effectiveError, errorId, rest]);

  return (
    <div className="space-y-1">
      <Input
        ref={inputRef}
        inputMode="decimal"
        {...rest}
        className={cn('text-right tabular-nums', className, effectiveError && 'border-red-500 focus-visible:ring-red-500')}
        value={internalRaw}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-invalid={!!effectiveError}
        aria-describedby={describedBy}
      />
      <div
        id={errorContainerId(errorId)}
        aria-live="polite"
        className={cn('min-h-[1.1rem] text-xs text-red-600', !effectiveError && 'opacity-0')}
      >
        {effectiveError || 'placeholder'}
      </div>
    </div>
  );
};

// Helpers
function normalizeInitial(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return String(v.toFixed(2));
  if (typeof v === 'string') return v;
  return '';
}

function parseRaw(raw: string, decimals: number): number {
  if (!raw) return NaN;
  if (raw === '.') return NaN;
  const num = Number(raw);
  if (Number.isNaN(num)) return NaN;
  // Round to decimals
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

function formatFixed(num: number, decimals: number): string {
  return num.toFixed(decimals);
}

function trimTrailingZeros(num: number, decimals: number): string {
  if (decimals === 0) return num.toString();
  let s = num.toFixed(decimals);
  // Remove trailing zeros and optional dot
  s = s.replace(/\.0+$/, ''); // fast path like 5.000 -> 5
  if (s.includes('.')) {
    s = s.replace(/(\.[0-9]*?)0+$/, '$1'); // 5.1200 -> 5.12
    s = s.replace(/\.$/, ''); // 5. -> 5
  }
  return s;
}

function normalizeLeadingZeros(raw: string): string {
  if (!raw) return raw;
  if (raw.startsWith('0') && !raw.startsWith('0.') && raw.length > 1 && !raw.includes('.')) {
    // reduce multiple leading zeros
    return String(Number(raw));
  }
  return raw;
}

function errorContainerId(custom?: string) {
  return custom || 'money-input-error';
}

export default MoneyInput;
