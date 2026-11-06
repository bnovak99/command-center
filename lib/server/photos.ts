import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { list, get } from "@vercel/blob";
import { SetupError } from "@/lib/server/cache";
import { PHOTOS } from "@/lib/config";
import type { PhotoData } from "@/lib/photo-types";

// Personal photos for the briefing. Locally they come from the gitignored photos/ folder;
// on Vercel from a *private* Vercel Blob store (uploaded with `npm run photos:sync`).
const LOCAL_DIR = path.join(process.cwd(), "photos");
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif" };
export const contentType = (name: string) => TYPES[name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
export const validId = (id: string) => EXT.test(id) && /^[\w.\- ]+$/.test(id) && !id.startsWith(".");

// Prefer the read-write token when it's set: the SDK otherwise picks OIDC + BLOB_STORE_ID first,
// which is denied when the store is linked to a different Vercel project.
const auth = () => (process.env.BLOB_READ_WRITE_TOKEN ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {});
const hasBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

function guard() {
  if (process.env.VERCEL && !process.env.DASHBOARD_PASSWORD) {
    throw new SetupError("Photos are hidden because this deployment has no password.", "Set DASHBOARD_PASSWORD in Vercel → Settings → Environment Variables, then redeploy.");
  }
}

async function localPhotos(): Promise<PhotoData | null> {
  if (process.env.VERCEL) return null;
  try {
    const names = (await readdir(LOCAL_DIR)).filter(validId).sort();
    const photos = names.map((id) => ({ id }));
    return photos.length ? { photos, store: "local" } : null;
  } catch {
    return null;
  }
}

export async function listPhotos(): Promise<PhotoData> {
  guard();
  const local = await localPhotos();
  if (local) return local;
  if (!hasBlob()) {
    throw new SetupError(
      process.env.VERCEL ? "Connect a private Vercel Blob store to show your photos here." : "Add photos to the photos/ folder to show one here.",
      "Vercel → Storage → Create Blob store (Private) → connect it to this project, then run `npm run photos:sync` on your Mac. See README → Briefing photo.",
    );
  }
  const photos: PhotoData["photos"] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix: PHOTOS.blobPrefix, cursor, limit: 1000, ...auth() });
    for (const b of r.blobs) {
      const id = b.pathname.slice(PHOTOS.blobPrefix.length);
      if (validId(id)) photos.push({ id });
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  if (!photos.length) throw new SetupError("Your private Blob store has no photos yet.", "Run `npm run photos:sync` on your Mac to upload the photos/ folder.");
  return { photos, store: "blob" };
}

/** Returns the image bytes as a Response body, or null if the photo doesn't exist. */
export async function readPhoto(id: string): Promise<{ body: BodyInit; type: string } | null> {
  guard();
  if (!validId(id)) return null;
  if (!process.env.VERCEL) {
    try {
      return { body: new Uint8Array(await readFile(path.join(LOCAL_DIR, id))), type: contentType(id) };
    } catch {}
  }
  if (!hasBlob()) return null;
  const r = await get(PHOTOS.blobPrefix + id, { access: "private", ...auth() });
  if (!r || r.statusCode !== 200) return null;
  return { body: r.stream, type: r.blob.contentType || contentType(id) };
}
