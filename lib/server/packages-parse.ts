import type { Carrier, PackageItem, PackageStatus } from "@/lib/packages-types";

// Pure parsing helpers for shipping emails. Kept free of IMAP so they can be unit-tested with fixtures.

export type MailInput = {
  from: string; // display name + address
  subject: string;
  text: string; // plain text (or HTML stripped to text)
  html: string; // raw HTML, used only to find tracking links
  date: number;
  emailUrl?: string;
};

type Found = { carrier: Carrier; number: string };

const PATTERNS: { carrier: Carrier; re: RegExp }[] = [
  { carrier: "UPS", re: /\b1Z[0-9A-Z]{16}\b/g },
  { carrier: "Amazon", re: /\bTBA\d{12}\b/g },
  { carrier: "USPS", re: /\b(9[2-5]\d{20}|9[2-5]\d{24}|[A-Z]{2}\d{9}US)\b/g },
];
// FedEx numbers are bare 12/15 digits, so only trust them in a FedEx link or next to the word FedEx.
const FEDEX_LINK = /fedex\.com[^"'\s>]*?(?:trknbr|tracknumbers|tracknum)=(\d{12}|\d{15})/gi;
const FEDEX_NEAR = /fedex[^0-9]{0,60}?\b(\d{12}|\d{15})\b/gi;
const UPS_LINK = /ups\.com[^"'\s>]*?(?:tracknum|InquiryNumber1|trackingNumber)=(1Z[0-9A-Z]{16})/gi;
const USPS_LINK = /usps\.com[^"'\s>]*?tLabels=(\d{20,26})/gi;

export function findTracking(m: MailInput): Found[] {
  const hay = `${m.subject}\n${m.text}`;
  const out = new Map<string, Found>();
  const add = (carrier: Carrier, number: string) => out.has(number) || out.set(number, { carrier, number: number.toUpperCase() });
  for (const p of PATTERNS) for (const x of hay.matchAll(p.re)) add(p.carrier, x[0]);
  for (const x of m.html.matchAll(UPS_LINK)) add("UPS", x[1]);
  for (const x of m.html.matchAll(USPS_LINK)) add("USPS", x[1]);
  for (const x of m.html.matchAll(FEDEX_LINK)) add("FedEx", x[1]);
  for (const x of hay.matchAll(FEDEX_NEAR)) add("FedEx", x[1]);
  return [...out.values()].slice(0, 5);
}

export function trackUrl(c: Carrier, n: string): string | undefined {
  switch (c) {
    case "UPS": return `https://www.ups.com/track?tracknum=${n}`;
    case "USPS": return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "FedEx": return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "DHL": return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    case "Amazon": return "https://www.amazon.com/gp/css/order-history";
    default: return undefined;
  }
}

// Ordered most-specific first; checked against the subject before the body.
const STATUS_RULES: { status: PackageStatus; re: RegExp }[] = [
  { status: "delivered", re: /\b(has been delivered|was delivered|is delivered|delivered:|delivered today|your package was left|package delivered|item delivered|^delivered\b)/i },
  { status: "exception", re: /\b(delivery (attempt|exception)|delayed|running late|unable to deliver|exception|action required|held at|return(ed)? to sender)\b/i },
  { status: "out_for_delivery", re: /\bout for delivery\b|\barriving today\b/i },
  { status: "in_transit", re: /\b(in transit|on (its|the) way|arriving (tomorrow|soon|on|by)|scheduled (for )?delivery|expected delivery)\b/i },
  { status: "shipped", re: /\b(has shipped|shipped|shipment|tracking (number|info)|label created)\b/i },
  { status: "ordered", re: /\b(order (confirmation|confirmed|received)|thanks for your order|we('ve| have) received your order)\b/i },
];

export function detectStatus(m: MailInput): PackageStatus | null {
  for (const r of STATUS_RULES) if (r.re.test(m.subject)) return r.status;
  const head = m.text.slice(0, 1500);
  for (const r of STATUS_RULES) if (r.re.test(head)) return r.status;
  return null;
}

const ETA_RE = /\b(?:arriving|estimated delivery(?: date)?|expected (?:delivery|by)|delivery (?:date|by)|scheduled delivery(?: date)?|arrives?)\s*:?\s*((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?([a-z]{3,9}\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?|today|tomorrow|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;

export function detectEta(m: MailInput): string | undefined {
  const hay = `${m.subject}\n${m.text.slice(0, 3000)}`;
  const x = hay.match(ETA_RE) ?? hay.match(/\b(?:delivery|arriving)\s+(today|tomorrow)\b/i);
  if (!x) return undefined;
  const raw = (x.length > 2 ? `${x[1] ?? ""}${x[2]}` : x[1]).replace(/\s+/g, " ").trim();
  // "today"/"tomorrow" are relative to when the email was sent, so pin them to a date.
  const rel = raw.toLowerCase() === "today" ? 0 : raw.toLowerCase() === "tomorrow" ? 1 : null;
  if (rel === null) return raw;
  return new Date(m.date + rel * 86_400_000).toLocaleDateString("en-US", { timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric" });
}

const AMAZON_ORDER = /\b\d{3}-\d{7}-\d{7}\b/;

export function merchantOf(from: string): string {
  const name = from.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  const addr = from.match(/@([a-z0-9.-]+)/i)?.[1]?.toLowerCase() ?? "";
  if (/amazon\./.test(addr)) return "Amazon";
  if (/ups\.com/.test(addr)) return "UPS";
  if (/usps\.(com|gov)/.test(addr)) return "USPS";
  if (/fedex\.com/.test(addr)) return "FedEx";
  const base = addr.split(".").slice(-2, -1)[0];
  return name || (base ? base[0].toUpperCase() + base.slice(1) : "Unknown sender");
}

const RANK: Record<PackageStatus, number> = { ordered: 0, shipped: 1, in_transit: 2, out_for_delivery: 3, exception: 3, delivered: 4 };

/** Group parsed emails into packages; the newest email for a package sets its status. */
export function buildPackages(mails: MailInput[], now: number): PackageItem[] {
  const pk = new Map<string, PackageItem>();
  for (const m of [...mails].sort((a, b) => a.date - b.date)) {
    const status = detectStatus(m);
    if (!status) continue;
    const tracking = findTracking(m);
    const merchant = merchantOf(m.from);
    const amazon = merchant === "Amazon" ? m.subject.match(AMAZON_ORDER)?.[0] ?? m.text.match(AMAZON_ORDER)?.[0] : undefined;
    const keys: { key: string; carrier: Carrier; number?: string }[] = tracking.length
      ? tracking.map((t) => ({ key: `t:${t.number}`, carrier: t.carrier, number: t.number }))
      : amazon
        ? [{ key: `a:${amazon}`, carrier: "Amazon" }]
        : [];
    if (!keys.length) continue; // no stable identifier: skip rather than guess
    for (const k of keys) {
      const prev = pk.get(k.key);
      // A later email never downgrades a delivered package back to "shipped".
      const next = !prev || m.date >= prev.statusAt && !(prev.status === "delivered" && RANK[status] < RANK.delivered);
      const eta = detectEta(m);
      if (next) {
        pk.set(k.key, {
          id: k.key,
          carrier: prev?.carrier && prev.carrier !== "Other" ? prev.carrier : k.carrier,
          trackingLast4: k.number?.slice(-4),
          status,
          statusAt: m.date,
          merchant: prev && ["UPS", "USPS", "FedEx"].includes(merchant) ? prev.merchant : merchant,
          subject: cleanSubject(m.subject),
          eta: status === "delivered" ? undefined : eta ?? (status === "out_for_delivery" ? undefined : prev?.eta),
          trackUrl: k.number ? trackUrl(k.carrier, k.number) : trackUrl("Amazon", ""),
          emailUrl: m.emailUrl,
          emails: (prev?.emails ?? 0) + 1,
        });
      } else if (prev) prev.emails += 1;
    }
  }
  const DAY = 86_400_000;
  return [...pk.values()]
    .filter((p) => (p.status === "delivered" ? now - p.statusAt < 3 * DAY : now - p.statusAt < 21 * DAY))
    .sort((a, b) => order(a) - order(b) || b.statusAt - a.statusAt);
}

function order(p: PackageItem) {
  return { out_for_delivery: 0, exception: 1, in_transit: 2, shipped: 3, ordered: 4, delivered: 5 }[p.status];
}

function cleanSubject(s: string) {
  // Never send full tracking/order numbers to the browser: mask long ID-like tokens to their last 4.
  return s.replace(/^(re|fwd?):\s*/i, "")
    .replace(/\b(?=[0-9A-Z-]*\d)[0-9A-Z-]{10,}\b/g, (t) => `··${t.replace(/-/g, "").slice(-4)}`).replace(/\s+/g, " ").trim().slice(0, 120);
}
