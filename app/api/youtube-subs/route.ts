import { XMLParser } from "fast-xml-parser";
import { handle, getJson, cached, SetupError } from "@/lib/server/cache";
import type { Video, SubsData } from "@/lib/youtube-types";

export const dynamic = "force-dynamic";
const BASE = "https://www.googleapis.com/youtube/v3";
const WINDOW_MS = 7 * 24 * 3600_000;
const TTL = 30 * 60_000;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);


const isoToSec = (d: string) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
};

/** Accepts UC… ids, /channel/UC… URLs, @handles and youtube.com/@handle URLs. */
async function resolve(input: string, key: string): Promise<string> {
  const id = /(UC[\w-]{22})/.exec(input)?.[1];
  if (id) return id;
  const handle = /@([\w.\-]+)/.exec(input)?.[1] ?? (/^[\w.\-]+$/.test(input) ? input : undefined);
  if (!handle) throw new Error("Not a channel ID, URL or @handle");
  const r = await cached(`yt:handle:${handle.toLowerCase()}`, 30 * 24 * 3600_000, false, async () => {
    const j = await getJson<{ items?: { id: string }[] }>(`${BASE}/channels?${new URLSearchParams({ part: "id", forHandle: `@${handle}`, key })}`);
    if (!j.items?.[0]) throw new Error(`No channel found for @${handle}`);
    return j.items[0].id;
  });
  return r.value;
}

type RssVideo = { id: string; title: string; channel: string; publishedAt: number; thumb: string; views: number };

/** Fallback when the public RSS feed is unavailable: uploads playlist (UU…) via the Data API, ~1 unit per channel. */
async function apiFeed(id: string, key: string): Promise<{ name: string; videos: RssVideo[] }> {
  const j = await getJson<{ items?: { snippet: { title: string; videoOwnerChannelTitle?: string; channelTitle: string; thumbnails: Record<string, { url: string }>; resourceId: { videoId: string } }; contentDetails: { videoPublishedAt?: string } }[] }>(
    `${BASE}/playlistItems?${new URLSearchParams({ part: "snippet,contentDetails", playlistId: "UU" + id.slice(2), maxResults: "15", key })}`,
  );
  const items = j.items ?? [];
  const name = items[0]?.snippet.videoOwnerChannelTitle ?? items[0]?.snippet.channelTitle ?? id;
  return {
    name,
    videos: items.filter((i) => i.contentDetails.videoPublishedAt).map((i) => ({
      id: i.snippet.resourceId.videoId, title: i.snippet.title, channel: name, publishedAt: Date.parse(i.contentDetails.videoPublishedAt!),
      thumb: i.snippet.thumbnails.medium?.url ?? i.snippet.thumbnails.default?.url ?? "", views: 0,
    })),
  };
}

async function channelFeed(id: string, key: string): Promise<{ name: string; videos: RssVideo[] }> {
  const r = await cached(`yt:rss:${id}`, TTL, false, async () => {
    try {
      return await rssFeed(id);
    } catch {
      return apiFeed(id, key);
    }
  });
  return r.value;
}

async function rssFeed(id: string): Promise<{ name: string; videos: RssVideo[] }> {
  {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
    const doc = parser.parse(await res.text());
    const name = String(doc.feed?.author?.name ?? doc.feed?.title ?? id);
    const videos = arr<Record<string, any>>(doc.feed?.entry).map((e) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: String(e["yt:videoId"]),
      title: String(e.title),
      channel: name,
      publishedAt: Date.parse(e.published),
      thumb: e["media:group"]?.["media:thumbnail"]?.["@_url"] ?? `https://i.ytimg.com/vi/${e["yt:videoId"]}/mqdefault.jpg`,
      views: Number(e["media:group"]?.["media:community"]?.["media:statistics"]?.["@_views"] ?? 0),
    }));
    return { name, videos };
  }
}

async function fetchSubs(inputs: string[]): Promise<SubsData> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new SetupError("Add YOUTUBE_API_KEY to .env.local to enable this widget.");
  if (!inputs.length) return { videos: [], channels: [] };
  const channels: SubsData["channels"] = [];
  const recent: RssVideo[] = [];
  await Promise.all(inputs.map(async (input) => {
    try {
      const id = await resolve(input, key);
      const f = await channelFeed(id, key);
      channels.push({ input, id, name: f.name });
      recent.push(...f.videos.filter((v) => v.publishedAt >= Date.now() - WINDOW_MS));
    } catch (e) {
      channels.push({ input, error: e instanceof Error ? e.message : "failed" });
    }
  }));
  const videos: Video[] = [];
  for (let i = 0; i < recent.length; i += 50) {
    const chunk = recent.slice(i, i + 50);
    const r = await cached(`yt:subvideos:${chunk.map((c) => c.id).join(",")}`, 3 * 3600_000, false, () =>
      getJson<{ items: { id: string; contentDetails: { duration: string }; statistics: { viewCount?: string } }[] }>(`${BASE}/videos?${new URLSearchParams({ part: "contentDetails,statistics", id: chunk.map((c) => c.id).join(","), key })}`),
    );
    const dur = new Map(r.value.items.map((v) => [v.id, isoToSec(v.contentDetails.duration)]));
    const vw = new Map(r.value.items.map((v) => [v.id, Number(v.statistics.viewCount ?? 0)]));
    for (const c of chunk) {
      const d = dur.get(c.id);
      if (d === undefined || d <= 60 || /#shorts?\b/i.test(c.title)) continue;
      videos.push({ id: c.id, title: c.title, channel: c.channel, publishedAt: c.publishedAt, durationSec: d, views: vw.get(c.id) ?? c.views, thumb: c.thumb, topic: c.channel });
    }
  }
  videos.sort((a, b) => b.publishedAt - a.publishedAt);
  return { videos, channels };
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("channels") ?? "";
  const inputs = raw.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  return handle(req, `ytsubs:${inputs.join("|")}`, TTL, "YouTube channel RSS feeds + Data API (durations)", () => fetchSubs(inputs), "Uploads from the last 7 days from the channels you listed, via each channel's public RSS feed (falls back to the Data API uploads playlist, ~1 unit/channel, if the feed is down). Durations come from the Data API (1 unit per 50 videos); Shorts are filtered out.", 5 * 60_000);
}
