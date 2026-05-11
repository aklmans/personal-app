import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PostData } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { useColors } from "@/hooks/useColors";

type ArchiveItem =
  | { type: "header"; year: string; key: string }
  | { type: "post"; post: PostData; key: string };

function formatDate(pubDate: string): string {
  try {
    return new Date(pubDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return pubDate;
  }
}

function getYear(pubDate: string): string {
  try {
    return String(new Date(pubDate).getFullYear());
  } catch {
    return "Unknown";
  }
}

export default function ArchivesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale, isZh } = useLanguage();

  const { data, isLoading, fetchNextPage, hasNextPage } = usePaginatedPosts({ locale, limit: 100 });

  useEffect(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  const items: ArchiveItem[] = useMemo(() => {
    if (allPosts.length === 0) return [];
    const result: ArchiveItem[] = [];
    let lastYear = "";
    for (const post of allPosts) {
      const year = getYear((post as PostData).pubDate);
      if (year !== lastYear) {
        result.push({ type: "header", year, key: `year-${year}` });
        lastYear = year;
      }
      result.push({ type: "post", post: post as PostData, key: (post as PostData).slug });
    }
    return result;
  }, [allPosts]);

  const handlePostPress = useCallback(
    (post: PostData) => {
      router.push({
        pathname: "/post/[slug]",
        params: { slug: post.slug, locale },
      });
    },
    [router, locale]
  );

  const renderItem = ({ item }: { item: ArchiveItem }) => {
    if (item.type === "header") {
      return (
        <Text
          style={[
            styles.yearHeader,
            {
              color: colors.mutedForeground,
              borderBottomColor: colors.border,
              fontFamily: fonts.sans.semiBold,
            },
          ]}
        >
          {item.year}
        </Text>
      );
    }

    return (
      <Pressable
        onPress={() => handlePostPress(item.post)}
        style={({ pressed }) => [
          styles.postRow,
          {
            borderBottomColor: colors.border,
            backgroundColor: pressed ? colors.secondary : "transparent",
          },
        ]}
      >
        <Text
          style={[
            styles.postDate,
            { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
          ]}
        >
          {formatDate(item.post.pubDate)}
        </Text>
        <Text
          style={[
            styles.postTitle,
            { color: colors.text, fontFamily: fonts.serif.semiBold },
          ]}
          numberOfLines={2}
        >
          {item.post.title}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: fonts.sans.regular,
                  },
                ]}
              >
                {isZh ? "暂无文章" : "No posts found"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
  },
  yearHeader: {
    fontSize: 13,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  postRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  postDate: {
    width: 58,
    fontSize: 12,
    paddingTop: 2,
    flexShrink: 0,
  },
  postTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
