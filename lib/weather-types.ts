export type Alert = {
  id: string; event: string; severity: string; headline: string; description: string;
  areas: string; ends: string | null; sender: string; locations: string[];
};
export type WLocation = {
  id: string; name: string; region: "front-range" | "mountains"; hasSnow: boolean;
  current: { temp: number; feels: number; humidity: number; code: number; wind: number; windDir: number; gust: number; isDay: boolean };
  hourly: { t: string; temp: number; pop: number; code: number; snow: number }[];
  daily: { date: string; code: number; hi: number; lo: number; pop: number; sunrise: string; sunset: string; uv: number; snow: number }[];
};
export type WeatherData = { locations: WLocation[]; alerts: Alert[]; alertsError?: string };
