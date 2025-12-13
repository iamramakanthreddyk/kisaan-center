import { useEffect, useRef } from 'react';

/**
 * usePrefetchOnFocus
 * Calls callback when window/tab gains focus or becomes visible again.
 * Debounces rapid focus events and skips initial mount call (optional param).
 */
export function usePrefetchOnFocus(cb: () => void, options?: { skipInitial?: boolean; delayMs?: number }) {
  const { skipInitial = true, delayMs = 150 } = options || {};
  const mounted = useRef(false);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    const run = () => {
      if (skipInitial && !mounted.current) return;
      if (timeout.current) window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => cb(), delayMs);
    };

    const handleFocus = () => run();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    mounted.current = true;

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timeout.current) window.clearTimeout(timeout.current);
    };
  }, [cb, skipInitial, delayMs]);
}

export default usePrefetchOnFocus;
