export type I70Alert = {
  id: string;
  kind: "chain-law" | "closure";
  headline: string; // CDOT's own title, e.g. "I-70 westbound: Chain law in effect."
  direction: "eastbound" | "westbound" | "both" | "unknown";
  fromMp?: number;
  toMp?: number;
  updated?: number; // epoch ms, CDOT's last update
  url: string; // where to check it (COtrip)
};
export type I70Data = { corridor: string; alerts: I70Alert[] };
