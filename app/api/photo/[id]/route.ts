import { readPhoto } from "@/lib/server/photos";
import { SetupError } from "@/lib/server/cache";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const p = await readPhoto(decodeURIComponent(id));
    if (!p) return new Response("Not found", { status: 404 });
    // private: browsers may cache it, shared caches/CDNs must not.
    return new Response(p.body, { headers: { "Content-Type": p.type, "Cache-Control": "private, max-age=86400" } });
  } catch (e) {
    return new Response(e instanceof SetupError ? e.message : "Photo unavailable", { status: e instanceof SetupError ? 403 : 502 });
  }
}
