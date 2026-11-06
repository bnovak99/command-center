# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Brian, in Genesee / Golden, Colorado, is the primary and only confirmed user. He opens the dashboard first thing in the morning on his desktop monitor and leaves it running there all day, glancing back at it between other work. The desktop monitor is the primary viewing context; tablet and phone layouts must work but are secondary.

He may occasionally share the deployed Vercel link with others (for example family). Shared viewers see the same single page; there are no accounts, roles, or per-viewer data, and the deployment can be protected by an optional password.

## Product Purpose

A personal morning command center: one page that answers the day's practical questions with real, current data, so Brian doesn't have to open a weather app, a snow report, a news site, a brokerage and YouTube separately.

The first question it must answer is **"what's it like at home right now?"** (Genesee conditions). After that come the supporting questions: conditions across the Front Range vs. the mountains, whether there's powder at the four I-70 resorts, drive times from home, what moved in the markets, the day's top news, and new videos on his topics.

Success means a glance at the monitor gives a trustworthy answer without clicking, and nothing on the page is ever wrong about how fresh or how certain it is.

## Positioning

It is built around one person's real geography and routine (Genesee home base, Front Range towns, Keystone / Breckenridge / Vail / Beaver Creek, his watchlist, his YouTube topics) and is strict about data honesty: every value carries its source and time, model estimates and forecasts are visibly distinguished from observations, and stale data is never shown as live. Where no reliable public API exists, it links to the official source instead of scraping or guessing.

## Operating Context

- Opened in the morning, then left open all day on a desktop monitor; each widget auto-refreshes on its own interval (weather 15 min, snow 30 min, news 30 min, drive 10 min, stocks 1 min during market hours and 15 min otherwise, YouTube 3 h).
- Runs locally (`npm run dev` on Brian's Mac) and is deploy-ready for Vercel Hobby. Preferences live in localStorage, so they are exported/imported as JSON between localhost and the deployed URL.
- Mountain Time everywhere; °F, mph, inches.
- Seasonal: snow and Powder Alerts matter most in winter.

## Capabilities and Constraints

- Widgets: daily briefing strip, weather for eight locations (with NWS alerts and detail view), ski & snow for four resorts (model-estimate past snowfall, forecast future snowfall, Powder Alert at ≥ 6" in the next 24 h, links to OpenSnow and official resort pages), drive times from home (TomTom, live traffic), news from publisher RSS (clustered and ranked by outlet coverage), stock watchlist with ETF proxies for the indexes (Finnhub), and YouTube (topic search plus subscriptions).
- Stack: Next.js App Router, TypeScript, Tailwind CSS v4, SWR, lucide-react, Geist Sans / Geist Mono. Free-tier APIs only; any paid service needs Brian's approval.
- Every widget fails independently and has loading, error, needs-setup, empty and stale states, a refresh control, a source label and an "Updated" time.
- No public API for lift/trail counts or base depth; those stay as links.
- Personal use only, not a SaaS. Later phases (not built yet): sports, air quality, I-70 conditions, outdoor activity scoring, quick links, Winter Park, SNOTEL, stock history charts, optional AI-written briefing.

## Brand Commitments

- Name: "Personal Command Center". Greeting uses `DISPLAY_NAME` (default "Brian").
- Brian's stated design reference is Apple / Linear / premium finance dashboards: restrained, dense without clutter, precise. Dark mode is the default with a light mode toggle and no theme flash. (Visual specifics belong in DESIGN.md.)

## Evidence on Hand

- All content is live third-party data; there is no marketing copy, testimonials or imagery.
- A design critique of the current build: `design-critique/critique.md` in the project library (Nov 6, 2026).
- Mock or sample data must never appear in the UI; test fixtures are allowed only in tests.

## Product Principles

1. **Home first.** The current Genesee conditions are the first thing the page answers; everything else supports the morning's decisions.
2. **Honest over complete.** Never fabricate, never present stale or estimated data as live or measured, and label every value's source and time. Link out rather than guess.
3. **Glanceable from across the desk.** The page is read in quick looks at a monitor that's been open for hours; the answers should be readable without interaction.
4. **One failure never breaks the page.** Each widget stands alone and degrades calmly.
5. **Easy to maintain.** Free APIs, config-driven lists, and one route plus one component per widget.

## Accessibility & Inclusion

No product-specific requirement established beyond solid baseline web accessibility (contrast that holds up for the small source/time labels, keyboard focus, labeled controls), since shared viewers may use the page too.
