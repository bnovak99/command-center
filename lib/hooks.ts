"use client";
import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/types";

const fetcher = async (url: string) => {
  const r = await fetch(url);
  return (await r.json()) as ApiResponse<unknown>;
};

export function useApi<T>(path: string | null, refreshMs: number) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiResponse<T>>(path, fetcher as never, {
    refreshInterval: refreshMs,
    revalidateOnFocus: false,
    keepPreviousData: true,
    errorRetryInterval: 60_000,
  });
  const refresh = useCallback(() => {
    if (!path) return;
    const sep = path.includes("?") ? "&" : "?";
    return mutate(fetcher(`${path}${sep}refresh=1`) as Promise<ApiResponse<T>>, { revalidate: false });
  }, [path, mutate]);
  return { res: data, networkError: error as Error | undefined, loading: isLoading, validating: isValidating, refresh };
}

/** localStorage-backed state, safe against missing/blocked storage. */
export function useLocalPref<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cc:${key}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read localStorage after mount to avoid hydration mismatch
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {}
    setReady(true);
  }, [key]);
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((p) => {
        const n = typeof v === "function" ? (v as (p: T) => T)(p) : v;
        try {
          localStorage.setItem(`cc:${key}`, JSON.stringify(n));
          window.dispatchEvent(new CustomEvent("cc-pref", { detail: key }));
        } catch {}
        return n;
      });
    },
    [key],
  );
  return [value, set, ready] as const;
}
