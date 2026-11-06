import { handle, getJson, cached, SetupError } from "@/lib/server/cache";
import { INDEX_PROXIES, DEFAULT_WATCHLIST } from "@/lib/config";
import type { StocksData, Quote } from "@/lib/stocks-types";

export const dynamic = "force-dynamic";
const BASE = "https://finnhub.io/api/v1";

type FQuote = { c: number; d: number | null; dp: number | null; h: number; l: number; o: number; pc: number; t: number };

async function quote(symbol: string, token: string): Promise<Quote> {
  const q = await getJson<FQuote>(`${BASE}/quote?symbol=${symbol}&token=${token}`);
  const valid = !!q.c && q.t > 0;
  return { symbol, price: q.c, change: q.d ?? 0, pct: q.dp ?? 0, high: q.h, low: q.l, open: q.o, prevClose: q.pc, t: q.t * 1000, valid };
}

async function name(symbol: string, token: string): Promise<string | undefined> {
  try {
    const r = await cached(`profile:${symbol}`, 7 * 24 * 3600_000, false, () =>
      getJson<{ name?: string }>(`${BASE}/stock/profile2?symbol=${symbol}&token=${token}`).then((p) => p.name ?? ""),
    );
    return r.value || undefined;
  } catch {
    return undefined;
  }
}

async function fetchStocks(symbols: string[]): Promise<StocksData> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) throw new SetupError("Add FINNHUB_API_KEY to .env.local to enable quotes.", "Free key at finnhub.io/register (60 calls/min).");
  const idx = INDEX_PROXIES.map((i) => i.symbol);
  let first: Quote;
  try {
    first = await quote(idx[0], token);
  } catch (e) {
    if (e instanceof Error && /401|403/.test(e.message)) throw new SetupError("Finnhub rejected the API key in FINNHUB_API_KEY.", "Copy the key from finnhub.io/dashboard into .env.local (it's a ~20-character string, not a UUID) and restart the dev server.");
    throw e;
  }
  const unique = [...new Set(symbols)];
  const [indexQ, watchQ, market] = await Promise.all([
    Promise.all(idx.map((s, i) => (i === 0 ? Promise.resolve(first) : quote(s, token)))),
    Promise.allSettled(unique.map(async (s) => ({ ...(await quote(s, token)), name: await name(s, token) }))),
    getJson<{ isOpen: boolean; session: string | null; holiday: string | null; t: number }>(`${BASE}/stock/market-status?exchange=US&token=${token}`).catch(() => null),
  ]);
  return {
    indices: indexQ.map((q, i) => ({ ...q, label: INDEX_PROXIES[i].label })),
    quotes: watchQ.map((r, i) => (r.status === "fulfilled" ? r.value : ({ symbol: unique[i], price: 0, change: 0, pct: 0, high: 0, low: 0, open: 0, prevClose: 0, t: 0, valid: false } as Quote))),
    market: market ? { isOpen: market.isOpen, session: market.session, holiday: market.holiday, t: market.t ? market.t * 1000 : null } : null,
  };
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("symbols");
  const symbols = (raw === null ? DEFAULT_WATCHLIST : raw.split(",")).map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z.\-]{1,10}$/.test(s)).slice(0, 25);
  return handle(req, `stocks:${[...symbols].sort().join(",")}`, 45_000, "Finnhub", () => fetchStocks(symbols), "Finnhub free-tier quotes: each price shows its own timestamp. Index tiles are ETF proxies (SPY, QQQ, DIA, IWM), not the indices themselves.");
}
