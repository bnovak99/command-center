"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Eye, EyeOff, MapPin, Video, ExternalLink, AlertTriangle } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi, useLocalPref } from "@/lib/hooks";
import { CALENDAR_DAYS, REFRESH, TZ } from "@/lib/config";
import { fmtTime } from "@/lib/format";
import { addDays, mtDateKey } from "@/lib/tz";
import type { CalEvent, CalendarData } from "@/lib/calendar-types";

const dayLabel = (key: string, todayKey: string) => {
  if (key === todayKey) return "Today";
  if (key === addDays(todayKey, 1)) return "Tomorrow";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
};
const shortTime = (ms: number) => fmtTime(ms).replace(":00", "");
const dur = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`);

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function CalendarWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<CalendarData>("/api/calendar", REFRESH.calendar);
  const [hidden, setHidden] = useLocalPref("calendarHidden", false);
  const now = useNow();
  return (
    <Widget
      title="Calendar"
      icon={<CalendarDays className="size-4 text-accent" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.events.length === 0}
      emptyText={`Nothing on your calendar in the next ${CALENDAR_DAYS} days.`}
      actions={
        <>
          <button
            onClick={() => setHidden((h) => !h)}
            aria-label={hidden ? "Show event details" : "Hide event details"}
            title={hidden ? "Show event details" : "Hide event details"}
            className="rounded-md p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <a href="https://calendar.google.com/calendar/r" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-fg">
            Open <ExternalLink className="size-3" />
          </a>
        </>
      }
    >
      {(d) => <Agenda data={d} now={now} hidden={hidden} />}
    </Widget>
  );
}

function Agenda({ data, now, hidden }: { data: CalendarData; now: number; hidden: boolean }) {
  const todayKey = mtDateKey(now);
  const multi = data.calendars.length > 1;
  const failed = data.calendars.filter((c) => !c.ok);

  // Bucket events per MT day. All-day events appear on every day they cover; timed ones on their start day (or today if already running).
  const days = Array.from({ length: CALENDAR_DAYS }, (_, i) => addDays(mtDateKey(data.rangeStart), i)).filter((k) => k >= todayKey);
  const byDay = new Map<string, { allDay: CalEvent[]; timed: CalEvent[] }>(days.map((k) => [k, { allDay: [], timed: [] }]));
  for (const ev of data.events) {
    if (ev.end <= now && !ev.allDay && mtDateKey(ev.start) < todayKey) continue;
    if (ev.allDay) for (const k of ev.days ?? []) byDay.get(k)?.allDay.push(ev);
    else {
      const k = mtDateKey(ev.start) < todayKey ? todayKey : mtDateKey(ev.start);
      byDay.get(k)?.timed.push(ev);
    }
  }

  const upcoming = data.events.filter((e) => !e.allDay && e.end > now);
  const current = upcoming.filter((e) => e.start <= now);
  const next = upcoming.find((e) => e.start > now);

  return (
    <div className="space-y-4">
      {failed.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {failed.map((c) => `${c.label}: ${c.error}`).join(" · ")}. Showing the other calendars only.
          </span>
        </div>
      )}

      <NowNext current={current} next={next} now={now} hidden={hidden} todayKey={todayKey} />

      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.5fr_repeat(6,minmax(0,1fr))]">
        {days.map((k) => {
          const b = byDay.get(k)!;
          const isToday = k === todayKey;
          const empty = !b.allDay.length && !b.timed.length;
          return (
            <div key={k} className={`min-w-0 ${isToday ? "" : "xl:border-l xl:border-line xl:pl-4"} ${empty && !isToday ? "hidden sm:block" : ""}`}>
              <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                <h3 className={`text-[11px] font-medium uppercase tracking-wide ${isToday ? "text-fg" : "text-muted"}`}>{dayLabel(k, todayKey)}</h3>
                {isToday && (
                  <span className="text-[11px] text-faint">
                    {new Date(now).toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
              {b.allDay.map((e) => (
                <div key={`${e.id}:${k}`} className="mb-1.5 truncate rounded-md border border-line bg-surface2 px-2 py-1 text-xs">
                  <span className="text-faint">All day · </span>
                  <Title e={e} hidden={hidden} />
                  {multi && <span className="text-faint"> · {e.calendar}</span>}
                </div>
              ))}
              {empty && <p className="py-1 text-xs text-faint">{isToday ? "Nothing scheduled." : "Free"}</p>}
              <ul className="space-y-2.5">
                {b.timed.map((e) => {
                  const past = e.end <= now;
                  const live = e.start <= now && e.end > now;
                  const where = !hidden ? [e.location && !/^https?:/.test(e.location) ? e.location : null, multi ? e.calendar : null].filter(Boolean).join(" · ") : "";
                  return (
                    <li key={e.id} className={`min-w-0 ${past ? "opacity-45" : ""}`}>
                      <div className={`num flex items-center gap-1.5 text-[11px] ${live ? "text-accent" : "text-muted"}`}>
                        {live && <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label="In progress" />}
                        {shortTime(e.start)}
                        <span className="text-faint">– {shortTime(e.end)}</span>
                        {e.tentative && <span className="font-sans text-faint">· tentative</span>}
                        {e.url && !past && !hidden && (
                          <a href={e.url} target="_blank" rel="noreferrer" aria-label={`Join ${e.title}`} className="ml-auto flex shrink-0 items-center gap-1 rounded px-1 font-sans text-muted hover:text-accent">
                            <Video className="size-3.5" /> Join
                          </a>
                        )}
                      </div>
                      <div className="line-clamp-2 text-sm font-medium leading-snug">
                        <Title e={e} hidden={hidden} />
                      </div>
                      {where && (
                        <div className="flex items-center gap-1 text-xs text-faint">
                          {e.location && <MapPin className="size-3 shrink-0" />}
                          <span className="truncate">{where}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Title({ e, hidden }: { e: CalEvent; hidden: boolean }) {
  return hidden ? <span className="text-muted">Busy</span> : <>{e.title}</>;
}

function NowNext({ current, next, now, hidden, todayKey }: { current: CalEvent[]; next?: CalEvent; now: number; hidden: boolean; todayKey: string }) {
  const cur = current[0];
  const nextIsToday = next && mtDateKey(next.start) === todayKey;
  if (!cur && !nextIsToday) {
    return <div className="rounded-lg bg-surface2 px-3 py-2.5 text-sm text-muted">Nothing else on the calendar today.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {cur && (
        <div className="rounded-lg bg-surface2 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-accent">Now</div>
          <div className="truncate text-sm font-medium"><Title e={cur} hidden={hidden} /></div>
          <div className="num text-xs text-muted">ends {fmtTime(cur.end)} · {dur(Math.max(1, Math.round((cur.end - now) / 60_000)))} left</div>
        </div>
      )}
      {nextIsToday && next && (
        <div className="rounded-lg bg-surface2 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Next</div>
          <div className="truncate text-sm font-medium"><Title e={next} hidden={hidden} /></div>
          <div className="num text-xs text-muted">{fmtTime(next.start)} · in {dur(Math.max(1, Math.round((next.start - now) / 60_000)))}</div>
        </div>
      )}
    </div>
  );
}
