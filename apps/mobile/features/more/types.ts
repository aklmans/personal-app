export type SortOrder = "newest" | "oldest";

export interface ReadingStats {
  totalArticles: number;
  totalMinutes: number;
  topCategories: string[];
}
