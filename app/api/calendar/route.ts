import ICAL from "ical.js";
import { handle, SetupError } from "@/lib/server/cache";
import { CALENDAR_DAYS } from "@/lib/config";
import { addDays, mtDateKey, mtMidnight } from "@/lib/tz";
import type { CalEvent, CalendarData, CalSourceStatus } from "@/lib/calendar-types";

export const dynamic = "force-dynamic";

type Source = { label: string; url: string };

/** GOOGLE_CALENDAR_ICS="Personal|https://…/basic.ics,Family|https://…" (label optional). */
function sources(): Source[] {
  const raw = process.env.GOOGLE_CALENDAR_ICS ?? "";
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => {
      const bar = s.indexOf("|");
      const url = (bar >= 0 ? s.slice(bar + 1) : s).trim();
      const label = (bar >= 0 ? s.slice(0, bar).trim() : "") || (i === 0 ? "Calendar" : `Calendar ${i + 1}`);
      return { label, url };
    });
}

async function fetchIcs(url: string) {
  // Never put the URL in errors: it is a secret.
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { Accept: "text/calendar" } });
  } catch {
    throw new Error("Could not reach Google Calendar");
  }
  if (res.status === 404 || res.status === 403 || res.status === 401) throw new Error(`Google rejected the iCal address (${res.status}); it may have been reset`);
  if (!res.ok) throw new Error(`Google Calendar responded ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Response was not an iCal feed (check the address)");
  return text;
}

const MEETING = /https:\/\/(?:meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com|teams\.live\.com|[\w.-]*webex\.com)\/[^\s"<>)\\]+/i;

function meetingUrl(ev: ICAL.Event) {
  const conf = ev.component.getFirstPropertyValue("x-google-conference");
  if (typeof conf === "string" && conf.startsWith("https://")) return conf;
  const hay = `${ev.location ?? ""}\n${ev.description ?? ""}`;
  return hay.match(MEETING)?.[0];
}

function isCancelled(ev: ICAL.Event) {
  return String(ev.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";
}

function toEvent(label: string, item: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null, idx: string): CalEvent {
  const allDay = start.isDate;
  let s: number, e: number, days: string[] | undefined;
  if (allDay) {
    const sKey = start.toString().slice(0, 10);
    const eKey = end ? end.toString().slice(0, 10) : addDays(sKey, 1);
    days = [];
    for (let k = sKey; k < eKey && days.length < 60; k = addDays(k, 1)) days.push(k);
    if (!days.length) days.push(sKey);
    s = mtMidnight(sKey);
    e = mtMidnight(addDays(days[days.length - 1], 1));
  } else {
    s = start.toJSDate().getTime();
    e = end ? end.toJSDate().getTime() : s;
  }
  const status = String(item.component.getFirstPropertyValue("status") ?? "").toUpperCase();
  return {
    id: `${label}:${item.uid}:${idx}`,
    calendar: label,
    title: (item.summary || "").trim() || "(No title)",
    start: s,
    end: e,
    allDay,
    ...(days ? { days } : {}),
    ...(item.location ? { location: item.location.trim() } : {}),
    ...(meetingUrl(item) ? { url: meetingUrl(item) } : {}),
    ...(status === "TENTATIVE" ? { tentative: true } : {}),
  };
}

function parse(label: string, text: string, rangeStart: number, rangeEnd: number): CalEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const v of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(v);
    if (ev.isRecurrenceException()) exceptions.push(ev);
    else masters.set(ev.uid, ev);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
  }

  const out: CalEvent[] = [];
  const overlaps = (ev: CalEvent) => ev.end > rangeStart && ev.start < rangeEnd;
  // Exceptions whose master is missing (e.g. invited to a single instance) stand alone.
  for (const ex of exceptions) {
    if (masters.has(ex.uid) || isCancelled(ex)) continue;
    const ce = toEvent(label, ex, ex.startDate, ex.endDate, ex.startDate.toString());
    if (overlaps(ce)) out.push(ce);
  }

  const rangeEndTime = ICAL.Time.fromJSDate(new Date(rangeEnd), true);
  for (const ev of masters.values()) {
    if (isCancelled(ev)) continue;
    if (!ev.isRecurring()) {
      const ce = toEvent(label, ev, ev.startDate, ev.endDate, "0");
      if (overlaps(ce)) out.push(ce);
      continue;
    }
    const it = ev.iterator();
    let next: ICAL.Time | null;
    let guard = 0;
    while ((next = it.next()) && guard++ < 20_000) {
      if (next.compare(rangeEndTime) > 0) break;
      const d = ev.getOccurrenceDetails(next);
      if (isCancelled(d.item)) continue;
      const ce = toEvent(label, d.item, d.startDate, d.endDate, next.toString());
      if (overlaps(ce)) out.push(ce);
    }
  }
  return out;
}

async function fetchCalendar(): Promise<CalendarData> {
  // Private data: never serve it from a deployment that anyone with the link can open.
  if (process.env.VERCEL && !process.env.DASHBOARD_PASSWORD) {
    throw new SetupError("Calendar is hidden because this deployment has no password.", "Set DASHBOARD_PASSWORD in Vercel → Project → Settings → Environment Variables, then redeploy.");
  }
  const list = sources();
  if (!list.length) {
    throw new SetupError(
      "Add GOOGLE_CALENDAR_ICS to .env.local to show your calendar.",
      'Google Calendar → Settings → your calendar → Integrate calendar → "Secret address in iCal format". Format: Label|URL, comma-separated for several.',
    );
  }
  const todayKey = mtDateKey(Date.now());
  const rangeStart = mtMidnight(todayKey);
  const rangeEnd = mtMidnight(addDays(todayKey, CALENDAR_DAYS));

  const statuses: CalSourceStatus[] = [];
  const events: CalEvent[] = [];
  await Promise.all(
    list.map(async (s, i) => {
      try {
        const evs = parse(s.label, await fetchIcs(s.url), rangeStart, rangeEnd);
        events.push(...evs);
        statuses[i] = { label: s.label, ok: true };
      } catch (e) {
        statuses[i] = { label: s.label, ok: false, error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );
  if (statuses.every((s) => !s.ok)) throw new Error(statuses[0].error ?? "Calendar fetch failed");
  events.sort((a, b) => a.start - b.start || Number(b.allDay) - Number(a.allDay) || a.title.localeCompare(b.title));
  return { events, rangeStart, rangeEnd, calendars: statuses };
}

export async function GET(req: Request) {
  const res = await handle(
    req,
    "calendar",
    10 * 60_000,
    "Google Calendar (iCal)",
    fetchCalendar,
    "From your calendar's secret iCal address. Google generates that feed on its own schedule, so very recent edits can lag. Open Google Calendar for the live view.",
  );
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
