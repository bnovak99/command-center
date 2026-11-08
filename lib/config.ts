// All configurable lists live here. Adding a widget = config entry + API route + component.
export const TZ = "America/Denver";
export const POWDER_ALERT_INCHES = 6;

export type Location = { id: string; name: string; lat: number; lon: number; region: "front-range" | "mountains"; resort?: string };

export const LOCATIONS: Location[] = [
  { id: "genesee", name: "Genesee", lat: 39.6861, lon: -105.2736, region: "front-range" },
  { id: "golden", name: "Golden", lat: 39.7555, lon: -105.2211, region: "front-range" },
  { id: "denver", name: "Denver", lat: 39.7392, lon: -104.9903, region: "front-range" },
  { id: "dia", name: "Denver Int'l Airport", lat: 39.8561, lon: -104.6737, region: "front-range" },
  { id: "keystone", name: "Keystone", lat: 39.6045, lon: -105.9437, region: "mountains", resort: "keystone" },
  { id: "vail", name: "Vail", lat: 39.6403, lon: -106.3742, region: "mountains", resort: "vail" },
  { id: "breckenridge", name: "Breckenridge", lat: 39.4817, lon: -106.0384, region: "mountains", resort: "breckenridge" },
  { id: "beavercreek", name: "Beaver Creek", lat: 39.6042, lon: -106.5165, region: "mountains", resort: "beavercreek" },
];

export type Resort = { id: string; name: string; lat: number; lon: number; elevationM: number; domain: string };

export const RESORTS: Resort[] = [
  { id: "keystone", name: "Keystone", lat: 39.5792, lon: -105.9347, elevationM: 3300, domain: "keystoneresort.com" },
  { id: "breckenridge", name: "Breckenridge", lat: 39.4686, lon: -106.0816, elevationM: 3350, domain: "breckenridge.com" },
  { id: "vail", name: "Vail", lat: 39.6225, lon: -106.377, elevationM: 3100, domain: "vail.com" },
  { id: "beavercreek", name: "Beaver Creek", lat: 39.589, lon: -106.522, elevationM: 3050, domain: "beavercreek.com" },
];

export function resortLinks(r: Resort) {
  const base = `https://www.${r.domain}/the-mountain`;
  return [
    { label: "OpenSnow report", href: `https://opensnow.com/location/${r.id}/snow-report` },
    { label: "Official report", href: `${base}/mountain-conditions/snow-and-weather-report.aspx` },
    { label: "Lifts & terrain", href: `${base}/mountain-conditions/terrain-and-lift-status.aspx` },
    { label: "Webcams", href: `https://opensnow.com/location/${r.id}/cams` },
    { label: "Trail map", href: `${base}/about-the-mountain/trail-map.aspx` },
  ];
}

export const REGIONAL_LINKS = [
  { label: "OpenSnow I-70 Daily Snow", href: "https://opensnow.com/dailysnow/i70" },
  { label: "OpenSnow Colorado Daily Snow", href: "https://opensnow.com/dailysnow/colorado" },
];

export const NEWS_CATEGORIES = ["National & World", "Business & Markets", "Tech & AI", "Colorado", "Science & Health", "Outdoors", "Sports"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_FEEDS: { source: string; url: string; category: NewsCategory }[] = [
  { source: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "National & World" },
  { source: "NPR", url: "https://feeds.npr.org/1001/rss.xml", category: "National & World" },
  { source: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "National & World" },
  { source: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", category: "National & World" },
  { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", category: "Business & Markets" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", category: "Business & Markets" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "Business & Markets" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "Tech & AI" },
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tech & AI" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tech & AI" },
  { source: "Denver Post", url: "https://www.denverpost.com/feed/", category: "Colorado" },
  { source: "Colorado Sun", url: "https://coloradosun.com/feed/", category: "Colorado" },
  { source: "CPR News", url: "https://www.cpr.org/feed/", category: "Colorado" },
  { source: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml", category: "Science & Health" },
  { source: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "Science & Health" },
  { source: "Outside", url: "https://www.outsideonline.com/feed/", category: "Outdoors" },
  { source: "Pinkbike", url: "https://www.pinkbike.com/pinkbike_xml_feed.php", category: "Outdoors" },
  { source: "Powder", url: "https://www.powder.com/feed", category: "Outdoors" },
  // Sports: ESPN headlines (all, NFL, NBA) plus SB Nation team blogs for the Broncos and Lions.
  { source: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "Sports" },
  { source: "ESPN NFL", url: "https://www.espn.com/espn/rss/nfl/news", category: "Sports" },
  { source: "ESPN NBA", url: "https://www.espn.com/espn/rss/nba/news", category: "Sports" },
  { source: "Mile High Report", url: "https://www.milehighreport.com/rss/index.xml", category: "Sports" },
  { source: "Pride of Detroit", url: "https://www.prideofdetroit.com/rss/index.xml", category: "Sports" },
];
export const CATEGORY_WEIGHT: Record<NewsCategory, number> = {
  "National & World": 1.2, "Business & Markets": 1, "Tech & AI": 1, Colorado: 1.1, "Science & Health": 0.9, Outdoors: 0.8, Sports: 0.8,
};

export const INDEX_PROXIES = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "DIA", label: "Dow" },
  { symbol: "IWM", label: "Russell 2000" },
];
export const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];

