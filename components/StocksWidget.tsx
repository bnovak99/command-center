"use client";
import { useState } from "react";
import { LineChart, Plus, X } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi, useLocalPref } from "@/lib/hooks";
import { REFRESH, DEFAULT_WATCHLIST } from "@/lib/config";
import { fmtDayTime, fmtTime } from "@/lib/format";
import type { Quote, StocksData } from "@/lib/stocks-types";

export const stocksPath = (symbols: string[]) => `/api/stocks?symbols=${encodeURIComponent(symbols.join(","))}`;
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const tone = (n: number) => (n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted");
const sign = (n: number) => (n > 0 ? "+" : "");

export function StocksWidget() {
  const [list, setList, ready] = useLocalPref<string[]>("watchlist", DEFAULT_WATCHLIST);
  const [sort, setSort] = useLocalPref<"pct" | "ticker">("stockSort", "pct");
  const [input, setInput] = useState("");
  // Market-hours aware refresh is approximated server-side by status; poll every minute and let the server cache absorb it.
  const [open, setOpen] = useState(true);
  const { res, networkError, loading, validating, refresh } = useApi<StocksData>(ready ? stocksPath(list) : null, open ? REFRESH.stocksOpen : REFRESH.stocksClosed);
  if (res?.ok && res.data.market && res.data.market.isOpen !== open) setOpen(res.data.market.isOpen);

  const add = () => {
    const s = input.trim().toUpperCase();
    if (/^[A-Z.\-]{1,10}$/.test(s) && !list.includes(s)) setList([...list, s]);
    setInput("");
  };

  return (
    <Widget
      title="Markets & watchlist"
      icon={<LineChart className="size-4 text-up" />}
      res={res}
      networkError={networkError}
      loading={loading || !ready}
      validating={validating}
      onRefresh={refresh}
      actions={
        res?.ok && res.data.market ? (
          <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${res.data.market.isOpen ? "bg-up/15 text-up" : "bg-surface2 text-muted"}`}>
            <i className={`size-1.5 rounded-full ${res.data.market.isOpen ? "bg-up" : "bg-faint"}`} />
            {res.data.market.isOpen ? "US market open" : `US market closed${res.data.market.holiday ? ` · ${res.data.market.holiday}` : ""}`}
          </span>
        ) : null
      }
    >
      {(d) => {
        const quotes = [...d.quotes].sort((a, b) => (sort === "pct" ? b.pct - a.pct : a.symbol.localeCompare(b.symbol)));
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {d.indices.map((q) => (
                <div key={q.symbol} className="rounded-xl border border-line bg-surface2/40 p-3">
                  <div className="text-xs text-muted">{q.label}</div>
                  <div className="text-[10px] text-faint">via {q.symbol} ETF (proxy)</div>
                  <div className="num mt-1 text-lg font-semibold">{q.valid ? usd(q.price) : "—"}</div>
                  <div className={`num text-xs ${tone(q.pct)}`}>{q.valid ? `${sign(q.change)}${q.change.toFixed(2)} (${sign(q.pct)}${q.pct.toFixed(2)}%)` : "no data"}</div>
                  <div className="num mt-1 text-[10px] text-faint">{q.valid ? `as of ${fmtDayTime(q.t)}` : ""}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Watchlist</h3>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex rounded-lg border border-line p-0.5 text-xs">
                    {(["pct", "ticker"] as const).map((s) => (
                      <button key={s} onClick={() => setSort(s)} className={`rounded-md px-2 py-1 ${sort === s ? "bg-surface2 text-fg" : "text-muted"}`}>
                        {s === "pct" ? "% change" : "Ticker"}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-1">
                    <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add ticker" maxLength={10} aria-label="Add ticker" className="num w-24 rounded-lg border border-line bg-transparent px-2 py-1 text-xs uppercase outline-none focus:border-accent" />
                    <button type="submit" aria-label="Add" className="rounded-lg border border-line p-1.5 text-muted hover:bg-surface2 hover:text-fg"><Plus className="size-3.5" /></button>
                  </form>
                </div>
              </div>
              {quotes.length === 0 ? (
                <p className="py-4 text-sm text-muted">Your watchlist is empty — add a ticker above.</p>
              ) : (
                <div className="divide-y divide-line">
                  {quotes.map((q) => (
                    <Row key={q.symbol} q={q} onRemove={() => setList(list.filter((s) => s !== q.symbol))} />
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] text-faint">Last fetch {fmtTime(res!.ok ? res!.fetchedAt : 0)} MT · quote times shown per row (free-tier data can be delayed).</p>
            </div>
          </div>
        );
      }}
    </Widget>
  );
}

function Row({ q, onRemove }: { q: Quote; onRemove: () => void }) {
  const range = q.high - q.low;
  const pos = range > 0 ? Math.min(100, Math.max(0, ((q.price - q.low) / range) * 100)) : 50;
  return (
    <div className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[5rem_minmax(0,1fr)_7rem_8rem_12rem_1.5rem]">
      <div className="num text-sm font-semibold">{q.symbol}</div>
      <div className="hidden truncate text-xs text-muted sm:block">{q.name ?? ""}</div>
      {q.valid ? (
        <>
          <div className="num text-right text-sm sm:text-left">{usd(q.price)}</div>
          <div className={`num text-right text-xs ${tone(q.pct)}`}>
            {sign(q.change)}{q.change.toFixed(2)} · {sign(q.pct)}{q.pct.toFixed(2)}%
            <div className="num text-[10px] text-faint">{fmtDayTime(q.t)}</div>
          </div>
          <div className="hidden sm:block" title={`Day range ${usd(q.low)} – ${usd(q.high)}`}>
            <div className="relative h-1.5 rounded-full bg-surface2">
              <i className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" style={{ left: `${pos}%` }} />
            </div>
            <div className="num mt-1 flex justify-between text-[10px] text-faint"><span>{q.low.toFixed(2)}</span><span>{q.high.toFixed(2)}</span></div>
          </div>
        </>
      ) : (
        <div className="col-span-2 text-xs text-warn sm:col-span-3">No quote available for this ticker.</div>
      )}
      <button onClick={onRemove} aria-label={`Remove ${q.symbol}`} className="justify-self-end text-faint opacity-60 hover:text-down sm:opacity-0 sm:group-hover:opacity-100"><X className="size-3.5" /></button>
    </div>
  );
}
