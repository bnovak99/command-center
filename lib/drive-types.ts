export type DriveTime = {
  id: string;
  name: string;
  minutes?: number; // with current traffic
  delayMinutes?: number;
  miles?: number;
  mapsUrl: string;
  error?: string;
};
export type DriveData = { origin: string; destinations: DriveTime[]; departAt: number };
