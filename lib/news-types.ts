export type Story = {
  id: string; title: string; link: string; source: string; category: string;
  publishedAt: number; summary: string; image?: string; alsoCoveredBy: string[]; outlets: number; score: number;
};
export type NewsData = {
  top: Story[];
  byCategory: Record<string, Story[]>;
  feeds: { source: string; ok: boolean; count: number; error?: string }[];
};
