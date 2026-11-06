"use client";
import { useRef, useState } from "react";
import { Settings, Download, Upload } from "lucide-react";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const exportPrefs = () => {
    const out: Record<string, unknown> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith("cc:")) out[k] = JSON.parse(localStorage.getItem(k)!);
      }
    } catch {}
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "command-center-prefs.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Exported.");
  };

  const importPrefs = async (f: File) => {
    try {
      const obj = JSON.parse(await f.text()) as Record<string, unknown>;
      let n = 0;
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith("cc:")) {
          localStorage.setItem(k, JSON.stringify(v));
          n++;
        }
      }
      setMsg(`Imported ${n} settings — reloading…`);
      setTimeout(() => location.reload(), 600);
    } catch {
      setMsg("That file isn’t valid preferences JSON.");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        className="rounded-lg border border-line p-2 text-muted transition hover:bg-surface2 hover:text-fg"
      >
        <Settings className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-2 text-sm shadow-xl">
          <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-faint">Preferences</div>
          <button onClick={exportPrefs} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface2">
            <Download className="size-4" /> Export JSON
          </button>
          <button onClick={() => file.current?.click()} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface2">
            <Upload className="size-4" /> Import JSON
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importPrefs(e.target.files[0])}
          />
          <p className="px-2 pt-1 text-xs text-faint">Theme, watchlist, YouTube topics and sort choices. Use this to carry settings from localhost to your deployed URL.</p>
          {msg && <p className="px-2 pt-2 text-xs text-accent">{msg}</p>}
        </div>
      )}
    </div>
  );
}
