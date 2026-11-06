# Kickoff prompt — paste this into Claude Code from the dashboard folder

Read CLAUDE.md first; it has the decided stack, data sources, locations and rules. This folder is empty — start a fresh project.

Build a basic, working first version of my Personal Command Center: a single-page dashboard I open every morning and leave running all day. Real data only, polished design, Mountain Time throughout.

Build it as a standalone web application that I can run locally on my Mac (`npm run dev`) and later deploy online (Vercel) without code changes. Keep secrets in `.env.local` locally and in host environment variables when deployed.

Make sensible technical decisions yourself — libraries, file structure, component design, styling details, caching, error handling — without asking me to approve each one. Briefly note significant choices in the README. Only stop and ask me when:
- a service would cost money,
- a decision would be hard to undo or changes the scope or direction, or
- you're blocked (e.g., you need an API key from me).

## Build in this order
Work through the steps continuously. After each step, make sure it builds and the widget works with real data, then give me a one- or two-line summary and keep going. I'll review in the browser as you go.

### Step 1 — Foundation
- Scaffold Next.js + TypeScript + Tailwind per CLAUDE.md.
- Header: today's date and weekday, a live clock in Mountain Time, and a greeting ("Good morning, Brian").
- Dark/light theme toggle (dark default), settings menu with Export/Import preferences.
- Reusable widget card: title, source, "Updated" time, refresh button, loading / error / needs-setup / empty states.
- Optional password gate via DASHBOARD_PASSWORD.
- A Daily Briefing strip at the top that fills in as widgets load: Genesee right now, Front Range vs. mountains temperature difference, best snow in the next 72 h plus any Powder Alert, market status and index moves, the top headline, and the count of new videos. Template-based text — no AI.

### Step 2 — Colorado weather (Open-Meteo + NWS alerts)
Locations: Genesee, Golden, Denver, DIA, Keystone, Vail, Breckenridge, Beaver Creek.
- Each location card: current temp, condition and icon, feels-like, today's high/low, precipitation chance, wind speed and direction, humidity.
- Click a card for details: next 24 hours, 7-day forecast, sunrise/sunset, UV, snowfall for mountain locations.
- A temperature comparison across all eight locations.
- Active NWS alerts shown prominently.

### Step 3 — Ski & snow (Keystone, Breckenridge, Vail, Beaver Creek)
- Per resort: estimated snowfall over the last 24 h / 48 h / 7 days (labeled "model estimate"), forecast for the next 24 / 48 / 72 h and 7 days, mid-mountain temperature and wind, and a 14-day bar chart (past 7 days muted, next 7 bright, today marked).
- Powder Alert when the next-24 h forecast is ≥ 6".
- Sort by recent snow or upcoming snow; highlight the best resort.
- Links on every card: OpenSnow report, official snow report, lifts & terrain, webcams, trail map. Plus OpenSnow's I-70 and Colorado Daily Snow.
- A clear note that lift/trail counts and base depth come from the official reports (no public API), and that these numbers are model estimates, not resort-reported totals.

### Step 4 — Today's news (RSS)
- 5–8 top stories ranked by how many outlets cover them, then category tabs: National & World, Business & Markets, Tech & AI, Colorado, Science & Health, Outdoors.
- Each story: headline, source (+ "also covered by"), published time, short summary, thumbnail when the feed provides one, link to the original.
- Deduplicate near-identical headlines across sources. Show which feeds failed, without breaking the widget.

### Step 5 — Stock watchlist (Finnhub)
- Index row: SPY, QQQ, DIA, IWM, labeled as proxies for the S&P 500, NASDAQ, Dow and Russell 2000.
- Editable watchlist (add/remove, saved locally; start with AAPL, MSFT, NVDA, GOOGL, AMZN): ticker, company name, price, $ and % change in green/red, and a day-range bar (low–high with the current price marked).
- Sort by % change or ticker. Market open/closed status. Show each quote's timestamp so delay is obvious.
- Without FINNHUB_API_KEY, show a friendly setup message.

### Step 6 — YouTube (Data API v3)
- Videos from the last 24 hours for my topics: mountain biking, snowboarding/skiing, adventure travel, Claude AI, web development, WordPress/Elementor, personal finance/investing. Topics can be edited in the UI.
- Each video: thumbnail, title, channel, published time, duration, views, link. Filter out Shorts.
- Cache searches for 3 hours and show approximate quota use. Without YOUTUBE_API_KEY, show a setup message.

### Step 7 — README
Setup, how to get each API key, free-tier limits/costs, and how to deploy to Vercel later (env vars, password).

## Ground rules
- Never fabricate or mock data in the UI. Label estimates, forecasts and delayed data.
- Each widget fails independently.
- Ask me before adding any paid service; otherwise use your judgment.
- Sports, air quality, I-70 and outdoor recommendations come in a later phase — don't build them now, but keep the layout ready for more widgets.
