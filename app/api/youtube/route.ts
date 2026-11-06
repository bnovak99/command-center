import { unstable_cache } from "next/cache";
import { handle, getJson, cached, SetupError } from "@/lib/server/cache";
import { DEFAULT_YT_TOPICS } from "@/lib/config";
import type { Video, YouTubeData } from "@/lib/youtube-types";

export const dynamic = "force-dynamic";
const BASE = "https://www.googleapis.com/youtube/v3";
const TTL = 3 * 3600_000;

const g = globalThis as unknown as { __yt_quota?: { day: string; units: number } };
const ptDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }); // quota resets at midnight Pacific
function addUnits(n: number) {
  const q = (g.__yt_quota ??= { day: ptDay(), units: 0 });
  if (q.day !== ptDay()) { q.day = ptDay(); q.units = 0; }
  q.units += n;
}
const used = () => ((g.__yt_quota ??= { day: ptDay(), units: 0 }).day === ptDay() ? g.__yt_quota!.units : 0);

const isoToSec = (d: string) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
};

type SearchRes = { items: { id: { videoId: string } }[] };
type VideosRes = { items: { id: string; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails: Record<string, { url: string }> }; contentDetails: { duration: string }; statistics: { viewCount?: string } }[] };

/**
 * Topic searches cost 100 units each, so they go through Next's Data Cache, which on Vercel is shared by every
 * server instance and survives cold starts. (The in-memory cache alone re-searched every topic on each new instance.)
 * The refresh button can't bypass this layer, on purpose: a search runs at most once per topic every 3 hours.
 */
const persistentSearch = unstable_cache(
  async (topic: string): Promise<string[]> => {
    const key = process.env.YOUTUBE_API_KEY ?? "";
    const after = new Date(Date.now() - 24 * 3600_000).toISOString();
    const p = new URLSearchParams({ part: "id", q: topic, type: "video", order: "date", publishedAfter: after, maxResults: "12", videoDuration: "any", key });
    addUnits(100);
    const j = await getJson<SearchRes>(`${BASE}/search?${p}`);
    return j.items.map((i) => i.id.videoId);
  },
  ["yt-search-v1"],
  { revalidate: TTL / 1000, tags: ["youtube-search"] },
);

async function searchTopic(topic: string, force: boolean) {
  const r = await cached(`yt:search:${topic.toLowerCase()}`, TTL, force, () => persistentSearch(topic.toLowerCase()), 15 * 60_000);
  return r.value;
}

async function fetchYouTube(topics: string[], force: boolean): Promise<YouTubeData> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new SetupError("Add YOUTUBE_API_KEY to .env.local to enable this widget.", "Create a key at console.cloud.google.com (enable YouTube Data API v3). Free quota: 10,000 units/day.");
  const failedTopics: YouTubeData["failedTopics"] = [];
  const before = used();
  const topicIds = new Map<string, string[]>();
  await Promise.all(topics.map(async (t) => {
    try { topicIds.set(t, await searchTopic(t, force)); }
    catch (e) { failedTopics.push({ topic: t, error: e instanceof Error ? e.message : "failed" }); }
  }));
  if (failedTopics.length === topics.length && failedTopics.length > 0) {
    const e = failedTopics[0].error;
    // Quota resets at midnight Pacific, which is always 1 AM Mountain.
    if (/429/.test(e)) throw new Error("YouTube's daily search quota is used up. It resets at 1:00 AM MT.");
    if (/400|403/.test(e)) throw new SetupError(`YouTube API rejected the request (${e}).`, "Check YOUTUBE_API_KEY and that YouTube Data API v3 is enabled; the daily quota may also be exhausted.");
    throw new Error(e);
  }
  const idTopic = new Map<string, string>();
  for (const [t, ids] of topicIds) for (const id of ids) if (!idTopic.has(id)) idTopic.set(id, t);
  const ids = [...idTopic.keys()];
  const videos: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const r = await cached(`yt:videos:${chunk.join(",")}`, TTL, false, async () => {
      addUnits(1);
      return getJson<VideosRes>(`${BASE}/videos?${new URLSearchParams({ part: "snippet,contentDetails,statistics", id: chunk.join(","), key })}`);
    });
    for (const v of r.value.items) {
      const dur = isoToSec(v.contentDetails.duration);
      if (dur <= 60 || /#shorts?\b/i.test(v.snippet.title)) continue; // filter Shorts (<=60 s or tagged #shorts)
      videos.push({
        id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle, publishedAt: Date.parse(v.snippet.publishedAt), durationSec: dur,
        views: Number(v.statistics.viewCount ?? 0), thumb: v.snippet.thumbnails.medium?.url ?? v.snippet.thumbnails.default?.url ?? "", topic: idTopic.get(v.id)!,
      });
    }
  }
  videos.sort((a, b) => b.publishedAt - a.publishedAt);
  return { videos: videos.filter((v) => v.publishedAt >= Date.now() - 24 * 3600_000), failedTopics, quota: { usedToday: used(), limit: 10000, lastCallUnits: used() - before } };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("topics");
  const topics = (raw === null ? DEFAULT_YT_TOPICS : raw.split("|")).map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const force = url.searchParams.get("refresh") === "1";
  return handle(req, `youtube:${topics.join("|")}`, TTL, "YouTube Data API v3", () => fetchYouTube(topics, force), "Searches are cached for 3 hours. Quota use is an approximate count since this server started (search = 100 units, details = 1 unit).", 15 * 60_000);
}
