// Uploads the gitignored photos/ folder to a PRIVATE Vercel Blob store so the deployed
// dashboard can show them, and removes blobs whose file is gone locally.
// Usage: npm run photos:sync   (needs BLOB_READ_WRITE_TOKEN in .env.local)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { put, list, del } from "@vercel/blob";

const PREFIX = "briefing-photos/";
const EXT = /\.(jpe?g|png|webp|avif|gif)$/i;
const dir = path.join(process.cwd(), "photos");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Copy it from Vercel → Storage → your Blob store → .env.local tab into .env.local.");
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
