import { handle, getJson } from "@/lib/server/cache";
import { LOCATIONS, TZ } from "@/lib/config";
import type { WeatherData, Alert } from "@/lib/weather-types";

export const dynamic = "force-dynamic";

type OM = {
  current: Record<string, number>;
  hourly: Record<string, number[] | string[]>;
  daily: Record<string, (number | string)[]>;
};

async function fetchWeather(): Promise<WeatherData> {
  const lat = LOCATIONS.map((l) => l.lat).join(",");
  const lon = LOCATIONS.map((l) => l.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code,snowfall",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,snowfall_sum",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: TZ,
    forecast_days: "7",
    forecast_hours: "24",
  });
  const raw = await getJson<OM | OM[]>(`https://api.open-meteo.com/v1/forecast?${params}`);
  const arr = Array.isArray(raw) ? raw : [raw];

  const locations = LOCATIONS.map((loc, i) => {
    const r = arr[i];
    const h = r.hourly as Record<string, (number | string)[]>;
    const d = r.daily;
    return {
      id: loc.id,
      name: loc.name,
      region: loc.region,
      hasSnow: loc.region === "mountains",
      current: {
        temp: r.current.temperature_2m,
        feels: r.current.apparent_temperature,
        humidity: r.current.relative_humidity_2m,
        code: r.current.weather_code,
        wind: r.current.wind_speed_10m,
        windDir: r.current.wind_direction_10m,
        gust: r.current.wind_gusts_10m,
        isDay: r.current.is_day === 1,
      },
      hourly: (h.time as string[]).map((t, k) => ({
        t,
        temp: h.temperature_2m[k] as number,
        pop: h.precipitation_probability[k] as number,
        code: h.weather_code[k] as number,
        snow: h.snowfall[k] as number,
      })),
      daily: (d.time as string[]).map((t, k) => ({
        date: t,
        code: d.weather_code[k] as number,
        hi: d.temperature_2m_max[k] as number,
        lo: d.temperature_2m_min[k] as number,
        pop: d.precipitation_probability_max[k] as number,
        sunrise: d.sunrise[k] as string,
        sunset: d.sunset[k] as string,
        uv: d.uv_index_max[k] as number,
        snow: d.snowfall_sum[k] as number,
      })),
    };
  });

  let alertsError: string | undefined;
  const alertMap = new Map<string, Alert>();
  const ua = process.env.NWS_USER_AGENT || "PersonalCommandCenter";
  const results = await Promise.allSettled(
    LOCATIONS.map((loc) =>
      getJson<{ features: { id: string; properties: Record<string, string | null> }[] }>(
        `https://api.weather.gov/alerts/active?point=${loc.lat},${loc.lon}`,
        { headers: { "User-Agent": ua, Accept: "application/geo+json" } },
      ).then((j) => ({ loc, j })),
    ),
  );
  let failed = 0;
  for (const r of results) {
    if (r.status === "rejected") {
      failed++;
      continue;
    }
    for (const f of r.value.j.features) {
      const p = f.properties;
      const ex = alertMap.get(f.id);
      if (ex) ex.locations.push(r.value.loc.name);
      else
        alertMap.set(f.id, {
          id: f.id,
          event: p.event ?? "Alert",
          severity: p.severity ?? "Unknown",
          headline: p.headline ?? "",
          description: (p.description ?? "").slice(0, 600),
          areas: p.areaDesc ?? "",
          ends: p.ends ?? p.expires ?? null,
          sender: p.senderName ?? "NWS",
          locations: [r.value.loc.name],
        });
    }
  }
  if (failed) alertsError = `NWS alerts unavailable for ${failed} of ${LOCATIONS.length} locations.`;
  const order = ["Extreme", "Severe", "Moderate", "Minor", "Unknown"];
  const alerts = [...alertMap.values()].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  return { locations, alerts, alertsError };
}

export async function GET(req: Request) {
  return handle(req, "weather", 10 * 60_000, "Open-Meteo forecast · NWS alerts", fetchWeather, "Current conditions are model analysis values from Open-Meteo, not station observations. Alerts come from api.weather.gov.");
}
