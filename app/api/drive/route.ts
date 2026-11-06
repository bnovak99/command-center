import { handle, getJson, cached, SetupError } from "@/lib/server/cache";
import { DRIVE_DESTINATIONS } from "@/lib/config";
import type { DriveData, DriveTime } from "@/lib/drive-types";

export const dynamic = "force-dynamic";
const BASE = "https://api.tomtom.com";

type Route = { routes: { summary: { lengthInMeters: number; travelTimeInSeconds: number; trafficDelayInSeconds: number } }[] };

async function geocode(address: string, key: string) {
  const r = await cached(`drive:geo:${address}`, 30 * 24 * 3600_000, false, async () => {
    const j = await getJson<{ results: { position: { lat: number; lon: number } }[] }>(
      `${BASE}/search/2/geocode/${encodeURIComponent(address)}.json?key=${key}&limit=1&countrySet=US`,
    );
    const p = j.results?.[0]?.position;
    if (!p) throw new Error("Could not geocode HOME_ADDRESS");
    return p;
  });
  return r.value;
}

async function fetchDrive(): Promise<DriveData> {
  const key = process.env.TOMTOM_API_KEY;
  const address = process.env.HOME_ADDRESS;
  if (!key) throw new SetupError("Add TOMTOM_API_KEY to .env.local to enable drive times.", "Free key at developer.tomtom.com (2,500 requests/day, includes live traffic).");
  if (!address) throw new SetupError("Add HOME_ADDRESS to .env.local (your street address) to enable drive times.");
  let from;
  try {
    from = await geocode(address, key);
  } catch (e) {
    if (e instanceof Error && /401|403/.test(e.message)) throw new SetupError("TomTom rejected TOMTOM_API_KEY.", "Check the key at developer.tomtom.com and restart the dev server.");
    throw e;
  }
  const departAt = Date.now();
  const destinations = await Promise.all(
    DRIVE_DESTINATIONS.map(async (d): Promise<DriveTime> => {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(address)}&destination=${d.lat},${d.lon}&travelmode=driving`;
      try {
        const j = await getJson<Route>(`${BASE}/routing/1/calculateRoute/${from.lat},${from.lon}:${d.lat},${d.lon}/json?key=${key}&traffic=true&travelMode=car&routeType=fastest`);
        const s = j.routes[0].summary;
        return {
          id: d.id, name: d.name, mapsUrl,
          minutes: Math.round(s.travelTimeInSeconds / 60),
          delayMinutes: Math.round(s.trafficDelayInSeconds / 60),
          miles: Math.round(s.lengthInMeters / 1609.344),
        };
      } catch (e) {
        return { id: d.id, name: d.name, mapsUrl, error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );
  if (destinations.every((d) => d.error)) throw new Error(destinations[0].error ?? "Routing failed");
  return { origin: "Home", destinations, departAt };
}

export async function GET(req: Request) {
  return handle(req, "drive", 5 * 60_000, "TomTom Routing", fetchDrive, "Estimates for leaving now using TomTom live traffic. Not a reported observation; conditions change. Tap a row for a live Google Maps route.");
}
