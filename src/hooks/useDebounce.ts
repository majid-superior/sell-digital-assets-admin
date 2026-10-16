import { useState, useEffect } from "react";

/**
 * Custom hook to debounce any fast-changing value (e.g. search input).
 *
 * @param value The value to debounce.
 * @param delayMs Delay in milliseconds (defaults to 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;

