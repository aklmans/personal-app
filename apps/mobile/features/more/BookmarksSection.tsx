import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import HighlightedTitle from "@/components/HighlightedTitle";
import type { PostData } from "@/components/PostCard";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

import type { SortOrder } from "./types";

interface BookmarksSectionProps {
  activeCategory: string | null;
  bookmarkCategories: string[];
  bookmarkSort: SortOrder;
  bookmarks: PostData[];
  displayedBookmarks: PostData[];
  isZh: boolean;
  onOpenPost: (post: PostData) => void;
  onSearchQueryChange: (query: string) => void;
  onSetActiveCategory: (cat: string | null) => void;
  onSetBookmarkSort: (sort: SortOrder) => void;
  onToggleBookmark: (post: PostData) => void;
  searchQuery: string;
}

export function BookmarksSection({
  activeCategory,
  bookmarkCategories,
  bookmarkSort,
  bookmarks,
  displayedBookmarks,
  isZh,
  onOpenPost,
  onSearchQueryChange,
  onSetActiveCategory,
  onSetBookmarkSort,
  onToggleBookmark,
  searchQuery,
}: BookmarksSectionProps) {
  const colors = useColors();

  return (
    <View style={[styles.section, { marginTop: 24 }]}>
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
          ]}
        >
          {isZh ? "书签" : "BOOKMARKS"}
        </Text>
        {bookmarks.length > 0 && (
          <View style={styles.sortToggle}>
            <Pressable
              onPress={() => onSetBookmarkSort("newest")}
              style={[
                styles.sortBtn,
                {
                  backgroundColor: bookmarkSort === "newest" ? colors.primary : colors.secondary,
                  borderColor: bookmarkSort === "newest" ? colors.primary : colors.border,
                },
              ]}
              accessibilityLabel={isZh ? "最新" : "Newest first"}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.sortBtnLabel,
                  {
                    color: bookmarkSort === "newest" ? "#ffffff" : colors.mutedForeground,
                    fontFamily: fonts.sans.medium,
                  },
                ]}
              >
                {isZh ? "最新" : "Newest"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSetBookmarkSort("oldest")}
              style={[
                styles.sortBtn,
                {
                  backgroundColor: bookmarkSort === "oldest" ? colors.primary : colors.secondary,
                  borderColor: bookmarkSort === "oldest" ? colors.primary : colors.border,
                },
              ]}
              accessibilityLabel={isZh ? "最早" : "Oldest first"}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.sortBtnLabel,
                  {
                    color: bookmarkSort === "oldest" ? "#ffffff" : colors.mutedForeground,
                    fontFamily: fonts.sans.medium,
                  },
                ]}
              >
                {isZh ? "最早" : "Oldest"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {bookmarks.length > 0 && bookmarkCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => onSetActiveCategory(null)}
            style={[
              styles.chip,
              {
                backgroundColor: activeCategory === null ? colors.primary : colors.secondary,
                borderColor: activeCategory === null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                {
                  color: activeCategory === null ? "#ffffff" : colors.mutedForeground,
                  fontFamily: fonts.sans.medium,
                },
              ]}
            >
              {isZh ? "全部" : "All"}
            </Text>
          </Pressable>
          {bookmarkCategories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => onSetActiveCategory(activeCategory === cat ? null : cat)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCategory === cat ? colors.primary : colors.secondary,
                  borderColor: activeCategory === cat ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: activeCategory === cat ? "#ffffff" : colors.mutedForeground,
                    fontFamily: fonts.sans.medium,
                  },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {bookmarks.length > 0 && (
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder={isZh ? "搜索书签…" : "Search bookmarks…"}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.text, fontFamily: fonts.sans.regular }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => onSearchQueryChange("")} hitSlop={8}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {bookmarks.length === 0 ? (
        <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="bookmark" size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
            {isZh ? "尚无书签。在文章页面点击书签图标即可保存。" : "No bookmarks yet. Tap the bookmark icon on any article to save it."}
          </Text>
        </View>
      ) : displayedBookmarks.length === 0 ? (
        <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={searchQuery.trim() ? "search" : "filter"} size={22} color={colors.mutedForeground} />
          <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
            {searchQuery.trim()
              ? (isZh ? "没有符合的书签。" : "No bookmarks match your search.")
              : (isZh ? "此分类下暂无书签。" : "No bookmarks in this category.")}
          </Text>
        </View>
      ) : (
        displayedBookmarks.map((post) => (
          <Pressable
            key={`${post.locale}:${post.slug}`}
            onPress={() => onOpenPost(post)}
            style={({ pressed }) => [
              styles.bookmarkRow,
              {
                backgroundColor: pressed ? colors.secondary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {post.coverImage ? (
              <Image
                source={{ uri: post.coverImage }}
                style={[styles.bookmarkThumb, { backgroundColor: colors.muted }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.bookmarkThumb, styles.bookmarkThumbPlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="book-open" size={16} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.bookmarkContent}>
              <HighlightedTitle
                text={post.title}
                query={searchQuery}
                style={[styles.bookmarkTitle, { color: colors.text, fontFamily: fonts.serif.semiBold }]}
                highlightColor={colors.primary}
                numberOfLines={2}
              />
              {post.categories.length > 0 && (
                <Text style={[styles.bookmarkMeta, { color: colors.primary, fontFamily: fonts.sans.regular }]}>
                  {post.categories[0]}
                </Text>
              )}
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleBookmark(post);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, padding: 4 })}
              accessibilityLabel="Remove bookmark"
              accessibilityRole="button"
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  sortToggle: {
    flexDirection: "row",
    gap: 4,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sortBtnLabel: {
    fontSize: 12,
  },
  chipScroll: {
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  searchIcon: {
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  emptyBookmarks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  emptyBookmarksText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
    overflow: "hidden",
    paddingRight: 10,
  },
  bookmarkThumb: {
    width: 60,
    height: 60,
  },
  bookmarkThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkContent: {
    flex: 1,
    paddingVertical: 8,
  },
  bookmarkTitle: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 3,
  },
  bookmarkMeta: {
    fontSize: 12,
  },
});
