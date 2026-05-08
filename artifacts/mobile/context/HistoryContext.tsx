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

function postKey(post: Pick<PostData, "slug" | "locale">): string {
  return `${post.locale}:${post.slug}`;
}

interface HistoryContextValue {
  history: PostData[];
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
  const [history, setHistory] = useState<PostData[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as PostData[];
          if (Array.isArray(parsed)) setHistory(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: PostData[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const recordVisit = useCallback(
    (post: PostData) => {
      const key = postKey(post);
      setHistory((prev) => {
        const filtered = prev.filter((p) => postKey(p) !== key);
        const next = [post, ...filtered].slice(0, MAX_HISTORY);
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
      history.some((p) => postKey(p) === `${locale}:${slug}`),
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
