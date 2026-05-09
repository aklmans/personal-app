import {
  useListBlogCategories,
  queryOpts,
} from "@workspace/api-client-react";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPill } from "@/components/CategoryPill";
import type { PostData } from "@/components/PostCard";
import { PostCard } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { useColors } from "@/hooks/useColors";

export default function PostsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { locale, isZh } = useLanguage();
  const insets = useSafeAreaInsets();
  const { clearBadge } = useNotifications();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );

  useFocusEffect(
    useCallback(() => {
      clearBadge();
    }, [clearBadge])
  );

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedPosts({ locale, category: selectedCategory, limit: 20 });

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const { data: categories } = useListBlogCategories(
    { locale },
    { query: queryOpts({ refetchOnWindowFocus: false }) }
  );

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handlePostPress = useCallback(
    (post: PostData) => {
      router.push({
        pathname: "/post/[slug]",
        params: { slug: post.slug, locale },
      });
    },
    [router, locale]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => (
      <PostCard post={item} onPress={() => handlePostPress(item)} />
    ),
    [handlePostPress]
  );

  const ListHeader = (
    <View>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text
          style={[
            styles.heading,
            { color: colors.text, fontFamily: fonts.serif.bold },
          ]}
        >
          {isZh ? "文章" : "Posts"}
        </Text>
        {total > 0 && (
          <Text
            style={[
              styles.count,
              { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
            ]}
          >
            {total}
          </Text>
        )}
      </View>

      {categories && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <CategoryPill
            label={isZh ? "全部" : "All"}
            active={selectedCategory === undefined}
            onPress={() => setSelectedCategory(undefined)}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat.slug}
              label={cat.name}
              active={selectedCategory === cat.slug}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === cat.slug ? undefined : cat.slug
                )
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );

  const ListFooter = isFetchingNextPage ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {ListHeader}
        <View style={styles.skeletons}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={allPosts as PostData[]}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={allPosts.length > 0}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
              ]}
            >
              {isZh ? "暂无文章" : "No posts found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 26,
    letterSpacing: -0.3,
  },
  count: {
    fontSize: 15,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletons: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
