import { useRef, useState } from "react";

const storage = new Map<string, unknown>();

type Setter<T> = T | ((current: T) => T);

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValueState] = useState<T>(() =>
    storage.has(key) ? (storage.get(key) as T) : defaultValue,
  );
  const ref = useRef(value);
  ref.current = value;

  const setValue = async (nextValue: Setter<T>) => {
    const resolved = typeof nextValue === "function" ? (nextValue as (current: T) => T)(ref.current) : nextValue;
    storage.set(key, resolved);
    ref.current = resolved;
    setValueState(resolved);
  };

  return {
    value,
    setValue,
    isLoading: false,
  };
}

export function __resetStorage() {
  storage.clear();
}
