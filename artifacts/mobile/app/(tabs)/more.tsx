import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import HighlightedTitle from "@/components/HighlightedTitle";
import { fonts } from "@/constants/fonts";
import { useBookmarks } from "@/context/BookmarksContext";
import { useHistory, type HistoryEntry } from "@/context/HistoryContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

function formatVisitedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dateStart.getTime() === todayStart.getTime()) return "Today";
  if (dateStart.getTime() === yesterdayStart.getTime()) return "Yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatVisitedAtZh(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dateStart.getTime() === todayStart.getTime()) return "今天";
  if (dateStart.getTime() === yesterdayStart.getTime()) return "昨天";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

interface NavItem {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  labelZh: string;
  onPress: () => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; labelZh: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "light", label: "Light", labelZh: "浅色", icon: "sun" },
  { value: "dark", label: "Dark", labelZh: "深色", icon: "moon" },
  { value: "system", label: "System", labelZh: "跟随系统", icon: "smartphone" },
];

type SortOrder = "newest" | "oldest";

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locale, toggleLocale, isZh } = useLanguage();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { history, clearHistory } = useHistory();
  const { optedIn, permissionStatus, isLoading, enable, disable, notifCategories, setNotifCategories, availableCategories, refreshAvailableCategories, clearBadge } = useNotifications();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [bookmarkSort, setBookmarkSort] = useState<SortOrder>("newest");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("@bookmark_sort_v1")
      .then((val) => {
        if (val === "newest" || val === "oldest") setBookmarkSort(val);
      })
      .catch(() => {});
  }, []);

  const handleSetBookmarkSort = useCallback((sort: SortOrder) => {
    setBookmarkSort(sort);
    AsyncStorage.setItem("@bookmark_sort_v1", sort).catch(() => {});
  }, []);

  const bookmarkCategories = useMemo(() => {
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const b of bookmarks) {
      for (const c of b.categories) {
        if (!seen.has(c)) {
          seen.add(c);
          cats.push(c);
        }
      }
    }
    return cats;
  }, [bookmarks]);

  const displayedBookmarks = useMemo(() => {
    let filtered = activeCategory
      ? bookmarks.filter((b) => b.categories.includes(activeCategory))
      : bookmarks;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((b) => b.title.toLowerCase().includes(q));
    }
    return bookmarkSort === "newest" ? filtered : [...filtered].reverse();
  }, [bookmarks, activeCategory, bookmarkSort, searchQuery]);

  React.useEffect(() => {
    if (activeCategory !== null && !bookmarkCategories.includes(activeCategory)) {
      setActiveCategory(null);
    }
  }, [bookmarkCategories, activeCategory]);

  useFocusEffect(
    useCallback(() => {
      refreshAvailableCategories();
      clearBadge();
      return () => { setSearchQuery(""); setHistoryQuery(""); };
    }, [refreshAvailableCategories, clearBadge])
  );

  const displayedHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (q) return history.filter((e) => e.title.toLowerCase().includes(q));
    return history;
  }, [history, historyQuery]);

  const allKnownCategories = useMemo(() => {
    const seen = new Set<string>(availableCategories);
    const cats: string[] = [...availableCategories];
    for (const entry of history) {
      for (const c of entry.categories ?? []) {
        if (!seen.has(c)) { seen.add(c); cats.push(c); }
      }
    }
    for (const b of bookmarks) {
      for (const c of b.categories) {
        if (!seen.has(c)) { seen.add(c); cats.push(c); }
      }
    }
    return cats;
  }, [availableCategories, history, bookmarks]);

  const readingStats = useMemo(() => {
    const totalArticles = history.length;
    const totalMinutes = history.reduce((sum, e) => sum + (e.readingTime ?? 0), 0);
    const catCounts: Record<string, number> = {};
    for (const e of history) {
      const cat = e.categories?.[0];
      if (cat) catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
    const topCategory =
      Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] ?? null;
    return { totalArticles, totalMinutes, topCategory };
  }, [history]);

  const openUrl = useCallback(async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const navItems: NavItem[] = [
    {
      icon: "grid",
      label: "Categories",
      labelZh: "分类",
      onPress: () =>
        router.push({ pathname: "/category/[slug]", params: { slug: "all" } }),
    },
    {
      icon: "tag",
      label: "Tags",
      labelZh: "标签",
      onPress: () =>
        router.push({ pathname: "/tag/[slug]", params: { slug: "all" } }),
    },
    {
      icon: "archive",
      label: "Archives",
      labelZh: "归档",
      onPress: () => router.push("/archives"),
    },
    {
      icon: "layers",
      label: "Series",
      labelZh: "系列",
      onPress: () =>
        router.push({ pathname: "/series/[slug]", params: { slug: "all" } }),
    },
    {
      icon: "star",
      label: "Showcases",
      labelZh: "作品集",
      onPress: () => router.push("/showcases"),
    },
    {
      icon: "user",
      label: "About",
      labelZh: "关于",
      onPress: () => router.push("/about"),
    },
    {
      icon: "rss",
      label: "RSS Feed",
      labelZh: "RSS 订阅",
      onPress: () =>
        openUrl(
          isZh
            ? "https://aklman.com/zh-cn/rss.xml"
            : "https://aklman.com/rss.xml"
        ),
    },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom:
            insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.blogHeader,
          { borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.blogTitle,
            { color: colors.text, fontFamily: fonts.serif.bold },
          ]}
        >
          aklman
        </Text>
        <Text
          style={[
            styles.blogSubtitle,
            { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
          ]}
        >
          aklman.com
        </Text>
      </View>

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
                onPress={() => handleSetBookmarkSort("newest")}
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
                onPress={() => handleSetBookmarkSort("oldest")}
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
              onPress={() => setActiveCategory(null)}
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
                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
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
              onChangeText={setSearchQuery}
              placeholder={isZh ? "搜索书签…" : "Search bookmarks…"}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.text, fontFamily: fonts.sans.regular }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
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
              onPress={() =>
                router.push({
                  pathname: "/post/[slug]",
                  params: { slug: post.slug, locale: post.locale },
                })
              }
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
                  toggleBookmark(post);
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

      {readingStats.totalArticles > 0 && (
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
            ]}
          >
            {isZh ? "阅读统计" : "READING STATS"}
          </Text>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statItem, { borderRightColor: colors.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="book-open" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.serif.bold }]}>
                {readingStats.totalArticles}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "已读文章" : "Articles Read"}
              </Text>
            </View>
            <View style={[styles.statItem, { borderRightColor: colors.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="clock" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.serif.bold }]}>
                {readingStats.totalMinutes > 0 ? `${readingStats.totalMinutes}` : "—"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "预计分钟" : "Est. Minutes"}
              </Text>
            </View>
            <View style={[styles.statItem, { borderRightWidth: 0 }]}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="tag" size={18} color={colors.primary} />
              </View>
              <Text
                style={[styles.statValue, { color: colors.text, fontFamily: fonts.serif.bold, fontSize: readingStats.topCategory && readingStats.topCategory.length > 8 ? 16 : 26 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {readingStats.topCategory ?? "—"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "最多分类" : "Top Category"}
              </Text>
            </View>
          </View>
          <Text style={[styles.statsResetHint, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
            {isZh ? "清除阅读记录即可重置统计数据" : "Clear reading history to reset stats"}
          </Text>
        </View>
      )}

      <View style={[styles.section, { marginTop: 24 }]}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
            ]}
          >
            {isZh ? "最近阅读" : "RECENTLY READ"}
          </Text>
          {history.length > 0 && (
            <Pressable
              onPress={clearHistory}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={[styles.clearBtn, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                {isZh ? "清除记录与统计" : "Clear history & stats"}
              </Text>
            </Pressable>
          )}
        </View>
        {history.length > 0 && (
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} style={styles.searchIcon} />
            <TextInput
              value={historyQuery}
              onChangeText={setHistoryQuery}
              placeholder={isZh ? "搜索历史记录…" : "Search history…"}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.text, fontFamily: fonts.sans.regular }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {historyQuery.length > 0 && Platform.OS !== "ios" && (
              <Pressable onPress={() => setHistoryQuery("")} hitSlop={8}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}

        {history.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
              {isZh ? "尚无阅读记录。打开文章后将自动记录在这里。" : "No reading history yet. Articles you open will appear here."}
            </Text>
          </View>
        ) : displayedHistory.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
              {isZh ? "没有符合的阅读记录。" : "No history matches your search."}
            </Text>
          </View>
        ) : (
          displayedHistory.map((entry: HistoryEntry) => (
            <Pressable
              key={`${entry.locale}:${entry.slug}`}
              onPress={() =>
                router.push({
                  pathname: "/post/[slug]",
                  params: { slug: entry.slug, locale: entry.locale },
                })
              }
              style={({ pressed }) => [
                styles.bookmarkRow,
                {
                  backgroundColor: pressed ? colors.secondary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {entry.coverImage ? (
                <Image
                  source={{ uri: entry.coverImage }}
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
                  text={entry.title}
                  query={historyQuery}
                  style={[styles.bookmarkTitle, { color: colors.text, fontFamily: fonts.serif.semiBold }]}
                  highlightColor={colors.primary}
                  numberOfLines={2}
                />
                <View style={styles.historyMeta}>
                  {entry.categories.length > 0 && (
                    <Text style={[styles.bookmarkMeta, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                      {entry.categories[0]}
                    </Text>
                  )}
                  {entry.categories.length > 0 && (
                    <Text style={[styles.historyDot, { color: colors.mutedForeground }]}>·</Text>
                  )}
                  <Text style={[styles.bookmarkMeta, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                    {isZh ? formatVisitedAtZh(entry.visitedAt) : formatVisitedAt(entry.visitedAt)}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))
        )}
      </View>

      <View style={[styles.section, { marginTop: 24 }]}>
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
          ]}
        >
          {isZh ? "导航" : "NAVIGATE"}
        </Text>
        {navItems.map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? colors.secondary
                  : colors.card,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Feather name={item.icon} size={17} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.rowLabel,
                  { color: colors.text, fontFamily: fonts.sans.medium },
                ]}
              >
                {isZh ? item.labelZh : item.label}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        ))}
      </View>

      <View style={[styles.section, { marginTop: 24 }]}>
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
          ]}
        >
          {isZh ? "设置" : "SETTINGS"}
        </Text>

        <View
          style={[
            styles.settingRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.rowLeft}>
            <View
              style={[styles.iconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather name="globe" size={17} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.rowLabel,
                { color: colors.text, fontFamily: fonts.sans.medium },
              ]}
            >
              {isZh ? "语言" : "Language"}
            </Text>
          </View>
          <Pressable
            onPress={toggleLocale}
            style={[
              styles.langBadge,
              { borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.langBadgeText,
                { color: colors.primary, fontFamily: fonts.sans.semiBold },
              ]}
            >
              {isZh ? "EN" : "中文"}
            </Text>
          </Pressable>
        </View>

        {Platform.OS !== "web" && (
          <View
            style={[
              styles.settingRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <View
                style={[styles.iconWrap, { backgroundColor: colors.secondary }]}
              >
                <Feather name="bell" size={17} color={colors.primary} />
              </View>
              <View>
                <Text
                  style={[
                    styles.rowLabel,
                    { color: colors.text, fontFamily: fonts.sans.medium },
                  ]}
                >
                  {isZh ? "新文章通知" : "New Post Alerts"}
                </Text>
                {permissionStatus === "denied" && !optedIn && (
                  <Text
                    style={[
                      styles.notifHint,
                      { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
                    ]}
                  >
                    {isZh ? "请在系统设置中允许通知" : "Enable in system settings"}
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={optedIn}
              onValueChange={(val) => (val ? enable() : disable())}
              disabled={isLoading || (permissionStatus === "denied" && !optedIn)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
              testID="notifications-toggle"
            />
          </View>
        )}

        {optedIn && Platform.OS !== "web" && allKnownCategories.length > 0 && (
          <View
            style={[
              styles.notifTopicsBlock,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.notifTopicsHeader}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold, marginBottom: 0, marginTop: 0 },
                ]}
              >
                {isZh ? "通知主题" : "NOTIFY FOR TOPICS"}
              </Text>
              <Text
                style={[
                  styles.notifTopicsHint,
                  { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
                ]}
              >
                {isZh ? "空选 = 全部" : "Empty = all"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={styles.chipRow}
            >
              {allKnownCategories.map((cat) => {
                const isSelected = notifCategories.includes(cat);
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      const next = isSelected
                        ? notifCategories.filter((c) => c !== cat)
                        : [...notifCategories, cat];
                      void setNotifCategories(next);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.secondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={cat}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        {
                          color: isSelected ? "#ffffff" : colors.mutedForeground,
                          fontFamily: fonts.sans.medium,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.themeBlock,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.rowLeft, { paddingBottom: 10 }]}>
            <View
              style={[styles.iconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather
                name={preference === "dark" ? "moon" : preference === "light" ? "sun" : "smartphone"}
                size={17}
                color={colors.primary}
              />
            </View>
            <Text
              style={[
                styles.rowLabel,
                { color: colors.text, fontFamily: fonts.sans.medium },
              ]}
            >
              {isZh ? "外观" : "Appearance"}
            </Text>
          </View>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((opt) => {
              const isActive = preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setPreference(opt.value)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.secondary,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={14}
                    color={isActive ? "#ffffff" : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.themeBtnLabel,
                      {
                        color: isActive ? "#ffffff" : colors.text,
                        fontFamily: fonts.sans.medium,
                      },
                    ]}
                  >
                    {isZh ? opt.labelZh : opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => openUrl("https://aklman.com")}>
          <Text
            style={[
              styles.footerLink,
              { color: colors.primary, fontFamily: fonts.sans.regular },
            ]}
          >
            aklman.com ↗
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  blogHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 20,
  },
  blogTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  blogSubtitle: {
    fontSize: 14,
  },
  section: {},
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  langBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langBadgeText: {
    fontSize: 13,
  },
  themeBlock: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  themeBtnLabel: {
    fontSize: 13,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerLink: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 4,
  },
  clearBtn: {
    fontSize: 13,
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
  notifHint: {
    fontSize: 11,
    marginTop: 2,
  },
  notifTopicsBlock: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  notifTopicsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  notifTopicsHint: {
    fontSize: 11,
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
  statsCard: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
  statsResetHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
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
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  historyDot: {
    fontSize: 12,
  },
});
