"use client";
import { useState } from "react";
import { CloudSun, Droplets, Wind, Sunrise, Sunset, X, TriangleAlert, Snowflake } from "lucide-react";
import { Widget } from "@/components/Widget";
import { WeatherIcon, wmo } from "@/components/WeatherIcon";
import { useApi } from "@/lib/hooks";
import { REFRESH, TZ } from "@/lib/config";
import { compass } from "@/lib/format";
import type { WeatherData, WLocation } from "@/lib/weather-types";

export const WEATHER_PATH = "/api/weather";
const r0 = (n: number) => Math.round(n);
const hourLabel = (t: string) => {
  const h = Number(t.slice(11, 13));
  return h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
};
const dayLabel = (d: string, i: number) => (i === 0 ? "Today" : new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }));
const clock = (t: string) => {
  const [h, m] = [Number(t.slice(11, 13)), t.slice(14, 16)];
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
};

export function WeatherWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<WeatherData>(WEATHER_PATH, REFRESH.weather);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Widget
      title="Colorado weather"
      icon={<CloudSun className="size-4 text-accent" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.locations.length === 0}
    >
      {(d) => {
        const sel = d.locations.find((l) => l.id === open);
        return (
          <div className="space-y-5">
            <Alerts d={d} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {d.locations.map((l) => (
                <LocationCard key={l.id} l={l} onClick={() => setOpen(l.id)} />
              ))}
            </div>
            <Comparison locations={d.locations} />
            {sel && <Detail l={sel} onClose={() => setOpen(null)} />}
          </div>
        );
      }}
    </Widget>
  );
}

function Alerts({ d }: { d: WeatherData }) {
  return (
    <div className="space-y-2">
      {d.alerts.map((a) => (
        <details key={a.id} className={`rounded-xl border p-3 text-sm ${a.severity === "Severe" || a.severity === "Extreme" ? "border-down/50 bg-down/10" : "border-warn/50 bg-warn/10"}`}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-medium">
            <TriangleAlert className="size-4 shrink-0" />
            {a.event}
            <span className="text-xs font-normal text-muted">
              {a.locations.join(", ")}
              {a.ends ? ` · until ${new Date(a.ends).toLocaleString("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" })}` : ""}
            </span>
          </summary>
          <p className="mt-2 text-muted">{a.headline}</p>
          <p className="mt-2 whitespace-pre-line text-xs text-muted">{a.description}</p>
          <p className="mt-1 text-xs text-faint">Source: {a.sender} (api.weather.gov)</p>
        </details>
      ))}
      {d.alerts.length === 0 && !d.alertsError && <p className="text-xs text-muted">No active NWS alerts for these locations.</p>}
      {d.alertsError && <p className="text-xs text-warn">{d.alertsError}</p>}
    </div>
  );
}

function LocationCard({ l, onClick }: { l: WLocation; onClick: () => void }) {
  const c = l.current;
  const today = l.daily[0];
  return (
    <button onClick={onClick} className="group rounded-xl border border-line bg-surface2/50 p-4 text-left transition hover:border-accent/60 hover:bg-surface2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">{l.name}</div>
          <div className="text-xs text-muted">{wmo(c.code).label}</div>
        </div>
        <WeatherIcon code={c.code} isDay={c.isDay} className="size-7 text-accent" />
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="num text-4xl font-semibold tracking-tight">{r0(c.temp)}°</span>
        <span className="text-xs text-muted">feels {r0(c.feels)}°</span>
      </div>
      <div className="num mt-1 text-xs text-muted">H {r0(today.hi)}° · L {r0(today.lo)}°</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        <span className="flex items-center gap-1"><Droplets className="size-3" />{today.pop}%</span>
        <span className="flex items-center gap-1"><Wind className="size-3" />{r0(c.wind)} {compass(c.windDir)}</span>
        <span className="num">{r0(c.humidity)}% RH</span>
      </div>
    </button>
  );
}

