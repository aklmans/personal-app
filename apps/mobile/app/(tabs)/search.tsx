import { useSearchBlogPosts, queryOpts } from "@aklman/api-client";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PostData } from "@/components/PostCard";
import { PostCard } from "@/components/PostCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { locale, isZh } = useLanguage();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useSearchBlogPosts(
    { q: query, locale },
    {
      query: queryOpts({
        enabled: query.trim().length > 1,
        refetchOnWindowFocus: false,
      }),
    }
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

  const renderItem = useCallback(
    ({ item }: { item: PostData }) => (
      <PostCard post={item} onPress={() => handlePostPress(item)} />
    ),
    [handlePostPress]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerArea,
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
          {isZh ? "搜索" : "Search"}
        </Text>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isZh ? "搜索文章…" : "Search posts…"}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.text,
                fontFamily: fonts.sans.regular,
              },
            ]}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {query.trim().length <= 1 ? (
        <View style={styles.emptyHint}>
          <Text
            style={[
              styles.hint,
              { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
            ]}
          >
            {isZh ? "输入至少2个字符开始搜索" : "Type at least 2 characters to search"}
          </Text>
        </View>
      ) : isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={(results ?? []) as PostData[]}
          keyExtractor={(item) => item.slug}
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
            <View style={styles.emptyHint}>
              <Text
                style={[
                  styles.hint,
                  { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
                ]}
              >
                {isZh ? "未找到相关文章" : `No results for "${query}"`}
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
  headerArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 26,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  searchBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    flex: 1,
  },
  emptyHint: {
    padding: 40,
    alignItems: "center",
  },
  hint: {
    fontSize: 15,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
