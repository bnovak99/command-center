"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApi, useLocalPref } from "@/lib/hooks";
import { BriefingPhoto } from "@/components/BriefingPhoto";
import { REFRESH, DEFAULT_WATCHLIST, POWDER_ALERT_INCHES } from "@/lib/config";
import { wmo } from "@/components/WeatherIcon";
import { WEATHER_PATH } from "@/components/WeatherWidget";
import { SNOW_PATH } from "@/components/SnowWidget";
import { NEWS_PATH } from "@/components/NewsWidget";
import { stocksPath } from "@/components/StocksWidget";
import { fmtTime, timeAgo } from "@/lib/format";
import { mtDateKey } from "@/lib/tz";
import type { WeatherData } from "@/lib/weather-types";
import type { SnowData } from "@/lib/snow-types";
import type { NewsData } from "@/lib/news-types";
import type { StocksData } from "@/lib/stocks-types";
import type { CalendarData } from "@/lib/calendar-types";
import type { PackagesData, PackageStatus } from "@/lib/packages-types";
import type { I70Data } from "@/lib/i70-types";
import type { SportsData, SportsGame } from "@/lib/sports-types";
import type { ApiResponse } from "@/lib/types";

type Line = { label: string; text: React.ReactNode; tone?: "alert" };
const pending = <span className="text-faint">loading…</span>;
const unavailable = (r?: ApiResponse<unknown>, setup = "unavailable") => <span className="text-faint">{r && !r.ok && r.needsSetup ? "needs setup" : setup}</span>;
const shortTime = (ms: number) => fmtTime(ms).replace(":00", "");
const inch = (n: number) => `${n.toFixed(1)}"`;
// Most actionable first; delivered packages are left out of the briefing.
const PKG_ORDER: PackageStatus[] = ["out_for_delivery", "exception", "in_transit", "shipped", "ordered"];
const mtDay = (ms: number) => new Date(ms).toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" });
const mtWeekday = (ms: number) => new Date(ms).toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "short" });
const vs = (g: SportsGame) => <>{g.home ? "vs" : "@"} {g.opponent}</>;
const PKG_LABEL: Record<PackageStatus, string> = { out_for_delivery: "out for delivery", exception: "needs attention", in_transit: "in transit", shipped: "shipped", ordered: "ordered", delivered: "delivered" };

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Briefing() {
  const [wl] = useLocalPref<string[]>("watchlist", DEFAULT_WATCHLIST);
  const [calHidden] = useLocalPref("calendarHidden", false);
  const now = useNow();
  const w = useApi<WeatherData>(WEATHER_PATH, REFRESH.weather);
  const s = useApi<SnowData>(SNOW_PATH, REFRESH.snow);
  const n = useApi<NewsData>(NEWS_PATH, REFRESH.news);
  const m = useApi<StocksData>(stocksPath(wl), REFRESH.stocksOpen);
  const c = useApi<CalendarData>("/api/calendar", REFRESH.calendar);
  const p = useApi<PackagesData>("/api/packages", REFRESH.packages);
  const r = useApi<I70Data>("/api/i70", REFRESH.i70);
  const sp = useApi<SportsData>("/api/sports", REFRESH.sports);

  const lines: Line[] = [];

  // Genesee now
  let genesee: React.ReactNode = w.loading ? pending : unavailable(w.res);
  if (w.res?.ok) {
    const g = w.res.data.locations.find((l) => l.id === "genesee");
    if (g) genesee = <><b className="num">{Math.round(g.current.temp)}°F</b> and {wmo(g.current.code).label.toLowerCase()} (feels {Math.round(g.current.feels)}°), high {Math.round(g.daily[0].hi)}°</>;
  }
  lines.push({ label: "Genesee now", text: genesee });

  // Today's calendar: the first event still ahead (or under way) today
  let cal: React.ReactNode = c.loading ? pending : unavailable(c.res);
  if (c.res?.ok) {
    const today = mtDateKey(now);
    const timed = c.res.data.events.filter((e) => !e.allDay && mtDateKey(e.start) === today).sort((x, y) => x.start - y.start);
    const allDay = c.res.data.events.filter((e) => e.allDay && e.days?.includes(today));
    const left = timed.filter((e) => e.end > now);
    const title = (t: string) => (calHidden ? <span className="text-faint">details hidden</span> : t);
    if (left[0]) {
      const e = left[0];
      const more = left.length - 1;
      cal = <>{e.start <= now ? "Now" : left.length < timed.length ? "Next" : ""} <b className="num">{e.start <= now ? `until ${shortTime(e.end)}` : shortTime(e.start)}</b> {title(e.title)}{more > 0 && <span className="text-faint"> · +{more} more today</span>}</>;
    } else if (allDay[0]) cal = <>All day: {title(allDay[0].title)}{allDay.length > 1 && <span className="text-faint"> · +{allDay.length - 1} more</span>}</>;
    else cal = timed.length ? <>Nothing else on today&apos;s calendar</> : <>Nothing on today&apos;s calendar</>;
  }
  lines.push({ label: "Today", text: cal });

  // Next package
  let pkg: React.ReactNode = p.loading ? pending : unavailable(p.res);
  if (p.res?.ok) {
    const open = p.res.data.packages
      .filter((x) => x.status !== "delivered")
      .sort((x, y) => PKG_ORDER.indexOf(x.status) - PKG_ORDER.indexOf(y.status) || y.statusAt - x.statusAt);
    const x = open[0];
    pkg = x ? (
      <>
        <b>{x.merchant}</b> {PKG_LABEL[x.status]}
        {x.eta ? <>, est. {x.eta}</> : null}
        <span className="text-faint"> · email {timeAgo(x.statusAt)}{open.length > 1 ? ` · +${open.length - 1} more` : ""}</span>
      </>
    ) : <>Nothing on the way</>;
  }
  lines.push({ label: "Next package", text: pkg, tone: p.res?.ok && p.res.data.packages.some((x) => x.status === "exception") ? "alert" : undefined });

  // Overnight snow (model estimate, since 6 PM MT)
  let over: React.ReactNode = s.loading ? pending : unavailable(s.res);
  if (s.res?.ok) {
    const rs = s.res.data.resorts;
    over = rs.every((x) => x.past.overnight < 0.1) ? (
      <>None at your resorts since 6 PM <span className="text-faint">· model est.</span></>
    ) : (
      <>
        {rs.map((x, i) => <span key={x.id}>{i ? " · " : ""}{x.name} <b className="num">{inch(x.past.overnight)}</b></span>)}
        <span className="text-faint"> · since 6 PM, model est.</span>
      </>
    );
  }
  lines.push({ label: "Overnight snow", text: over });

  // Snow
  let snow: React.ReactNode = s.loading ? pending : unavailable(s.res);
  let alert = false;
  if (s.res?.ok) {
    const best = [...s.res.data.resorts].sort((a, b) => b.next.h72 - a.next.h72)[0];
    const powder = s.res.data.resorts.filter((r) => r.next.h24 >= POWDER_ALERT_INCHES);
    alert = powder.length > 0;
    snow = best.next.h72 < 0.1 ? <>No meaningful snow in the 72-h forecast</> : <>Best 72-h forecast: <b>{best.name}</b> <b className="num">{best.next.h72.toFixed(1)}&quot;</b></>;
    if (alert) snow = <>{snow} · <b>Powder Alert: {powder.map((p) => p.name).join(", ")}</b></>;
  }
  lines.push({ label: "Snow forecast", text: snow, tone: alert ? "alert" : undefined });

  // I-70 chain law / closures (CDOT)
  let road: React.ReactNode = r.loading ? pending : unavailable(r.res);
  const roadAlerts = r.res?.ok ? r.res.data.alerts : [];
  if (r.res?.ok) {
    const first = roadAlerts[0];
    road = first ? (
      <a href={first.url} target="_blank" rel="noreferrer" className="hover:text-accent">
        <b>{first.headline.replace(/\.$/, "")}</b>
        {first.fromMp != null && <span className="num text-faint"> · MP {first.fromMp}{first.toMp !== first.fromMp ? `–${first.toMp}` : ""}</span>}
        {roadAlerts.length > 1 && <span className="text-faint"> · +{roadAlerts.length - 1} more</span>}
      </a>
    ) : (
      <a href="https://www.cotrip.org/" target="_blank" rel="noreferrer" className="hover:text-accent">No chain law or closures posted, Golden to Avon <span className="text-faint">· CDOT</span></a>
    );
  }
  lines.push({ label: "I-70", text: road, tone: roadAlerts.length ? "alert" : undefined });

  // Sports: live game if one is on, else the latest final; plus the next game (ESPN)
  let sports: React.ReactNode = sp.loading ? pending : unavailable(sp.res);
  if (sp.res?.ok) {
    const asOf = sp.res.fetchedAt;
    const soon = (g: SportsGame) => (g.timeTbd ? `${mtDay(g.start)}, time TBD` : g.start - now < 6 * 86400_000 ? `${mtWeekday(g.start)} ${shortTime(g.start)}` : `${mtDay(g.start)}, ${shortTime(g.start)}`);
    sports = (
      <span className="flex flex-col gap-0.5">
        {sp.res.data.teams.map((t) => {
          const g = t.live ?? t.last;
          return (
            <span key={t.id}>
              <a href={g?.url ?? t.url} target="_blank" rel="noreferrer" className="hover:text-accent">
                <span className="text-muted">{t.name}</span>{" "}
                {t.error ? <span className="text-faint">unavailable</span>
                  : t.live ? <><b className="num">Live {t.live.us ?? "–"}–{t.live.them ?? "–"}</b> {vs(t.live)} <span className="text-faint">· {t.live.detail}, as of {fmtTime(asOf)}</span></>
                  : t.last ? <><b className={`num ${t.last.result === "W" ? "text-up" : t.last.result === "L" ? "text-down" : ""}`}>{t.last.result} {t.last.us}–{t.last.them}</b> {vs(t.last)} <span className="text-faint">· {mtDay(t.last.start)}{t.last.detail && t.last.detail !== "Final" ? `, ${t.last.detail}` : ""}</span></>
                  : <span className="text-faint">no games played yet</span>}
              </a>
              {!t.error && !t.live && t.next && <span className="text-faint"> · next {soon(t.next)} {vs(t.next)}</span>}
            </span>
          );
        })}
      </span>
    );
  }
  lines.push({ label: "Scores", text: sports });

  // Markets
  let mk: React.ReactNode = m.loading ? pending : unavailable(m.res);
  if (m.res?.ok) {
    const d = m.res.data;
    const mv = d.indices.filter((i) => i.valid).map((i, k) => (
      <span key={i.symbol}>{k > 0 && <span className="text-faint"> · </span>}<span className={`whitespace-nowrap ${i.pct >= 0 ? "text-up" : "text-down"}`}>{i.label} <span className="num">{i.pct >= 0 ? "+" : ""}{i.pct.toFixed(2)}%</span></span></span>
    ));
    mk = <>{d.market ? (d.market.isOpen ? "Market open · " : "Market closed · ") : ""}{mv.length ? mv : "no index data"}</>;
  }
  lines.push({ label: "Markets", text: mk });

  // Headline
  let hl: React.ReactNode = n.loading ? pending : unavailable(n.res);
  if (n.res?.ok && n.res.data.top[0]) {
    const t = n.res.data.top[0];
    hl = <a href={t.link} target="_blank" rel="noreferrer" className="hover:text-accent">{t.title} <span className="text-faint">— {t.source}</span></a>;
  }
  lines.push({ label: "Top headline", text: hl });

  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-surface to-surface2/50 p-4 sm:p-5" aria-label="Daily briefing">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-accent" /> Daily briefing</h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)]">
      <dl className="grid min-w-0 grid-cols-1 content-start gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2 2xl:grid-cols-3">
        {lines.map((l) => (
          <div key={l.label} className={`flex min-w-0 flex-col gap-0.5 rounded-lg px-1 [overflow-wrap:anywhere] ${l.tone === "alert" ? "bg-accent/10 p-2" : ""}`}>
            <dt className="text-[11px] uppercase tracking-wide text-faint">{l.label}</dt>
            <dd className="leading-snug">{l.text}</dd>
          </div>
        ))}
      </dl>
      <BriefingPhoto />
      </div>
    </section>
  );
}
