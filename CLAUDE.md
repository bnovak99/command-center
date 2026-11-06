# Personal Command Center — Project Memory

A personal, single-page morning dashboard for Brian (Genesee/Golden, CO). Personal use only — not a SaaS.
Prioritize: real data, visual quality, simplicity, easy maintenance.

## Stack
- Next.js (latest stable, App Router) + TypeScript + Tailwind CSS v4
- SWR for client data fetching and per-widget refresh
- lucide-react for icons; Geist Sans / Geist Mono via the `geist` npm package (no Google Fonts fetch at build)
- Charts: plain SVG/CSS first; add Recharts or TradingView lightweight-charts only when needed
- Runs locally first (`npm run dev`), deploy-ready for Vercel Hobby later

## Architecture rules
- One server API route per widget under `app/api/<widget>/route.ts`. All third-party calls happen server-side. API keys live only in env vars — never in client code.
- Every API route returns an envelope:
  `{ ok: true, data, source, fetchedAt, stale?, note? }` or `{ ok: false, error, needsSetup?, hint? }`
- Server-side in-memory cache (globalThis Map with TTL + in-flight dedupe). If a refresh fails and an older value exists, return it with `stale: true` — never present it as fresh.
- `?refresh=1` bypasses the cache, but respect a minimum age so refresh spam can't burn quotas.
- Each widget is independent: its own loading skeleton, error state, "needs setup" state (missing key), empty state, refresh button, source label, and "Updated 9:24 PM" timestamp. One failing API must never break the page.
- All configurable lists (locations, resorts, feeds, default watchlist, default YouTube topics) live in `lib/config.ts`.
- User preferences (theme, watchlist, YouTube topics, sort choices) stored in localStorage, wrapped in try/catch, with Export/Import JSON in a settings menu (localStorage doesn't carry from localhost to the Vercel URL).
- Optional password gate: if `DASHBOARD_PASSWORD` is set, middleware requires HTTP Basic Auth. If unset (local), no gate.
- Adding a widget = new config entry + new API route + new component. Keep that pattern.

## Conventions
- Time zone: America/Denver everywhere. Show times in MT.
- Units: °F, mph, inches.
- Dark mode default, light mode toggle; no theme flash on load (set `data-theme` before paint).
- Design language: Apple / Linear / premium finance dashboards. Restrained palette, tabular numbers, subtle motion, good density without clutter. Responsive desktop / tablet / phone.
- Auto-refresh intervals: weather 15 min, snow 30 min, news 30 min, stocks 1 min during market hours (15 min otherwise), YouTube 3 h.

## Data honesty (non-negotiable)
- Never fabricate data. Never show mock data in the UI. Test fixtures are fine in tests only.
- Label every data point's source and time.
- Distinguish model estimates / forecasts from reported observations, visually and in text.
- Never show stale scores or quotes as live; show the quote/observation timestamp.
- If data isn't available from a reliable API, link to the official source instead of scraping.

## Data sources (decided)
| Widget | Source | Key | Notes |
|---|---|---|---|
| Weather | Open-Meteo forecast API | none | Batch all locations in one call (comma-separated lat/lon). Free for non-commercial use. |
| Weather alerts | NWS api.weather.gov `/alerts/active?point=lat,lon` | none | Requires a User-Agent header (`NWS_USER_AGENT`). |
| Snow | Open-Meteo with `elevation` set to mid-mountain, `past_days=7`, `forecast_days=7` | none | Label past snowfall as "model estimate", future as "forecast". Check `*_units.snowfall` and convert cm→in if needed. |
| Snow reports | OpenSnow + official resort pages — LINKS ONLY | — | OpenSnow's API is commercial-partners only. No public API for lifts/trails/base depth. Do not scrape. |
| News | Publisher RSS/Atom feeds parsed server-side (`fast-xml-parser`) | none | NewsAPI's free plan only works on localhost — don't use it. Cluster near-duplicate headlines; rank by number of outlets covering the story + recency + category weight. Summaries come from the feed's own description. |
| Stocks | Finnhub `/quote`, `/stock/profile2`, `/stock/market-status` | `FINNHUB_API_KEY` | Free tier: 60 calls/min, no historical candles, no index symbols → use ETFs SPY / QQQ / DIA / IWM labeled as proxies for S&P 500 / NASDAQ / Dow / Russell 2000. Show each quote's timestamp. |
| Stock history (later) | Twelve Data free tier (800 credits/day, 8/min) | `TWELVEDATA_API_KEY` | Phase 2+ for sparklines/historical charts. Mind the 8/min limit. |
| YouTube | YouTube Data API v3 | `YOUTUBE_API_KEY` | 10,000 units/day. `search.list` = 100 units, `videos.list` = 1 unit per 50 IDs. Cache topic searches 3 h. Favorite channels via free channel RSS (`youtube.com/feeds/videos.xml?channel_id=`). Filter out Shorts (≤60 s). |

Recheck free-tier limits when implementing; they change.

## Locations
Weather (lat, lon):
- Genesee 39.6861, -105.2736 (front range)
- Golden 39.7555, -105.2211 (front range)
- Denver 39.7392, -104.9903 (front range)
- Denver Int'l Airport (DIA) 39.8561, -104.6737 (front range)
- Keystone 39.6045, -105.9437 (mountains)
- Vail 39.6403, -106.3742 (mountains)
- Breckenridge 39.4817, -106.0384 (mountains)
- Beaver Creek 39.6042, -106.5165 (mountains)

Snow model points (approx. mid-mountain lat, lon, elevation m):
- Keystone 39.5792, -105.9347, 3300
- Breckenridge 39.4686, -106.0816, 3350
- Vail 39.6225, -106.3770, 3100
- Beaver Creek 39.5890, -106.5220, 3050

Resort links (all four are Vail Resorts; same URL pattern — verify each link works):
- OpenSnow report: `https://opensnow.com/location/{keystone|breckenridge|vail|beavercreek}/snow-report`
- OpenSnow cams: `https://opensnow.com/location/{slug}/cams`
- Official snow report: `https://www.{domain}/the-mountain/mountain-conditions/snow-and-weather-report.aspx`
- Lifts & terrain: `https://www.{domain}/the-mountain/mountain-conditions/terrain-and-lift-status.aspx`
- Trail map: `https://www.{domain}/the-mountain/about-the-mountain/trail-map.aspx`
- Domains: keystoneresort.com, breckenridge.com, vail.com, beavercreek.com
- Regional: `https://opensnow.com/dailysnow/i70`, `https://opensnow.com/dailysnow/colorado`

Powder Alert threshold: ≥ 6 inches forecast in the next 24 hours.

## Env vars (.env.local, never committed; mirror in .env.example)
FINNHUB_API_KEY, YOUTUBE_API_KEY, DISPLAY_NAME (default "Brian"), DASHBOARD_PASSWORD (optional), NWS_USER_AGENT

## Workflow
- Make sensible technical decisions without asking for approval on small details. Ask only for paid services, hard-to-undo or scope-changing decisions, or when blocked (e.g., a missing API key).
- Work in phases; after each, give a short summary and continue. Brian reviews in the browser as you go.
- Before finishing a phase: `npm run build` passes, and you've loaded the page and checked each widget with real data.
- Keep README.md current: setup, API keys and how to get them, costs/limits, Vercel deployment steps.

## Later phases (not now)
Sports (Nuggets, Lions, Broncos — ESPN public endpoints, with staleness checks), air quality (AirNow + Open-Meteo air quality), I-70 conditions (COtrip/CDOT — verify feed access), outdoor activity scoring, quick links, Winter Park, SNOTEL measured snow, stock history charts, optional Claude-written daily briefing.
