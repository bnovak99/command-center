"use client";
import { Snowflake, Wind, Thermometer, ExternalLink, Siren } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi, useLocalPref } from "@/lib/hooks";
import { REFRESH, RESORTS, POWDER_ALERT_INCHES, REGIONAL_LINKS, resortLinks } from "@/lib/config";
import type { SnowData, SnowResort } from "@/lib/snow-types";

export const SNOW_PATH = "/api/snow";
const inch = (n: number) => `${n.toFixed(1)}"`;

export function SnowWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<SnowData>(SNOW_PATH, REFRESH.snow);
  const [sort, setSort] = useLocalPref<"recent" | "upcoming">("snowSort", "upcoming");

  return (
    <Widget
      title="Ski & snow"
      icon={<Snowflake className="size-4 text-snow" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.resorts.length === 0}
      actions={
        <div className="flex rounded-lg border border-line p-0.5 text-xs">
          {(["upcoming", "recent"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={`rounded-md px-2 py-1 ${sort === s ? "bg-surface2 text-fg" : "text-muted"}`}>
              {s === "upcoming" ? "Upcoming" : "Recent"}
            </button>
          ))}
        </div>
      }
    >
      {(d) => {
        const key = (r: SnowResort) => (sort === "recent" ? r.past.d7 : r.next.d7);
        const sorted = [...d.resorts].sort((a, b) => key(b) - key(a));
        const bestId = sorted[0] && key(sorted[0]) > 0 ? sorted[0].id : null;
        return (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {sorted.map((r) => (
                <ResortCard key={r.id} r={r} best={r.id === bestId} sort={sort} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {REGIONAL_LINKS.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent/60 hover:text-fg">
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </div>
        );
      }}
    </Widget>
  );
}

function ResortCard({ r, best, sort }: { r: SnowResort; best: boolean; sort: string }) {
  const resort = RESORTS.find((x) => x.id === r.id)!;
  const powder = r.next.h24 >= POWDER_ALERT_INCHES;
  const max = Math.max(...r.daily.map((d) => d.snow), 1);
  return (
    <div className={`rounded-xl border p-4 ${best ? "border-snow/60 bg-snow/5" : "border-line bg-surface2/40"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{r.name}</h3>
        <span className="text-xs text-faint">mid-mtn {r.elevationFt.toLocaleString()} ft</span>
        {best && <span className="rounded-full bg-snow/20 px-2 py-0.5 text-[11px] font-medium text-snow">Best {sort === "recent" ? "recent" : "upcoming"} snow</span>}
        {powder && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
            <Siren className="size-3" /> Powder Alert
          </span>
        )}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><Thermometer className="size-3" /><span className="num">{Math.round(r.current.temp)}°F</span></span>
        <span className="flex items-center gap-1"><Wind className="size-3" /><span className="num">{Math.round(r.current.wind)} mph (gusts {Math.round(r.current.gust)})</span></span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-center min-[420px]:grid-cols-2 sm:gap-3">
        <div className="rounded-lg bg-surface/60 p-2">
          <div className="text-[11px] uppercase tracking-wide text-muted">Past · model estimate</div>
          <div className="num mt-1 grid grid-cols-3 text-sm">
            <Cell l="24h" v={inch(r.past.h24)} /><Cell l="48h" v={inch(r.past.h48)} /><Cell l="7d" v={inch(r.past.d7)} />
          </div>
        </div>
        <div className="rounded-lg bg-surface/60 p-2">
          <div className="text-[11px] uppercase tracking-wide text-snow">Next · forecast</div>
          <div className="num mt-1 grid grid-cols-4 text-sm">
            <Cell l="24h" v={inch(r.next.h24)} hi /><Cell l="48h" v={inch(r.next.h48)} hi /><Cell l="72h" v={inch(r.next.h72)} hi /><Cell l="7d" v={inch(r.next.d7)} hi />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <svg viewBox="0 -10 280 80" className="h-20 w-full" role="img" aria-label="14-day snowfall bars: past 7 days estimated, next 7 days forecast">
          {r.daily.map((d, i) => {
            const h = (d.snow / max) * 48;
            const x = i * 20 + 3;
            const fill = d.kind === "past" ? "var(--faint)" : "var(--snow)";
            return (
              <g key={d.date}>
                <rect x={x} y={52 - h} width="14" height={Math.max(h, 1)} rx="2" fill={fill} opacity={d.kind === "past" ? 0.7 : 1} />
                {d.kind === "today" && <rect x={x - 2} y="2" width="18" height="62" rx="4" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 2" />}
                {d.snow > 0.05 && <text x={x + 7} y={48 - h} textAnchor="middle" fontSize="7" fill="var(--muted)">{d.snow.toFixed(1)}</text>}
                <text x={x + 7} y="66" textAnchor="middle" fontSize="7" fill={d.kind === "today" ? "var(--accent)" : "var(--faint)"}>
                  {d.kind === "today" ? "today" : new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-faint">
          <span>■ <span className="text-muted">past 7 days (model estimate)</span></span>
          <span className="text-snow">■ <span className="text-muted">next 7 days (forecast)</span></span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {resortLinks(resort).map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-accent/60 hover:text-fg">
            {l.label} <ExternalLink className="size-2.5" />
          </a>
        ))}
      </div>
    </div>
  );
}

function Cell({ l, v, hi }: { l: string; v: string; hi?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-faint">{l}</div>
      <div className={hi ? "text-snow" : ""}>{v}</div>
    </div>
  );
}
