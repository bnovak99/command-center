"use client";
import { useState } from "react";
import { PlaySquare, Plus, X } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi, useLocalPref } from "@/lib/hooks";
import { REFRESH, DEFAULT_YT_TOPICS, DEFAULT_YT_CHANNELS } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import type { YouTubeData, Video, SubsData } from "@/lib/youtube-types";

export const youtubePath = (topics: string[]) => `/api/youtube?topics=${encodeURIComponent(topics.join("|"))}`;
const dur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
};
const views = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n));

export function YouTubeWidget() {
  const [mode, setMode, ready] = useLocalPref<"topics" | "subs">("ytMode", "topics");
  const toggle = (
    <div className="flex rounded-lg border border-line p-0.5 text-xs">
      {(["topics", "subs"] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} className={`rounded-md px-2 py-1 ${mode === m ? "bg-surface2 text-fg" : "text-muted"}`}>
          {m === "topics" ? "Topics" : "Subscriptions"}
        </button>
      ))}
    </div>
  );
  if (!ready) return <TopicsWidget toggle={toggle} />;
  return mode === "subs" ? <SubsWidget toggle={toggle} /> : <TopicsWidget toggle={toggle} />;
}

// Phone: 4 compact rows (thumbnail beside the title). Wider: at most two rows of the 2 / 4 column grid, so 4 / 8 videos.
const rowLimit = (i: number) => (i < 4 ? "flex sm:block" : "hidden xl:block");

function VideoGrid({ list }: { list: Video[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {list.slice(0, 8).map((v, i) => (
                <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className={`group min-w-0 gap-3 ${rowLimit(i)}`}>
                  <div className="relative w-32 shrink-0 self-start overflow-hidden rounded-lg bg-surface2 sm:w-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumb} alt="" loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-[1.03]" />
                    <span className="num absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">{dur(v.durationSec)}</span>
                  </div>
                  <div className="min-w-0">
                  <h3 className="line-clamp-2 sm:mt-2 text-sm font-medium leading-snug group-hover:text-accent">{v.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{v.channel}</p>
                  <p className="num text-[11px] text-faint">{timeAgo(v.publishedAt)} · {views(v.views)} views · {v.topic}</p>
                  </div>
                </a>
              ))}
            </div>
  );
}

function TopicsWidget({ toggle }: { toggle: React.ReactNode }) {
  const [topics, setTopics, ready] = useLocalPref<string[]>("ytTopics", DEFAULT_YT_TOPICS);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const { res, networkError, loading, validating, refresh } = useApi<YouTubeData>(ready ? youtubePath(topics) : null, REFRESH.youtube);
  const add = () => {
    const t = input.trim();
    if (t && !topics.includes(t) && topics.length < 10) setTopics([...topics, t]);
    setInput("");
  };
  return (
    <Widget
      title="YouTube · last 24 hours"
      icon={<PlaySquare className="size-4 text-down" />}
      res={res}
      networkError={networkError}
      loading={loading || !ready}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.videos.length === 0}
      emptyText="No new (non-Short) videos for your topics in the last 24 hours."
      actions={<>{res?.ok && <span className="num hidden text-[11px] text-faint md:inline">~{res.data.quota.usedToday.toLocaleString()} / 10,000 quota units today</span>}{toggle}</>}
    >
      {(d) => {
        const list = filter ? d.videos.filter((v) => v.topic === filter) : d.videos;
        return (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <button onClick={() => setFilter(null)} className={`rounded-full px-3 py-1 text-xs ${!filter ? "bg-fg text-bg" : "bg-surface2 text-muted"}`}>All</button>
              {topics.map((t) => (
                <span key={t} className={`group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${filter === t ? "bg-fg text-bg" : "bg-surface2 text-muted"}`}>
                  <button onClick={() => setFilter(filter === t ? null : t)}>{t}</button>
                  <button onClick={() => setTopics(topics.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="opacity-50 hover:opacity-100"><X className="size-3" /></button>
                </span>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-1">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add topic" aria-label="Add topic" className="w-28 rounded-full border border-line bg-transparent px-3 py-1 text-xs outline-none focus:border-accent" />
                <button type="submit" aria-label="Add topic" className="rounded-full border border-line p-1 text-muted hover:text-fg"><Plus className="size-3" /></button>
              </form>
            </div>
            <VideoGrid list={list} />
            {d.failedTopics.length > 0 && <p className="mt-3 text-xs text-warn">Couldn’t search: {d.failedTopics.map((f) => f.topic).join(", ")}</p>}
          </div>
        );
      }}
    </Widget>
  );
}

function SubsWidget({ toggle }: { toggle: React.ReactNode }) {
  const [channels, setChannels, ready] = useLocalPref<string[]>("ytChannels", DEFAULT_YT_CHANNELS);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const path = ready ? `/api/youtube-subs?channels=${encodeURIComponent(channels.join("|"))}` : null;
  const { res, networkError, loading, validating, refresh } = useApi<SubsData>(path, 30 * 60_000);
  const add = () => {
    const t = input.trim();
    if (t && !channels.includes(t) && channels.length < 60) setChannels([...channels, t]);
    setInput("");
  };
  return (
    <Widget
      title="YouTube · my channels (last 7 days)"
      icon={<PlaySquare className="size-4 text-down" />}
      res={res}
      networkError={networkError}
      loading={loading || !ready}
      validating={validating}
      onRefresh={refresh}
      actions={toggle}
    >
      {(d) => {
        const bad = d.channels.filter((c) => c.error);
        const list = filter ? d.videos.filter((v) => v.channel === filter) : d.videos;
        return (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <button onClick={() => setFilter(null)} className={`rounded-full px-3 py-1 text-xs ${!filter ? "bg-fg text-bg" : "bg-surface2 text-muted"}`}>All</button>
              {d.channels.filter((c) => !c.error).map((c) => (
                <span key={c.input} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${filter === c.name ? "bg-fg text-bg" : "bg-surface2 text-muted"}`}>
                  <button onClick={() => setFilter(filter === c.name ? null : (c.name ?? null))}>{c.name}</button>
                  <button onClick={() => setChannels(channels.filter((x) => x !== c.input))} aria-label={`Remove ${c.name}`} className="opacity-50 hover:opacity-100"><X className="size-3" /></button>
                </span>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-1">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add @handle, URL or ID" aria-label="Add channel" className="w-48 rounded-full border border-line bg-transparent px-3 py-1 text-xs outline-none focus:border-accent" />
                <button type="submit" aria-label="Add channel" className="rounded-full border border-line p-1 text-muted hover:text-fg"><Plus className="size-3" /></button>
              </form>
            </div>
            {d.channels.length === 0 ? (
              <p className="py-6 text-sm text-muted">No channels yet. Add a channel above (an @handle, channel URL or UC… ID), or list them in <code>DEFAULT_YT_CHANNELS</code> in lib/config.ts.</p>
            ) : d.videos.length === 0 ? (
              <p className="py-6 text-sm text-muted">No new non-Short uploads from these channels in the last 7 days.</p>
            ) : (
              <VideoGrid list={list} />
            )}
            {bad.length > 0 && <p className="mt-3 text-xs text-warn">Couldn’t load: {bad.map((c) => `${c.input} (${c.error})`).join(", ")}</p>}
          </div>
        );
      }}
    </Widget>
  );
}
