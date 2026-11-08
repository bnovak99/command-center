# Personal Command Center

A single-page morning dashboard (Next.js App Router, TypeScript, Tailwind v4, SWR). Real data only — every value is labeled with its source and time, estimates and forecasts are marked as such, and each widget fails independently. Times are Mountain Time; units are °F / mph / inches.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in keys (see below)
npm run dev                  # http://localhost:3000
npm run build                # production build check
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `TOMTOM_API_KEY` | for Drive times | Free at <https://developer.tomtom.com> (2,500 requests/day; widget uses ~5 per refresh, every 10 min). Includes live traffic. |
| `HOME_ADDRESS` | for Drive times | Your street address (kept in `.env.local`, not git). Geocoded once via TomTom and cached. |
| `GOOGLE_CALENDAR_ICS` | for Calendar | Google Calendar → Settings → pick the calendar → **Integrate calendar** → *Secret address in iCal format*. Format `Label\|URL`, comma-separated for several (e.g. `Personal\|https://…/basic.ics,Family\|https://…`). Treat it like a password: anyone with it can read that calendar. If it leaks, use **Reset** on the same settings page. Some Google Workspace accounts have this disabled by the admin. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | for Packages | Your Gmail address and an app password from <https://myaccount.google.com/apppasswords> (requires 2-Step Verification). Not your Google password. Used read-only over IMAP; revoke it on the same page anytime. |
| `FINNHUB_API_KEY` | for Stocks | Free at <https://finnhub.io/register>. Copy the key from the dashboard (a ~20-character string). Free tier: 60 calls/min, delayed/limited data, no index symbols (hence ETF proxies). |
| `YOUTUBE_API_KEY` | for YouTube | Google Cloud Console → new project → enable **YouTube Data API v3** → Credentials → API key. Free quota 10,000 units/day. |
| `DISPLAY_NAME` | no | Greeting name (default `Brian`). |
| `DASHBOARD_PASSWORD` | no | If set, every request needs HTTP Basic Auth (any username, this password). Unset locally = no gate. |
| `NWS_USER_AGENT` | recommended | api.weather.gov requires a descriptive User-Agent, e.g. `PersonalCommandCenter (you@example.com)`. |
| `BLOB_STORE_ID` | for the briefing photo on Vercel | Added automatically when you connect a private Blob store to the project; the deployed site then signs in to the store by itself. On your Mac it comes from `npx vercel env pull .env.vercel` (see Briefing photo). |

Weather, snow and news need no keys. `.env.local` is git-ignored.

## Data sources, limits and costs

| Widget | Source | Cost / limits | Refresh |
|---|---|---|---|
| Weather | Open-Meteo (batched, one call) + NWS alerts | Free, non-commercial use | 15 min |
| Snow | Open-Meteo at mid-mountain elevation (`past_days=7`, `forecast_days=7`) | Free. Past = *model estimate*, future = *forecast*; not resort-reported | 30 min |
| News | Publisher RSS feeds parsed server-side | Free | 30 min |
| Drive times | TomTom Routing (live traffic) | Free tier, ~5 calls per refresh | 10 min |
| Calendar | Google Calendar secret iCal feed (read-only, parsed with `ical.js`, recurring events expanded server-side) | Free, no quota. Google generates the feed on its own schedule, so very recent edits can lag | 10 min |
| Packages | Your shipping emails in Gmail (IMAP, read-only, last 21 days). Tracking numbers for UPS / USPS / FedEx / Amazon are found in the email; status comes from the email wording | Free. Status is as fresh as the newest email, not a live carrier scan, and the widget says so. Each row links to the carrier page for the latest scan | 15 min |
| I-70 alerts (briefing) | CDOT COtrip's keyless map feed (`api-511x-co.carsprogram.org/events/map-features`, chain laws + road closures), filtered to I-70 mile points 160–262 (Golden to Avon) and events in effect now | Free, no key. Undocumented feed that powers cotrip.org, so it could change; failures show as "unavailable", never as "all clear" | 10 min |
| Sports scores (briefing) | ESPN's public team schedule JSON (`site.api.espn.com/apis/site/v2/sports/<league>/teams/<team>/schedule`) for the Nuggets, Broncos and Lions (`SPORTS_TEAMS` in `lib/config.ts`): latest final, live score if a game is on, and the next game | Free, no key. Undocumented, so it could change; a failing team shows "unavailable". Live scores can lag, so they show an "as of" time | 10 min (server cache 5 min) |
| Briefing photo | Your own photos: the gitignored `photos/` folder locally, a private Vercel Blob store on Vercel | Included in the Hobby free tier (a few MB here; check current Blob limits in Vercel). Photos are served only through `/api/photo/<file>` behind the password, never from a public URL | new photo hourly |
| Stocks | Finnhub `/quote`, `/stock/profile2`, `/stock/market-status` | Free tier, ~10 calls per refresh | 1 min open / 15 min closed |
| YouTube | YouTube Data API v3 | `search.list` = 100 units × topics; cached 3 h per topic (7 topics ≈ 700 units per refresh ≈ 5,600/day at most) | 3 h |

