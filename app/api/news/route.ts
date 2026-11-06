import { XMLParser } from "fast-xml-parser";
import { handle } from "@/lib/server/cache";
import { NEWS_FEEDS, NEWS_CATEGORIES, CATEGORY_WEIGHT, type NewsCategory } from "@/lib/config";
import type { NewsData, Story } from "@/lib/news-types";

export const dynamic = "force-dynamic";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: true });
const STOP = new Set("a an the of in on at to for and or but is are was were be been with as by from after before over into out up down new says say will its it this that has have had not no more than amid about how why what who live update".split(" "));

const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return "";
};
const strip = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#8217;|&#039;|&#x27;/g, "'").replace(/&#8230;/g, "…").replace(/\s+/g, " ").trim();

type Raw = { title: string; link: string; source: string; category: NewsCategory; publishedAt: number; summary: string; image?: string };

function parseFeed(xml: string, source: string, category: NewsCategory): Raw[] {
  const doc = parser.parse(xml);
  const out: Raw[] = [];
  const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  for (const it of arr<Record<string, unknown>>(items)) {
    const title = strip(text(it.title));
    let link = "";
    if (typeof it.link === "string") link = it.link;
    else if (Array.isArray(it.link)) {
      const alt = (it.link as Record<string, string>[]).find((l) => !l["@_rel"] || l["@_rel"] === "alternate");
      link = alt?.["@_href"] ?? "";
    } else if (it.link && typeof it.link === "object") link = (it.link as Record<string, string>)["@_href"] ?? text(it.link);
    const dateStr = text(it.pubDate) || text(it.published) || text(it.updated) || text(it["dc:date"]);
    const ts = Date.parse(dateStr);
    const rawDesc = text(it.description) || text(it.summary) || text(it["content:encoded"]) || text(it.content);
    let image: string | undefined;
    const thumb = arr<Record<string, string>>(it["media:thumbnail"] as never)[0];
    const media = arr<Record<string, string>>(it["media:content"] as never).find((m) => !m["@_medium"] || m["@_medium"] === "image");
    const enc = it.enclosure as Record<string, string> | undefined;
    image = thumb?.["@_url"] ?? media?.["@_url"] ?? (enc && /image/.test(enc["@_type"] ?? "") ? enc["@_url"] : undefined);
    if (!image) image = /<img[^>]+src=["']([^"']+)["']/i.exec(rawDesc)?.[1];
    if (!title || !link || Number.isNaN(ts)) continue;
    let summary = strip(rawDesc);
    if (summary.length > 240) summary = summary.slice(0, 237).replace(/\s+\S*$/, "") + "…";
    out.push({ title, link, source, category, publishedAt: ts, summary, image: image?.startsWith("http") ? image : undefined });
  }
  return out;
}

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const tokens = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const jaccard = (a: Set<string>, b: Set<string>) => {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i || 1);
};

async function fetchNews(): Promise<NewsData> {
  const feeds: NewsData["feeds"] = [];
  const all: Raw[] = [];
  await Promise.all(
    NEWS_FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Mozilla/5.0 PersonalCommandCenter RSS reader", Accept: "application/rss+xml, application/xml, text/xml, */*" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = parseFeed(await res.text(), f.source, f.category);
        if (!items.length) throw new Error("No items parsed");
        all.push(...items);
        feeds.push({ source: f.source, ok: true, count: items.length });
      } catch (e) {
        feeds.push({ source: f.source, ok: false, count: 0, error: e instanceof Error ? e.message : "failed" });
      }
    }),
  );
  if (!all.length) throw new Error("All news feeds failed");

  const cutoff = Date.now() - 36 * 3600_000;
  const seen = new Set<string>();
  const recent = all.filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true))).filter((i) => i.publishedAt >= cutoff && i.publishedAt <= Date.now() + 3600_000).sort((a, b) => b.publishedAt - a.publishedAt);

  type Cluster = { tok: Set<string>; items: Raw[] };
  const clusters: Cluster[] = [];
  for (const it of recent) {
    const tk = tokens(it.title);
    const c = clusters.find((c) => jaccard(c.tok, tk) >= 0.5);
    if (c) c.items.push(it);
    else clusters.push({ tok: tk, items: [it] });
  }

  const now = Date.now();
  const stories: Story[] = clusters.map((c) => {
    const rep = [...c.items].sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0) || b.summary.length - a.summary.length)[0];
    const sources = [...new Set(c.items.map((i) => i.source))];
    const newest = Math.max(...c.items.map((i) => i.publishedAt));
    const hours = (now - newest) / 3600_000;
    const recency = Math.max(0, 1 - hours / 36);
    const score = (sources.length * 3 + recency * 2) * CATEGORY_WEIGHT[rep.category];
    return {
      id: hash(rep.link),
      title: rep.title, link: rep.link, source: rep.source, category: rep.category,
      publishedAt: rep.publishedAt, summary: rep.summary, image: rep.image,
      alsoCoveredBy: sources.filter((s) => s !== rep.source), outlets: sources.length, score,
    };
  });
  stories.sort((a, b) => b.score - a.score);

  const top = stories.slice(0, 8);
  const byCategory: Record<string, Story[]> = {};
  for (const cat of NEWS_CATEGORIES) byCategory[cat] = stories.filter((s) => s.category === cat).slice(0, 10);
  return { top, byCategory, feeds: feeds.sort((a, b) => a.source.localeCompare(b.source)) };
}

export async function GET(req: Request) {
  return handle(req, "news", 25 * 60_000, "Publisher RSS feeds", fetchNews, "Stories are grouped when headlines are near-duplicates; ranking = number of outlets covering + recency + category weight. Summaries are the feed's own descriptions.");
}
