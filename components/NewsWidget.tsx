"use client";
import { useState } from "react";
import { Newspaper, ExternalLink } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi } from "@/lib/hooks";
import { REFRESH, NEWS_CATEGORIES } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import type { NewsData, Story } from "@/lib/news-types";

export const NEWS_PATH = "/api/news";

export function NewsWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<NewsData>(NEWS_PATH, REFRESH.news);
  const [tab, setTab] = useState<string>("Top stories");
  return (
    <Widget
      title="Today’s news"
      icon={<Newspaper className="size-4 text-accent" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.top.length === 0}
      emptyText="No recent stories found in the configured feeds."
    >
      {(d) => {
        const tabs = ["Top stories", ...NEWS_CATEGORIES];
        const list = tab === "Top stories" ? d.top : d.byCategory[tab] ?? [];
        const failed = d.feeds.filter((f) => !f.ok);
        return (
          <div>
            <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-2rem),transparent)] sm:mx-0 sm:px-0 sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${tab === t ? "bg-fg text-bg" : "bg-surface2 text-muted hover:text-fg"}`}>
                  {t}
                </button>
              ))}
            </div>
            {list.length === 0 ? (
              <p className="py-6 text-sm text-muted">No stories in this category right now.</p>
            ) : (
              <ul className="grid gap-x-6 lg:grid-cols-2">
                {list.map((s) => (
                  <StoryRow key={s.id} s={s} showCat={tab === "Top stories"} />
                ))}
              </ul>
            )}
            {failed.length > 0 && (
              <p className="mt-4 text-xs text-warn">
                Feeds unavailable: {failed.map((f) => `${f.source} (${f.error})`).join(", ")}
              </p>
            )}
          </div>
        );
      }}
    </Widget>
  );
}

function StoryRow({ s, showCat }: { s: Story; showCat: boolean }) {
  return (
    <li className="border-b border-line py-3 last:border-0">
      <a href={s.link} target="_blank" rel="noreferrer" className="group flex gap-3">
        {s.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg bg-surface2 object-cover sm:size-20" onError={(e) => (e.currentTarget.style.display = "none")} />
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-medium leading-snug group-hover:text-accent">
            {s.title} <ExternalLink className="ml-0.5 inline size-3 opacity-0 transition group-hover:opacity-60" />
          </h3>
          <div className="mt-1 text-xs text-muted">
            {s.source} · <span className="num">{timeAgo(s.publishedAt)}</span>
            {showCat && <> · {s.category}</>}
            {s.alsoCoveredBy.length > 0 && <span className="text-faint"> · also: {s.alsoCoveredBy.slice(0, 3).join(", ")}{s.alsoCoveredBy.length > 3 ? ` +${s.alsoCoveredBy.length - 3}` : ""}</span>}
          </div>
          {s.summary && <p className="mt-1 line-clamp-2 text-xs text-faint">{s.summary}</p>}
        </div>
      </a>
    </li>
  );
}