Lift/trail counts and base depth have no public API — each resort card links to OpenSnow and the official Vail Resorts pages instead of scraping.

## Significant choices

- **One API route per widget** (`app/api/<widget>/route.ts`) returning `{ ok, data, source, fetchedAt, stale?, note? }` or `{ ok:false, error, needsSetup?, hint? }`.
- **Server cache** (`lib/server/cache.ts`): in-memory TTL + in-flight dedupe. Failed refresh with an older value → returned with `stale: true` and shown as a warning. `?refresh=1` respects a minimum age (30 s; 15 min for YouTube) so refresh spam can’t burn quotas.
- **Config** lives in `lib/config.ts` (locations, resorts, feeds, default watchlist/topics).
- **Preferences** (theme, watchlist, YouTube topics, sort) are in `localStorage`; use Settings → Export/Import JSON to carry them to a deployed URL.
- **Next.js 16** renamed middleware to `proxy.ts`; the password gate lives there.
- News ranking: near-duplicate headlines (token Jaccard ≥ 0.5) are clustered; score = outlets × 3 + recency + category weight.
- **Calendar privacy**: iCal URLs stay server-side in env vars and never reach the browser or error messages; `/api/calendar` is sent `Cache-Control: private, no-store`. On Vercel the route refuses to return events unless `DASHBOARD_PASSWORD` is set. The eye icon on the widget swaps titles for "Busy" on that device (for when someone else can see the screen).
- **Package privacy**: Gmail credentials stay server-side. The widget shows sender, carrier, status, and only the last 4 digits of tracking numbers; no addresses or email bodies reach the browser. `/api/packages` is sent `Cache-Control: private, no-store`, and on Vercel it refuses to return anything unless `DASHBOARD_PASSWORD` is set.
- Stock index tiles use SPY/QQQ/DIA/IWM and are labeled as ETF proxies.
- The dashboard needs a running Node server (in-memory cache); on Vercel each warm function instance has its own cache.

## Briefing photo

The right side of the Daily briefing shows a random photo from your own collection, changing every hour (hover it for a shuffle button). Google Photos can't feed this directly: since March 2025 apps can only read photos they uploaded themselves, and the Picker API's links expire after an hour.

- **Locally:** drop `.jpg`, `.png`, `.webp` or `.avif` files into `photos/` in this folder. It's in `.gitignore` because the repo is public, so photos are never committed.
- **On Vercel:** uncommitted files don't deploy, so the live site reads from a private Vercel Blob store:
  1. Vercel → your project → **Storage** → **Create** → **Blob**, choose **Private** access (this can't be changed later), and connect it to the project.
  2. On your Mac, run `npx vercel link` once (pick this project), then `npx vercel env pull .env.vercel`. That file holds `BLOB_STORE_ID` and a short-lived `VERCEL_OIDC_TOKEN` (about 12 hours; pull again when it expires). It's gitignored. Older stores can instead put a `BLOB_READ_WRITE_TOKEN` in `.env.local`.
  3. Run `npm run photos:sync`. It uploads new or changed photos from `photos/` and removes ones you deleted. Re-run it whenever you change the folder.
  4. Redeploy once so the project picks up the store connection.
- On Vercel the photo route refuses to serve anything unless `DASHBOARD_PASSWORD` is set.

## Deploy to Vercel (Hobby)

1. Push this folder to a Git repo and import it at vercel.com/new.
2. Add the environment variables above (Project → Settings → Environment Variables). Set `DASHBOARD_PASSWORD` so the public URL isn’t open (the Calendar widget stays hidden without it).
3. Deploy. Then import your preferences JSON via Settings on the live site.

## Adding a widget

New entry in `lib/config.ts` → new `app/api/<name>/route.ts` using `handle()` → new component wrapped in `<Widget>` → add it to `app/page.tsx`.

## Later phases (not built)

Air quality, outdoor scoring, quick links, Winter Park, SNOTEL, stock history charts, optional AI briefing.
