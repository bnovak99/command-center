"use client";
import { Car } from "lucide-react";
import { Widget } from "@/components/Widget";
import { useApi } from "@/lib/hooks";
import { REFRESH } from "@/lib/config";
import { fmtTime } from "@/lib/format";
import type { DriveData } from "@/lib/drive-types";

const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m} min`);

export function DriveWidget() {
  const { res, networkError, loading, validating, refresh } = useApi<DriveData>("/api/drive", REFRESH.drive);
  return (
    <Widget
      title="Drive times from home"
      icon={<Car className="size-4 text-accent" />}
      res={res}
      networkError={networkError}
      loading={loading}
      validating={validating}
      onRefresh={refresh}
      actions={<span className="text-[11px] text-faint">Estimate · if leaving at update time</span>}
    >
      {(d) => (
        <ul className="divide-y divide-line">
          {d.destinations.map((x) => {
            const delay = x.delayMinutes ?? 0;
            const tone = delay >= 15 ? "text-down" : delay >= 5 ? "text-warn" : "text-up";
            return (
              <li key={x.id}>
                <a href={x.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-2.5 hover:text-accent">
                  <span className="text-sm font-medium">{x.name}</span>
                  {x.error || x.minutes === undefined ? (
                    <span className="text-xs text-warn">unavailable</span>
                  ) : (
                    <span className="num flex items-baseline gap-3 text-right">
                      <span className="text-[11px] text-faint">{x.miles} mi</span>
                      <span className="text-[11px] text-muted">arrive {fmtTime(d.departAt + x.minutes * 60_000)}</span>
                      <span className={`text-[11px] ${tone}`}>{delay >= 2 ? `+${delay} min traffic` : "no delay"}</span>
                      <span className="w-16 text-base font-semibold">{hm(x.minutes)}</span>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}
