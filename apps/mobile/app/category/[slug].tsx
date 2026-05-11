import { useListBlogCategories, queryOpts } from "@aklman/api-client";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
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
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { useColors } from "@/hooks/useColors";

export default function CategoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale, isZh } = useLanguage();

  const isAll = slug === "all";
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedPosts({ locale, category: isAll ? undefined : slug });

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  const { data: categories } = useListBlogCategories(
    { locale },
    { query: queryOpts({ refetchOnWindowFocus: false }) }
  );

  const currentCategory = categories?.find((c) => c.slug === slug);

  useEffect(() => {
    navigation.setOptions({
      title: isAll
        ? isZh ? "所有分类" : "Categories"
        : currentCategory?.name ?? slug,
    });
  }, [navigation, currentCategory, isAll, isZh, slug]);

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
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => (
      <PostCard post={item} onPress={() => handlePostPress(item)} />
    ),
    [handlePostPress]
  );

  const ListHeader = isAll && categories && categories.length > 0 ? (
    <View style={styles.allHeader}>
      <Text
        style={[styles.allTitle, { color: colors.text, fontFamily: fonts.serif.bold }]}
      >
        {isZh ? "所有分类" : "Categories"}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {categories.map((cat) => (
          <CategoryPill
            key={cat.slug}
            label={`${cat.name} (${cat.count})`}
            onPress={() =>
              router.replace({
                pathname: "/category/[slug]",
                params: { slug: cat.slug },
              })
            }
          />
        ))}
      </ScrollView>
      <Text
        style={[
          styles.allPosts,
          { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
        ]}
      >
        {isZh ? "全部文章" : "ALL POSTS"}
      </Text>
    </View>
  ) : null;

  const ListFooter = isFetchingNextPage ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12 }]}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
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
          {
            paddingBottom:
              insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0),
          },
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
  allHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  allTitle: {
    fontSize: 24,
    marginBottom: 12,
  },
  catScroll: {
    paddingBottom: 12,
  },
  allPosts: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 4,
  },
  listContent: {
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
