import { useEffect, useState } from "react";

const KEY = "lilapp.displayName";

export function useDisplayName(): [string | null, (v: string | null) => void, boolean] {
  const [name, setName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setName(v);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const update = (v: string | null) => {
    setName(v);
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  };

  return [name, update, hydrated];
}

export function readDisplayNameSync(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
