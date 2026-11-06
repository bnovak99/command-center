"use client";
import { RefreshCw, AlertTriangle, KeyRound, Inbox, ChevronDown } from "lucide-react";
import { fmtTime } from "@/lib/format";
import { useLocalPref } from "@/lib/hooks";
import type { ApiResponse } from "@/lib/types";

type Props<T> = {
  title: string;
  icon?: React.ReactNode;
  res?: ApiResponse<T>;
  networkError?: Error;
  loading: boolean;
  validating?: boolean;
  onRefresh: () => void;
  isEmpty?: (d: T) => boolean;
  emptyText?: string;
  actions?: React.ReactNode;
  skeleton?: React.ReactNode;
  className?: string;
  /** Stable key for the remembered collapsed state; defaults to a slug of the title. */
  collapseId?: string;
  children: (data: T) => React.ReactNode;
};

export function Widget<T>({ title, icon, res, networkError, loading, validating, onRefresh, isEmpty, emptyText, actions, skeleton, className = "", collapseId, children }: Props<T>) {
  const id = collapseId ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [collapsed, setCollapsed] = useLocalPref<boolean>(`collapsed:${id}`, false);
  const bodyId = `widget-body-${id}`;
  // When collapsed, still surface that something is wrong so stale/failed data isn't hidden silently.
  const problem =
    !res && !loading
      ? "Couldn’t load this widget"
      : res && !res.ok
        ? res.needsSetup ? "Setup needed" : "Couldn’t load this widget"
        : res?.ok && res.stale
          ? "Refresh failed — showing older data"
          : null;
  let body: React.ReactNode;
  if (!res && loading) {
    body = skeleton ?? (
      <div className="space-y-3">
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-5 w-2/3" />
      </div>
    );
  } else if (!res) {
    body = <ErrorState msg={networkError?.message ?? "Could not reach the server."} />;
  } else if (!res.ok) {
    body = res.needsSetup ? (
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface2 p-4 text-sm">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-warn" />
        <div>
          <div className="font-medium">Setup needed</div>
          <div className="text-muted">{res.error}</div>
          {res.hint && <div className="mt-1 text-faint">{res.hint}</div>}
        </div>
      </div>
    ) : (
      <ErrorState msg={res.error} />
    );
  } else if (isEmpty?.(res.data)) {
    body = (
      <div className="flex items-center gap-2 py-6 text-sm text-muted">
        <Inbox className="size-4" /> {emptyText ?? "Nothing to show right now."}
      </div>
    );
  } else {
    body = <div className="fadein">{children(res.data)}</div>;
  }

  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      <header className={`${collapsed ? "" : "mb-4 "}flex flex-wrap items-center gap-x-3 gap-y-1`}>
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {icon}
          {title}
          {collapsed && problem && (
            <span title={problem} aria-label={problem} className="inline-flex">
              <AlertTriangle className={`size-3.5 ${res?.ok ? "text-warn" : "text-down"}`} />
            </span>
          )}
        </h2>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          {res?.ok && (
            <span className="hidden sm:inline">
              {res.source} · <span className="num">Updated {fmtTime(res.fetchedAt)}</span>
            </span>
          )}
          {!collapsed && actions}
          <button
            onClick={onRefresh}
            aria-label={`Refresh ${title}`}
            className="rounded-md p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <RefreshCw className={`size-3.5 ${validating ? "spin" : ""}`} />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
            title={collapsed ? "Expand" : "Collapse"}
            className="-ml-1.5 rounded-md p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
          </button>
        </div>
        {res?.ok && (
          <div className="w-full text-xs text-muted sm:hidden">
            {res.source} · <span className="num">Updated {fmtTime(res.fetchedAt)}</span>
          </div>
        )}
      </header>
      {!collapsed && (
        <div id={bodyId}>
          {res?.ok && res.stale && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
              <AlertTriangle className="size-3.5" /> Refresh failed — showing older data from {fmtTime(res.fetchedAt)}.
            </div>
          )}
          {body}
          {res?.ok && res.note && <p className="mt-4 text-xs leading-relaxed text-faint">{res.note}</p>}
        </div>
      )}
    </section>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-down/40 bg-down/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-down" />
      <div>
        <div className="font-medium">Couldn’t load this widget</div>
        <div className="text-muted">{msg}</div>
      </div>
    </div>
  );
}