export const DEFAULT_YT_TOPICS = [
  "mountain biking",
  "snowboarding skiing",
  "adventure travel",
  "Claude AI",
  "web development",
  "WordPress Elementor",
  "personal finance investing",
];

// Favorite/subscribed channels shown in the YouTube "Subscriptions" view.
// Accepts @handles, youtube.com URLs, or UC… channel IDs. Can also be edited in the UI (saved locally).
export const DEFAULT_YT_CHANNELS: string[] = [];

// Auto-refresh intervals (ms)
export const REFRESH = { weather: 15 * 60_000, snow: 30 * 60_000, news: 30 * 60_000, stocksOpen: 60_000, stocksClosed: 15 * 60_000, youtube: 3 * 60 * 60_000, i70: 10 * 60_000, drive: 10 * 60_000, calendar: 10 * 60_000, packages: 15 * 60_000, photo: 60 * 60_000, sports: 10 * 60_000 };

// Briefing photo: a random personal photo, changed every `rotateMs`. Files live in the gitignored photos/ folder
// locally and in a private Vercel Blob store (under blobPrefix) on the deployed site.
export const PHOTOS = { rotateMs: 60 * 60_000, blobPrefix: "briefing-photos/" };

// Calendar: days shown starting today (MT). Calendars come from GOOGLE_CALENDAR_ICS in .env.local (secret URLs stay out of git).
export const CALENDAR_DAYS = 7;

// Packages: shipping emails found via Gmail IMAP (GMAIL_USER / GMAIL_APP_PASSWORD in .env.local).
export const PACKAGES = {
  lookbackDays: 21,
  maxEmails: 80,
  gmailQuery:
    'from:(ups.com OR usps.com OR fedex.com OR shipment-tracking@amazon.com OR order-update@amazon.com OR dhl.com) OR subject:("has shipped" OR "out for delivery" OR delivered OR "on its way" OR "on the way" OR "tracking number" OR "shipment" OR "arriving")',
};

// Drive-time destinations (lat, lon). Origin comes from HOME_ADDRESS in .env.local so the address stays out of git.
export const DRIVE_DESTINATIONS = [
  { id: "keystone", name: "Keystone", lat: 39.6045, lon: -105.9437 },
  { id: "vail", name: "Vail", lat: 39.6403, lon: -106.3742 },
  { id: "breckenridge", name: "Breckenridge", lat: 39.4817, lon: -106.0384 },
  { id: "denver", name: "Denver", lat: 39.7392, lon: -104.9903 },
  { id: "dia", name: "Denver Int'l Airport (DIA)", lat: 39.8561, lon: -104.6737 },
  { id: "boulder", name: "Boulder", lat: 40.015, lon: -105.2705 },
];

// I-70 mountain corridor for chain-law / closure alerts (CDOT COtrip feed, no key). Mile points: Golden/C-470 ≈ 260, Avon/Beaver Creek ≈ 167.
export const I70_CORRIDOR = { route: "I-70", label: "I-70 Golden to Avon", minMp: 160, maxMp: 262 };

// Sports: latest result and next game per team, from ESPN's public (keyless) team schedule JSON.
// `league` is ESPN's sport/league path; `team` is ESPN's team abbreviation in that league.
export type SportsTeam = { id: string; name: string; league: "basketball/nba" | "football/nfl"; team: string; url: string };
export const SPORTS_TEAMS: SportsTeam[] = [
  { id: "nuggets", name: "Nuggets", league: "basketball/nba", team: "den", url: "https://www.espn.com/nba/team/schedule/_/name/den" },
  { id: "broncos", name: "Broncos", league: "football/nfl", team: "den", url: "https://www.espn.com/nfl/team/schedule/_/name/den" },
  { id: "lions", name: "Lions", league: "football/nfl", team: "det", url: "https://www.espn.com/nfl/team/schedule/_/name/det" },
];
