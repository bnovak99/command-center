import { SetupError } from "@/lib/server/cache";
import { SHOW_PRIVATE_WIDGETS_ONLINE } from "@/lib/config";

/** Refuse to serve private data (calendar, Gmail packages, personal photos) from the public deployment. */
export function guardPrivate(what: string) {
  if (process.env.VERCEL && !SHOW_PRIVATE_WIDGETS_ONLINE) {
    throw new SetupError(`${what} only show when the dashboard runs on your own computer, because the live site has no login.`, "To show them online anyway, set SHOW_PRIVATE_WIDGETS_ONLINE = true in lib/config.ts and redeploy.");
  }
}
