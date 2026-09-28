import { useState, useEffect } from "react";

/**
 * Debounces a value with a specified delay (default 400ms, within 300-500ms range).
 * Prevents firing API requests on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
