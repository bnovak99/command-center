import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

type Entry = { value: unknown; at: number };
const g = globalThis as unknown as {
  __cc_cache?: Map<string, Entry>;
  __cc_inflight?: Map<string, Promise<unknown>>;
};
const store = (g.__cc_cache ??= new Map());
const inflight = (g.__cc_inflight ??= new Map());

const MIN_REFRESH_MS = 30_000; // refresh spam guard

export class SetupError extends Error {
  constructor(message: string, public hint?: string) {
    super(message);
  }
}

/**
 * Cached fetch with TTL, in-flight dedupe, stale fallback and min-age guard on ?refresh=1.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  force: boolean,
  fetcher: () => Promise<T>,
  minRefreshMs = MIN_REFRESH_MS,
): Promise<{ value: T; fetchedAt: number; stale: boolean }> {
  const hit = store.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && (age < ttlMs && !force ? true : force && age < minRefreshMs)) {
    return { value: hit.value as T, fetchedAt: hit.at, stale: false };
  }
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    const value = await p;
    const at = Date.now();
    store.set(key, { value, at });
    return { value, fetchedAt: at, stale: false };
  } catch (e) {
    if (hit) return { value: hit.value as T, fetchedAt: hit.at, stale: true };
    throw e;
  }
}

export async function handle<T>(
  req: Request,
  key: string,
  ttlMs: number,
  source: string,
  fetcher: () => Promise<T>,
  note?: string,
  minRefreshMs?: number,
) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const r = await cached(key, ttlMs, force, fetcher, minRefreshMs);
    const body: ApiResponse<T> = {
      ok: true,
      data: r.value,
      source,
      fetchedAt: r.fetchedAt,
      ...(r.stale ? { stale: true } : {}),
      ...(note ? { note } : {}),
    };
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof SetupError) {
      return NextResponse.json({ ok: false, error: e.message, needsSetup: true, hint: e.hint } satisfies ApiResponse<T>);
    }
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" } satisfies ApiResponse<T>);
  }
}

export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}
