import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroPost } from "@/components/HeroPost";
import type { PostData } from "@/components/PostCard";
import { PostCard } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { locale, toggleLocale, isZh } = useLanguage();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedPosts({ locale, limit: 10 });

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];
  const hero = allPosts[0] as PostData | undefined;
  const recent = allPosts.slice(1) as PostData[];

  const handlePostPress = useCallback(
    (post: PostData) => {
      router.push({ pathname: "/post/[slug]", params: { slug: post.slug, locale } });
    },
    [router, locale]
  );

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

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
            styles.blogName,
            { color: colors.text, fontFamily: fonts.serif.bold },
          ]}
        >
          aklman
        </Text>
        <Pressable
          onPress={toggleLocale}
          style={[styles.langToggle, { borderColor: colors.border }]}
        >
          <Text
            style={[
              styles.langText,
              { color: colors.mutedForeground, fontFamily: fonts.sans.medium },
            ]}
          >
            {isZh ? "EN" : "中文"}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.content, { paddingTop: 16 }]}>
          <View style={[styles.skeletonHero, { backgroundColor: colors.muted }]} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : hero ? (
        <View style={styles.content}>
          <HeroPost post={hero} onPress={() => handlePostPress(hero)} />
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
            ]}
          >
            {isZh ? "近期文章" : "Recent Posts"}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const ListFooter = isFetchingNextPage ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={recent}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLoading}
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
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "暂无文章" : "No posts found"}
              </Text>
            </View>
          ) : null
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  blogName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  langToggle: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  langText: {
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  skeletonHero: {
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyState: {
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
