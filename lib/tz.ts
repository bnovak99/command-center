import { TZ } from "@/lib/config";

/** YYYY-MM-DD for an instant, in Mountain Time. */
export const mtDateKey = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });

/** Offset (ms) of Mountain Time from UTC at a given instant (negative, e.g. -7h). */
function mtOffset(ms: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Epoch ms of local midnight (Mountain Time) for a YYYY-MM-DD key. */
export function mtMidnight(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - mtOffset(guess);
  return guess - mtOffset(first); // second pass handles DST boundaries
}

/** Add whole days to a YYYY-MM-DD key. */
export function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
