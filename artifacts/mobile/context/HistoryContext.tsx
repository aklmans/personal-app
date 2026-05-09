import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { PostData } from "@/components/PostCard";

const STORAGE_KEY = "@reading_history_v1";
const MAX_HISTORY = 50;

export interface HistoryEntry extends PostData {
  visitedAt: string;
}

function entryKey(entry: Pick<PostData, "slug" | "locale">): string {
  return `${entry.locale}:${entry.slug}`;
}

interface HistoryContextValue {
  history: HistoryEntry[];
  recordVisit: (post: PostData) => void;
  clearHistory: () => void;
  hasRead: (slug: string, locale: string) => boolean;
}

const HistoryContext = createContext<HistoryContextValue>({
  history: [],
  recordVisit: () => {},
  clearHistory: () => {},
  hasRead: () => false,
});

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Array<PostData & { visitedAt?: string }>;
          if (Array.isArray(parsed)) {
            const fallback = new Date().toISOString();
            const migrated: HistoryEntry[] = parsed.map((entry) => ({
              ...entry,
              visitedAt:
                entry.visitedAt && !isNaN(Date.parse(entry.visitedAt))
                  ? entry.visitedAt
                  : entry.pubDate && !isNaN(Date.parse(entry.pubDate))
                  ? entry.pubDate
                  : fallback,
            }));
            setHistory(migrated);
          }
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: HistoryEntry[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const recordVisit = useCallback(
    (post: PostData) => {
      const key = entryKey(post);
      setHistory((prev) => {
        const filtered = prev.filter((p) => entryKey(p) !== key);
        const next: HistoryEntry[] = [
          { ...post, visitedAt: new Date().toISOString() },
          ...filtered,
        ].slice(0, MAX_HISTORY);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const hasRead = useCallback(
    (slug: string, locale: string) =>
      history.some((p) => entryKey(p) === `${locale}:${slug}`),
    [history]
  );

  return (
    <HistoryContext.Provider value={{ history, recordVisit, clearHistory, hasRead }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  return useContext(HistoryContext);
}
