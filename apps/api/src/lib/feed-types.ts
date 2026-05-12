export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  coverImage: string | null;
  categories: string[];
  tags: string[];
  readingTime: number | null;
  locale: string;
  content: string;
  series: string | null;
  seriesSlug: string | null;
  stale?: boolean;
}

export interface BlogTaxonomy {
  slug: string;
  name: string;
  count: number;
}

export interface CacheEntry {
  posts: BlogPost[];
  timestamp: number;
}
