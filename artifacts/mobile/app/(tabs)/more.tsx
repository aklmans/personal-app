import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

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
  const { optedIn, permissionStatus, isLoading, enable, disable } = useNotifications();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [bookmarkSort, setBookmarkSort] = useState<SortOrder>("newest");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    const indexed = bookmarks.map((b, i) => ({ b, i }));
    const filtered = activeCategory
      ? indexed.filter(({ b }) => b.categories.includes(activeCategory))
      : indexed;
    const sorted =
      bookmarkSort === "newest"
        ? filtered
        : [...filtered].reverse();
    return sorted.map(({ b }) => b);
  }, [bookmarks, activeCategory, bookmarkSort]);

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
                onPress={() => setBookmarkSort("newest")}
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
                onPress={() => setBookmarkSort("oldest")}
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

        {bookmarks.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bookmark" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
              {isZh ? "尚无书签。在文章页面点击书签图标即可保存。" : "No bookmarks yet. Tap the bookmark icon on any article to save it."}
            </Text>
          </View>
        ) : displayedBookmarks.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="filter" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
              {isZh ? "此分类下暂无书签。" : "No bookmarks in this category."}
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
                <Text
                  style={[styles.bookmarkTitle, { color: colors.text, fontFamily: fonts.serif.semiBold }]}
                  numberOfLines={2}
                >
                  {post.title}
                </Text>
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
                {isZh ? "清除" : "Clear"}
              </Text>
            </Pressable>
          )}
        </View>
        {history.length === 0 ? (
          <View style={[styles.emptyBookmarks, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyBookmarksText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
              {isZh ? "尚无阅读记录。打开文章后将自动记录在这里。" : "No reading history yet. Articles you open will appear here."}
            </Text>
          </View>
        ) : (
          history.slice(0, 10).map((entry: HistoryEntry) => (
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
                <Text
                  style={[styles.bookmarkTitle, { color: colors.text, fontFamily: fonts.serif.semiBold }]}
                  numberOfLines={2}
                >
                  {entry.title}
                </Text>
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
