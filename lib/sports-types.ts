export type SportsGame = {
  id: string;
  start: number; // epoch ms
  state: "pre" | "in" | "post";
  detail: string; // ESPN's short status, e.g. "Final", "Final/OT", "Q3 5:12"
  home: boolean; // is our team at home
  opponent: string; // short name, e.g. "Pelicans"
  opponentAbbr: string;
  us?: number;
  them?: number;
  result?: "W" | "L" | "T";
  url: string;
};
export type SportsTeamResult = {
  id: string;
  name: string;
  url: string; // team schedule page
  last?: SportsGame; // most recent completed game
  live?: SportsGame; // in progress right now
  next?: SportsGame; // next scheduled game
  error?: string; // this team's feed failed; others may still be fine
};
export type SportsData = { teams: SportsTeamResult[] };
