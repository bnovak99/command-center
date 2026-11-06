// Uploads the gitignored photos/ folder to a PRIVATE Vercel Blob store so the deployed
// dashboard can show them, and removes blobs whose file is gone locally.
// Usage: npm run photos:sync   (credentials in .env.local, see below)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { put, list, del } from "@vercel/blob";

const PREFIX = "briefing-photos/";
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const dir = path.join(process.cwd(), "photos");

// Needs either BLOB_STORE_ID + VERCEL_OIDC_TOKEN (from `npx vercel env pull .env.vercel`, valid ~12 h)
// or a BLOB_READ_WRITE_TOKEN for older stores.
if (!(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("No Blob credentials. Run `npx vercel link` once, then `npx vercel env pull .env.vercel`, and try again.");
  process.exit(1);
}
const files = (await readdir(dir)).filter((f) => EXT.test(f) && !f.startsWith("."));
const existing = new Map();
let cursor;
do {
  const r = await list({ prefix: PREFIX, cursor });
  for (const b of r.blobs) existing.set(b.pathname.slice(PREFIX.length), b);
  cursor = r.hasMore ? r.cursor : undefined;
} while (cursor);

let added = 0;
for (const f of files) {
  const buf = await readFile(path.join(dir, f));
  const prev = existing.get(f);
  if (prev && prev.size === buf.length) continue;
  await put(PREFIX + f, buf, { access: "private", addRandomSuffix: false, allowOverwrite: true });
  added++;
  console.log("uploaded", f);
}
const gone = [...existing.keys()].filter((k) => !files.includes(k));
if (gone.length) await del(gone.map((k) => existing.get(k).url));
console.log(`Done: ${added} uploaded, ${gone.length} removed, ${files.length} photos in the store.`);