function Comparison({ locations }: { locations: WLocation[] }) {
  const sorted = [...locations].sort((a, b) => b.current.temp - a.current.temp);
  const temps = sorted.map((l) => l.current.temp);
  const base = Math.min(0, ...temps) - 5; // bars start at 0°F (or below) so lengths aren't exaggerated
  const max = Math.max(...temps);
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Temperature comparison · now</h3>
      <div className="space-y-1.5">
        {sorted.map((l) => {
          const w = Math.max(2, ((l.current.temp - base) / Math.max(max - base, 1)) * 100);
          return (
            <div key={l.id} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 truncate text-muted">{l.name}</span>
              <div className="h-2 flex-1 rounded-full bg-surface2">
                <div className={`h-2 rounded-full ${l.region === "mountains" ? "bg-snow" : "bg-accent"}`} style={{ width: `${w}%` }} />
              </div>
              <span className="num w-10 text-right">{r0(l.current.temp)}°</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-faint">
        <span className="flex items-center gap-1"><i className="inline-block size-2 rounded-full bg-accent" /> Front Range</span>
        <span className="flex items-center gap-1"><i className="inline-block size-2 rounded-full bg-snow" /> Mountains</span>
      </div>
    </div>
  );
}

function Detail({ l, onClose }: { l: WLocation; onClose: () => void }) {
  const t = l.hourly.map((h) => h.temp);
  const lo = Math.min(...t), hi = Math.max(...t);
  const W = 720, H = 90, pad = 8;
  const pts = l.hourly.map((h, i) => [pad + (i / (l.hourly.length - 1)) * (W - 2 * pad), pad + (1 - (h.temp - lo) / Math.max(hi - lo, 1)) * (H - 2 * pad)]);
  const today = l.daily[0];
  const snow7 = l.daily.reduce((s, d) => s + d.snow, 0);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{l.name}</h3>
            <p className="text-sm text-muted">{wmo(l.current.code).label} · {r0(l.current.temp)}° · gusts {r0(l.current.gust)} mph</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface2"><X className="size-4" /></button>
        </div>

        <h4 className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">Next 24 hours · forecast</h4>
        <div className="mt-2 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-24 min-w-[560px] w-full">
            <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={pts.map((p) => p.join(",")).join(" ")} />
            {pts.map((p, i) => (i % 3 === 0 ? <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--accent)" /> : null))}
          </svg>
          <div className="grid min-w-[560px] grid-cols-8 gap-1 text-center text-xs">
            {l.hourly.filter((_, i) => i % 3 === 0).map((h) => (
              <div key={h.t} className="rounded-lg bg-surface2/60 py-2">
                <div className="text-muted">{hourLabel(h.t)}</div>
                <WeatherIcon code={h.code} className="mx-auto my-1 size-4" />
                <div className="num font-medium">{r0(h.temp)}°</div>
                <div className="num text-snow">{h.pop}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat icon={<Sunrise className="size-4" />} label="Sunrise" value={clock(today.sunrise)} />
          <Stat icon={<Sunset className="size-4" />} label="Sunset" value={clock(today.sunset)} />
          <Stat label="UV index (max)" value={String(r0(today.uv))} />
          {l.hasSnow && <Stat icon={<Snowflake className="size-4" />} label="Snow, 7 days (forecast)" value={`${snow7.toFixed(1)}"`} />}
        </div>

        <h4 className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">7-day forecast</h4>
        <div className="mt-2 divide-y divide-line">
          {l.daily.map((d, i) => (
            <div key={d.date} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 text-muted">{dayLabel(d.date, i)}</span>
              <WeatherIcon code={d.code} className="size-5" />
              <span className="hidden flex-1 text-xs text-muted sm:block">{wmo(d.code).label}</span>
              <span className="num w-10 text-xs text-snow">{d.pop}%</span>
              {l.hasSnow && <span className="num w-12 text-xs text-snow">{d.snow > 0 ? `${d.snow.toFixed(1)}"` : "—"}</span>}
              <span className="num ml-auto w-20 text-right">{r0(d.hi)}° <span className="text-muted">{r0(d.lo)}°</span></span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-faint">Source: Open-Meteo forecast model. Times in Mountain Time.</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface2/60 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">{icon}{label}</div>
      <div className="num mt-1 text-base font-medium">{value}</div>
    </div>
  );
}
