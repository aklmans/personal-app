import { Feather } from "@expo/vector-icons";
import { useListBlogPosts, useListBlogSeries } from "@workspace/api-client-react";
import type { BlogPost } from "@workspace/api-zod";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type PostData = BlogPost;

export default function SeriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale, isZh } = useLanguage();

  const isAll = slug === "all";
  const { data: posts, isLoading, refetch, isRefetching } = useListBlogPosts(
    isAll ? { locale } : { locale, series: slug },
    { query: { enabled: true, refetchOnWindowFocus: false } }
  );

  const { data: seriesList } = useListBlogSeries(
    { locale },
    { query: { refetchOnWindowFocus: false } }
  );

  const currentSeries = seriesList?.find((s) => s.slug === slug);

  useEffect(() => {
    navigation.setOptions({
      title: isAll
        ? isZh ? "系列" : "Series"
        : currentSeries?.name ?? slug,
    });
  }, [navigation, currentSeries, isAll, isZh, slug]);

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

  const bottomPad = insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0);

  if (!isAll && seriesList && !currentSeries) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="layers" size={36} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
          {isZh ? "未找到系列" : "Series not found"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isAll && seriesList && seriesList.length > 0 && (
        <View style={[styles.seriesHeader, { borderBottomColor: colors.border }]}>
          <FlatList
            data={seriesList}
            horizontal
            keyExtractor={(s) => s.slug}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/series/[slug]", params: { slug: item.slug } })
                }
                style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.chipText, { color: colors.text, fontFamily: fonts.sans.medium }]}>
                  {item.name}
                </Text>
                <Text style={[styles.chipCount, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                  {item.count}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <FlatList
        data={isLoading ? Array(3).fill(null) : filteredPosts}
        keyExtractor={(item, i) => (item ? item.slug : `skel-${i}`)}
        renderItem={({ item }) =>
          item ? (
            <PostCard post={item} onPress={handlePostPress} />
          ) : (
            <SkeletonCard />
          )
        }
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.center}>
              <Feather name="layers" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "暂无文章" : "No posts in this series"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  seriesHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13 },
  chipCount: { fontSize: 12 },
  list: { paddingTop: 8 },
  emptyText: { fontSize: 16, marginTop: 8 },
});
