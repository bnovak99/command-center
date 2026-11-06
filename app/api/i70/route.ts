import { handle, getJson } from "@/lib/server/cache";
import { I70_CORRIDOR } from "@/lib/config";
import type { I70Alert, I70Data } from "@/lib/i70-types";

export const dynamic = "force-dynamic";

// CDOT's COtrip map reads this keyless GeoJSON feed (configured in 511.cotrip.org/configs/main.json).
// Bare paths answer {"healthy":true}, so a payload without `features` is treated as a failure, never as "no alerts".
const BASE = "https://api-511x-co.carsprogram.org/events/map-features?eventClassifications=";
const LAYERS: { kind: I70Alert["kind"]; cls: string }[] = [
  { kind: "chain-law", cls: "chainLaws" },
  { kind: "closure", cls: "roadClosures" },
];

type Ms = { time?: number };
type Feature = {
  properties: {
    id?: string;
    title?: string;
    route?: string;
    updated?: number;
    eventReport?: {
      location?: { primaryPoint?: { linearReference?: number }; secondaryPoint?: { linearReference?: number }; linkDirection?: string; routePositiveBearing?: string };
      beginTime?: Ms;
      scheduleOccurrences?: { startTime?: Ms; endTime?: Ms }[];
    };
  };
};

const BEARING: Record<string, [I70Alert["direction"], I70Alert["direction"]]> = { E: ["eastbound", "westbound"], W: ["westbound", "eastbound"] };

function direction(loc: NonNullable<NonNullable<Feature["properties"]["eventReport"]>["location"]>): I70Alert["direction"] {
  if (loc.linkDirection === "BOTH_DIRECTIONS") return "both";
  const pair = BEARING[loc.routePositiveBearing ?? ""];
  if (pair && loc.linkDirection === "POSITIVE_DIRECTION") return pair[0];
  if (pair && loc.linkDirection === "NEGATIVE_DIRECTION") return pair[1];
  return "unknown";
}

/** In effect right now? CDOT's `active` flag is also true for scheduled future work, so trust the schedule. */
function inEffect(f: Feature, now: number) {
  const er = f.properties.eventReport ?? {};
  const windows = er.scheduleOccurrences ?? [];
  if (!windows.length) return !(er.beginTime?.time && er.beginTime.time > now);
  return windows.some((w) => (!w.startTime?.time || w.startTime.time <= now) && (!w.endTime?.time || w.endTime.time >= now));
}

async function fetchI70(): Promise<I70Data> {
  const now = Date.now();
  const { route, minMp, maxMp, label } = I70_CORRIDOR;
  const layers = await Promise.all(
    LAYERS.map(async (l) => {
      const j = await getJson<{ features?: Feature[] }>(`${BASE}${l.cls}`, { headers: { Accept: "application/json", "content-language": "en" } });
      if (!Array.isArray(j.features)) throw new Error("COtrip returned an unexpected payload");
      return j.features.map((f) => ({ f, kind: l.kind }));
    }),
  );
  const alerts: I70Alert[] = [];
  for (const { f, kind } of layers.flat()) {
    const p = f.properties;
    if (p.route !== route || !inEffect(f, now)) continue;
    const loc = p.eventReport?.location ?? {};
    const mps = [loc.primaryPoint?.linearReference, loc.secondaryPoint?.linearReference].filter((n): n is number => typeof n === "number");
    if (!mps.length || Math.min(...mps) > maxMp || Math.max(...mps) < minMp) continue;
    alerts.push({
      id: String(p.id),
      kind,
      headline: (p.title ?? "").replace(/<[^>]+>/g, "").trim() || (kind === "chain-law" ? "Chain law in effect" : "Road closed"),
      direction: direction(loc),
      fromMp: Math.round(Math.min(...mps)),
      toMp: Math.round(Math.max(...mps)),
      updated: p.updated,
      url: "https://www.cotrip.org/", // COtrip has no stable per-event deep link (event URLs redirect home)
    });
  }
  // Chain laws first, then full closures, then by mile point (west to east).
  alerts.sort((a, b) => (a.kind === b.kind ? (a.fromMp ?? 0) - (b.fromMp ?? 0) : a.kind === "chain-law" ? -1 : 1));
  return { corridor: label, alerts };
}

export async function GET(req: Request) {
  return handle(
    req,
    "i70",
    5 * 60_000,
    "CDOT COtrip",
    fetchI70,
    `Chain-law and closure events CDOT has posted for ${I70_CORRIDOR.label} (mile points ${I70_CORRIDOR.minMp}–${I70_CORRIDOR.maxMp}). Check cotrip.org before you drive.`,
  );
}
