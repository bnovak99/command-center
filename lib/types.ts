export type ApiOk<T> = {
  ok: true;
  data: T;
  source: string;
  fetchedAt: number;
  stale?: boolean;
  note?: string;
};
export type ApiErr = { ok: false; error: string; needsSetup?: boolean; hint?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
