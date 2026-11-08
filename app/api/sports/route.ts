import { handle, getJson } from "@/lib/server/cache";
import { SPORTS_TEAMS, type SportsTeam } from "@/lib/config";
import type { SportsData, SportsGame, SportsTeamResult } from "@/lib/sports-types";

export const dynamic = "force-dynamic";

// ESPN's public site API (no key). Undocumented, so every field is read defensively.
const BASE = "https://site.api.espn.com/apis/site/v2/sports";

type Score = { value?: number; displayValue?: string } | string | number | undefined;
type Competitor = {
  homeAway?: "home" | "away";
  winner?: boolean;
  score?: Score;
  team?: { abbreviation?: string; shortDisplayName?: string; displayName?: string };
};
type EspnEvent = {
  id?: string;
  date?: string;
  links?: { rel?: string[]; href?: string }[];
  competitions?: {
    status?: { type?: { state?: string; completed?: boolean; shortDetail?: string; detail?: string } };
    competitors?: Competitor[];
  }[];
};

function num(s: Score): number | undefined {
  const v = typeof s === "object" && s ? (s.value ?? Number(s.displayValue)) : Number(s);
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toGame(t: SportsTeam, e: EspnEvent): SportsGame | null {
  const c = e.competitions?.[0];
  const start = e.date ? Date.parse(e.date) : NaN;
  const cs = c?.competitors ?? [];
  const us = cs.find((x) => x.team?.abbreviation?.toLowerCase() === t.team);
  const them = cs.find((x) => x !== us);
  if (!c || !e.id || !us || !them || Number.isNaN(start)) return null;
  const st = c.status?.type;
  const state = st?.state === "in" ? "in" : st?.state === "post" || st?.completed ? "post" : "pre";
  const g: SportsGame = {
    id: e.id,
    start,
    state,
    detail: st?.shortDetail ?? st?.detail ?? "",
    home: us.homeAway === "home",
    opponent: them.team?.shortDisplayName ?? them.team?.displayName ?? them.team?.abbreviation ?? "TBD",
    opponentAbbr: them.team?.abbreviation ?? "",
    url:
      e.links?.find((l) => l.rel?.includes("summary") && l.rel.includes("desktop"))?.href ??
      `https://www.espn.com/${t.league.split("/")[1]}/game/_/gameId/${e.id}`,
  };
  if (state !== "pre") {
    g.us = num(us.score);
    g.them = num(them.score);
  }
  if (state === "post" && g.us != null && g.them != null) {
    g.result = us.winner ? "W" : them.winner ? "L" : g.us === g.them ? "T" : g.us > g.them ? "W" : "L";
  }
  // Postponed / canceled games come back as "post" without scores; don't present them as results.
  if (state === "post" && !g.result) return null;
  return g;
}

async function fetchTeam(t: SportsTeam): Promise<SportsTeamResult> {
  const base = { id: t.id, name: t.name, url: t.url };
  try {
    const j = await getJson<{ events?: EspnEvent[] }>(`${BASE}/${t.league}/teams/${t.team}/schedule`);
    if (!Array.isArray(j.events)) throw new Error("ESPN returned an unexpected payload");
    const games = j.events.map((e) => toGame(t, e)).filter((g): g is SportsGame => !!g).sort((a, b) => a.start - b.start);
    return {
      ...base,
      last: games.filter((g) => g.state === "post").at(-1),
      live: games.find((g) => g.state === "in"),
      next: games.find((g) => g.state === "pre" && g.start > Date.now() - 6 * 3600_000),
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function fetchSports(): Promise<SportsData> {
  const teams = await Promise.all(SPORTS_TEAMS.map(fetchTeam));
  // Only fail the route (so the cache keeps serving the last good value as stale) when every team failed.
  if (teams.every((t) => t.error)) throw new Error(teams[0]?.error ?? "ESPN unavailable");
  return { teams };
}

export async function GET(req: Request) {
  return handle(
    req,
    "sports",
    5 * 60_000,
    "ESPN",
    fetchSports,
    "Final scores and schedules from ESPN's public team schedule data. Live scores can lag; check ESPN for the current score.",
  );
}
