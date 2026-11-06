export type Video = { id: string; title: string; channel: string; publishedAt: number; durationSec: number; views: number; thumb: string; topic: string };
export type YouTubeData = { videos: Video[]; failedTopics: { topic: string; error: string }[]; quota: { usedToday: number; limit: number; lastCallUnits: number } };
export type SubsData = { videos: Video[]; channels: { input: string; id?: string; name?: string; error?: string }[] };
