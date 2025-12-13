import { useCallback, useState } from 'react';

/**
 * Generic form state manager.
 * Returns value, setters, change handler factory, reset and patch helpers.
 */
export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleChange = useCallback(<K extends keyof T>(key: K) => (value: unknown) => {
    let next: unknown;
    if (value && typeof value === 'object' && 'target' in value && value.target && typeof (value.target as { value: unknown }).value !== 'undefined') {
      next = (value as { target: { value: unknown } }).target.value;
    } else {
      next = value;
    }
    setField(key, next as T[K]);
  }, [setField]);

  const patch = useCallback((obj: Partial<T>) => {
    setValues(prev => ({ ...prev, ...obj }));
  }, []);

  const reset = useCallback(() => setValues(initial), [initial]);

  return { values, setField, handleChange, patch, reset, setValues };
}

export default useFormState;
