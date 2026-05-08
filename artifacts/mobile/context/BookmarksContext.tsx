import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { PostData } from "@/components/PostCard";

const STORAGE_KEY = "@bookmarks_v1";

function postKey(post: Pick<PostData, "slug" | "locale">): string {
  return `${post.locale}:${post.slug}`;
}

interface BookmarksContextValue {
  bookmarks: PostData[];
  isBookmarked: (slug: string, locale: string) => boolean;
  toggleBookmark: (post: PostData) => void;
}

const BookmarksContext = createContext<BookmarksContextValue>({
  bookmarks: [],
  isBookmarked: () => false,
  toggleBookmark: () => {},
});

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<PostData[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as PostData[];
          if (Array.isArray(parsed)) setBookmarks(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: PostData[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const isBookmarked = useCallback(
    (slug: string, locale: string) =>
      bookmarks.some((b) => postKey(b) === `${locale}:${slug}`),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (post: PostData) => {
      const key = postKey(post);
      setBookmarks((prev) => {
        const exists = prev.some((b) => postKey(b) === key);
        const next = exists
          ? prev.filter((b) => postKey(b) !== key)
          : [post, ...prev];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return (
    <BookmarksContext.Provider value={{ bookmarks, isBookmarked, toggleBookmark }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  return useContext(BookmarksContext);
}
