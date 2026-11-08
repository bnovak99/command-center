"use client";
import { Package, Mail, ExternalLink } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi } from "@/lib/hooks";
import { REFRESH } from "@/lib/config";
import { fmtDayTime, timeAgo } from "@/lib/format";
import type { PackageItem, PackageStatus, PackagesData } from "@/lib/packages-types";

const LABEL: Record<PackageStatus, { text: string; tone: string }> = {
  out_for_delivery: { text: "Out for delivery", tone: "text-accent" },
  exception: { text: "Needs attention", tone: "text-down" },
  in_transit: { text: "In transit", tone: "text-fg" },
  shipped: { text: "Shipped", tone: "text-muted" },
  ordered: { text: "Ordered", tone: "text-faint" },
  delivered: { text: "Delivered", tone: "text-up" },
};

function Row({ p }: { p: PackageItem }) {
  const s = LABEL[p.status];
  return (
    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{p.merchant}</span>
          <span className="num shrink-0 text-[11px] text-faint">
            {p.carrier}
            {p.trackingLast4 ? ` ··${p.trackingLast4}` : ""}
          </span>
        </div>
        <div className="truncate text-xs text-muted" title={p.subject}>{p.subject}</div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:text-right">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 sm:block">
          <div className={`text-sm font-medium ${s.tone}`}>{s.text}</div>
          <div className="num text-[11px] text-faint" title={`Email received ${fmtDayTime(p.statusAt)} MT`}>
            {p.eta ? `Est. ${p.eta} · ` : ""}email {timeAgo(p.statusAt)}
          </div>
        </div>
        <div className="flex gap-3 sm:flex-col sm:gap-1">
          {p.trackUrl && (
            <a href={p.trackUrl} target="_blank" rel="noreferrer" aria-label={`Track on ${p.carrier}`} title={`Latest scan on ${p.carrier}`} className="text-faint hover:text-accent">
              <ExternalLink className="size-3.5" />
            </a>
          )}
          {p.emailUrl && (
            <a href={p.emailUrl} target="_blank" rel="noreferrer" aria-label="Open email in Gmail" title="Open email in Gmail" className="text-faint hover:text-accent">
              <Mail className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function PackagesWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<PackagesData>("/api/packages", REFRESH.packages);
  return (
    <Widget
      title="Packages"
      icon={<Package className="size-4 text-accent" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      isEmpty={(d) => d.packages.length === 0}
      emptyText="No packages found in shipping emails from the last 3 weeks."
      actions={<span className="text-[11px] text-faint">From email · not a live carrier scan</span>}
    >
      {(d) => {
        const active = d.packages.filter((p) => p.status !== "delivered");
        const done = d.packages.filter((p) => p.status === "delivered");
        return (
          <div className="space-y-3">
            {active.length > 0 && <ul className="divide-y divide-line">{active.map((p) => <Row key={p.id} p={p} />)}</ul>}
            {done.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">Delivered recently</div>
                <ul className="divide-y divide-line">{done.map((p) => <Row key={p.id} p={p} />)}</ul>
              </div>
            )}
          </div>
        );
      }}
    </Widget>
  );
}
