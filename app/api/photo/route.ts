import { handle } from "@/lib/server/cache";
import { listPhotos } from "@/lib/server/photos";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(req, "photo", 10 * 60_000, "Your photos", listPhotos, undefined, 5_000);
}
