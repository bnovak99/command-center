export type SnowResort = {
  id: string; name: string; elevationFt: number;
  current: { temp: number; wind: number; gust: number; code: number };
  /** overnight = since 6 PM MT (yesterday's, or today's once it's past 6 PM) through the current hour. */
  past: { overnight: number; h24: number; h48: number; d7: number };
  next: { h24: number; h48: number; h72: number; d7: number };
  daily: { date: string; snow: number; kind: "past" | "today" | "future" }[];
};
export type SnowData = { resorts: SnowResort[]; asOf: string };
