import { handle, getJson } from "@/lib/server/cache";
import { RESORTS, TZ } from "@/lib/config";
import type { SnowData } from "@/lib/snow-types";

export const dynamic = "force-dynamic";

type OM = {
  hourly_units: Record<string, string>;
  daily_units: Record<string, string>;
  current: Record<string, number>;
  hourly: { time: string[]; snowfall: number[] };
  daily: { time: string[]; snowfall_sum: number[] };
};

const sum = (a: number[], from: number, to: number) => a.slice(Math.max(from, 0), Math.max(to, 0)).reduce((s, v) => s + (v || 0), 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

async function fetchSnow(): Promise<SnowData> {
  // One request per resort because each needs its own elevation.
  const results = await Promise.all(
    RESORTS.map(async (r) => {
      const p = new URLSearchParams({
        latitude: String(r.lat),
        longitude: String(r.lon),
        elevation: String(r.elevationM),
        current: "temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code",
        hourly: "snowfall",
        daily: "snowfall_sum",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: TZ,
        past_days: "7",
        forecast_days: "7",
      });
      return { r, j: await getJson<OM>(`https://api.open-meteo.com/v1/forecast?${p}`) };
    }),
  );
  // Convert to inches based on the units the API reports (cm by default).
  const resorts = results.map(({ r, j }) => {
    const unit = j.hourly_units.snowfall;
    const k = unit === "cm" ? 1 / 2.54 : unit === "mm" ? 1 / 25.4 : 1;
    const h = j.hourly.snowfall.map((v) => (v ?? 0) * k);
    const dailyVals = j.daily.snowfall_sum.map((v) => (v ?? 0) * (j.daily_units.snowfall_sum === "cm" ? 1 / 2.54 : 1));
    // Current hour index (timezone-local string compare).
    const nowKey = j.current && (j.current as unknown as { time: string }).time ? (j.current as unknown as { time: string }).time.slice(0, 13) : "";
    let idx = j.hourly.time.findIndex((t) => t.slice(0, 13) === nowKey);
    if (idx < 0) idx = 7 * 24;
    // "Overnight" = hours after the most recent 6 PM (each hourly value is the hour ending at that time).
    let eve = idx - 1;
    while (eve > 0 && j.hourly.time[eve].slice(11, 13) !== "18") eve--;
    return {
      id: r.id,
      name: r.name,
      elevationFt: Math.round(r.elevationM * 3.281),
      current: { temp: j.current.temperature_2m, wind: j.current.wind_speed_10m, gust: j.current.wind_gusts_10m, code: j.current.weather_code },
      past: { overnight: r1(sum(h, eve + 1, idx + 1)), h24: r1(sum(h, idx - 23, idx + 1)), h48: r1(sum(h, idx - 47, idx + 1)), d7: r1(sum(h, idx - 167, idx + 1)) },
      next: { h24: r1(sum(h, idx + 1, idx + 25)), h48: r1(sum(h, idx + 1, idx + 49)), h72: r1(sum(h, idx + 1, idx + 73)), d7: r1(sum(h, idx + 1, idx + 169)) },
      daily: j.daily.time.map((date, i) => ({ date, snow: r1(dailyVals[i]), kind: (i < 7 ? "past" : i === 7 ? "today" : "future") as "past" | "today" | "future" })),
    };
  });
  return { resorts, asOf: results[0].j.current ? String((results[0].j.current as unknown as { time: string }).time) : "" };
}

export async function GET(req: Request) {
  return handle(
    req,
    "snow",
    20 * 60_000,
    "Open-Meteo (mid-mountain elevation)",
    fetchSnow,
    "Snowfall figures are weather-model estimates (past) and forecasts (future) at mid-mountain elevation — not resort-reported totals. Lift/trail counts and base depth come from each resort's official report; no public API exists, so use the links.",
  );
}
