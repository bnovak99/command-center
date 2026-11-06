export type Quote = { symbol: string; name?: string; price: number; change: number; pct: number; high: number; low: number; open: number; prevClose: number; t: number; valid: boolean };
export type StocksData = {
  indices: (Quote & { label: string })[];
  quotes: Quote[];
  market: { isOpen: boolean; session: string | null; holiday: string | null; t: number | null } | null;
};
