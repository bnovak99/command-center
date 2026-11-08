"use client";
import { useEffect, useState } from "react";
import { Shuffle, KeyRound, ImageOff } from "lucide-react";
import { useApi } from "@/lib/hooks";
import { REFRESH, PHOTOS } from "@/lib/config";
import type { PhotoData } from "@/lib/photo-types";

/** A random personal photo for the right side of the Daily briefing. */
export function BriefingPhoto() {
  const { res, loading } = useApi<PhotoData>("/api/photo", REFRESH.photo);
  const photos = res?.ok ? res.data.photos : [];
  const [pick, setPick] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);

  const shuffle = () => {
    if (!photos.length) return;
    const pool = photos.length > 1 ? photos.filter((p) => p.id !== pick) : photos;
    setLoaded(false);
    setBroken(false);
    setPick(pool[Math.floor(Math.random() * pool.length)].id);
  };

  // First pick once the list arrives (client-only, so no hydration mismatch), then rotate.
  const key = photos.map((p) => p.id).join("|");
  useEffect(() => {
    if (!key) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random pick must happen after mount
    if (!pick || !key.split("|").includes(pick)) shuffle();
    const t = setInterval(shuffle, PHOTOS.rotateMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Below lg the photo sits under the briefing at full width, so cap its height there.
  const frame = "relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface2 max-lg:max-h-72";

  if (!res && loading) return <div className={`${frame} skeleton !rounded-xl max-lg:hidden`} aria-label="Loading photo" />;

  if (!res?.ok) {
    return (
      <div className={`${frame} flex flex-col items-center justify-center gap-1.5 p-4 text-center text-xs text-muted max-lg:aspect-auto max-lg:py-3`}>
        {res?.needsSetup ? <KeyRound className="size-4 text-warn" /> : <ImageOff className="size-4 text-faint" />}
        <p>{res ? res.error : "Couldn’t load photos"}</p>
        {res?.hint && <p className="text-faint">{res.hint}</p>}
      </div>
    );
  }

  const index = photos.findIndex((p) => p.id === pick);
  return (
    <figure className={`${frame} group`}>
      {pick && !broken && (
        // eslint-disable-next-line @next/next/no-img-element -- private, password-gated route; next/image would cache it in the shared optimizer
        <img
          key={pick}
          src={`/api/photo/${encodeURIComponent(pick)}`}
          alt="A personal photo"
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          className={`size-full object-cover transition-opacity duration-[250ms] ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {broken && <div className="flex size-full items-center justify-center text-xs text-faint"><ImageOff className="mr-1.5 size-4" /> Photo unavailable</div>}
      <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-6 text-[11px] text-white/80 opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="num">{index + 1} of {photos.length} · your photos</span>
        <button type="button" onClick={shuffle} aria-label="Show another photo" className="rounded-md p-1 hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none">
          <Shuffle className="size-3.5" />
        </button>
      </figcaption>
    </figure>
  );
}
