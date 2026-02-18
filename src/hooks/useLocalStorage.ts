import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[useLocalStorage] Corrupted data for key "${key}". Resetting.`);
      localStorage.removeItem(key);
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('[useLocalStorage] Failed to write:', err);
    }
  }, [key, value]);

  return [value, setValue];
}

