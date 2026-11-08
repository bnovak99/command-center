"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { TZ } from "@/lib/config";
import { useLocalPref } from "@/lib/hooks";
import { SettingsMenu } from "@/components/SettingsMenu";

export function Header({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useLocalPref<"dark" | "light">("theme", "dark");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock avoids hydration mismatch
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const hour = now ? Number(now.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false })) % 24 : 8;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = now?.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = now?.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", second: "2-digit" });
  // Phones show the time in the date line instead of the large clock.
  const phoneDate = now?.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
  const shortTime = now?.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

  return (
    <header className="flex items-start justify-between gap-3 sm:items-end sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}, {name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          <span className="hidden sm:inline">{date ?? " "}</span>
          <span className="sm:hidden">{phoneDate ?? " "}{shortTime && <span className="num"> · {shortTime} MT</span>}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden text-right sm:block">
          <div className="num text-2xl font-medium leading-none">{time ?? "--:--"}</div>
          <div className="mt-1 text-xs text-muted">Mountain Time</div>
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="rounded-lg border border-line p-2 sm:ml-2 text-muted transition hover:bg-surface2 hover:text-fg"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <SettingsMenu />
      </div>
    </header>
  );
}
