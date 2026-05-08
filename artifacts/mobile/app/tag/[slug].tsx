import { useListBlogPosts, useListBlogTags } from "@workspace/api-client-react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
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
import { useColors } from "@/hooks/useColors";

export default function TagScreen() {
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale, isZh } = useLanguage();

  const isAll = slug === "all";
  const { data: posts, isLoading, refetch, isRefetching } = useListBlogPosts(
    isAll ? { locale } : { locale, tag: slug },
    { query: { enabled: true, refetchOnWindowFocus: false } }
  );

  const { data: tags } = useListBlogTags(
    { locale },
    { query: { refetchOnWindowFocus: false } }
  );

  const currentTag = tags?.find((t) => t.slug === slug);

  useEffect(() => {
    navigation.setOptions({
      title: isAll
        ? isZh ? "所有标签" : "Tags"
        : currentTag?.name ?? slug,
    });
  }, [navigation, currentTag, isAll, isZh, slug]);

  const filteredPosts = posts ?? [];

  const handlePostPress = useCallback(
    (post: PostData) => {
      router.push({
        pathname: "/post/[slug]",
        params: { slug: post.slug, locale },
      });
    },
    [router, locale]
  );

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => (
      <PostCard post={item} onPress={() => handlePostPress(item)} />
    ),
    [handlePostPress]
  );

  const ListHeader = isAll && tags && tags.length > 0 ? (
    <View style={styles.allHeader}>
      <Text
        style={[styles.allTitle, { color: colors.text, fontFamily: fonts.serif.bold }]}
      >
        {isZh ? "所有标签" : "Tags"}
      </Text>
      <View style={styles.tagWrap}>
        {tags.map((tag) => (
          <CategoryPill
            key={tag.slug}
            label={`${tag.name} (${tag.count})`}
            onPress={() =>
              router.replace({
                pathname: "/tag/[slug]",
                params: { slug: tag.slug },
              })
            }
          />
        ))}
      </View>
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12 }]}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredPosts as PostData[]}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(filteredPosts && filteredPosts.length > 0)}
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
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 12,
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
});
