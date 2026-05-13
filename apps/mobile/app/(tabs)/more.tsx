import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { useCopyToast } from "@/hooks/useCopyToast";
import { fonts } from "@/constants/fonts";
import { getTabScreenBottomPadding } from "@/constants/layout";
import { useBookmarks } from "@/context/BookmarksContext";
import { useHistory } from "@/context/HistoryContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { BookmarksSection } from "@/features/more/BookmarksSection";
import { ReadingStatsSection } from "@/features/more/ReadingStatsSection";
import { RecentHistorySection } from "@/features/more/RecentHistorySection";
import type { SortOrder } from "@/features/more/types";
import { useColors } from "@/hooks/useColors";

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

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locale, toggleLocale, isZh } = useLanguage();
  const { preference, setPreference } = useTheme();
  const router = useRouter();
  const { bookmarks, hydrated: bookmarksHydrated, toggleBookmark } = useBookmarks();
  const { history, clearHistory } = useHistory();
  const { optedIn, permissionStatus, isLoading, enable, disable, notifCategories, setNotifCategories, availableCategories, refreshAvailableCategories, clearBadge, localeRegisteredAt } = useNotifications();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const [bookmarkSort, setBookmarkSort] = useState<SortOrder>("newest");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");

  const { showCopyToast: showNotifToast, copyToastVisible: notifToastVisible, copyToastAnim: notifToastAnim } = useCopyToast(2500);
  const [notifToastMsg, setNotifToastMsg] = useState("");

  useEffect(() => {
    if (!localeRegisteredAt) return;
    setNotifToastMsg(isZh ? "通知已切换为中文" : "Notifications updated for English");
    showNotifToast();
  }, [localeRegisteredAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    AsyncStorage.getItem("@bookmark_sort_v1")
      .then((val) => {
        if (val === "newest" || val === "oldest") setBookmarkSort(val);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("@bookmark_category_v1")
      .then((val) => {
        if (val) setActiveCategory(val);
      })
      .catch(() => {});
  }, []);

  const handleSetBookmarkSort = useCallback((sort: SortOrder) => {
    setBookmarkSort(sort);
    AsyncStorage.setItem("@bookmark_sort_v1", sort).catch(() => {});
  }, []);

  const handleSetActiveCategory = useCallback((cat: string | null) => {
    setActiveCategory(cat);
    if (cat === null) {
      AsyncStorage.removeItem("@bookmark_category_v1").catch(() => {});
    } else {
      AsyncStorage.setItem("@bookmark_category_v1", cat).catch(() => {});
    }
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
    if (!bookmarksHydrated) return;
    if (activeCategory !== null && !bookmarkCategories.includes(activeCategory)) {
      handleSetActiveCategory(null);
    }
  }, [bookmarksHydrated, bookmarkCategories, activeCategory, handleSetActiveCategory]);

  useFocusEffect(
    useCallback(() => {
      refreshAvailableCategories();
      clearBadge();
      return () => { setSearchQuery(""); };
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
    const topCategories =
      Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]).slice(0, 3);
    return { totalArticles, totalMinutes, topCategories };
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: getTabScreenBottomPadding(insets.bottom, 24),
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

      <BookmarksSection
        activeCategory={activeCategory}
        bookmarkCategories={bookmarkCategories}
        bookmarkSort={bookmarkSort}
        bookmarks={bookmarks}
        displayedBookmarks={displayedBookmarks}
        isZh={isZh}
        onOpenPost={(post) =>
          router.push({
            pathname: "/post/[slug]",
            params: { slug: post.slug, locale: post.locale },
          })
        }
        onSearchQueryChange={setSearchQuery}
        onSetActiveCategory={handleSetActiveCategory}
        onSetBookmarkSort={handleSetBookmarkSort}
        onToggleBookmark={toggleBookmark}
        searchQuery={searchQuery}
      />

      {readingStats.totalArticles > 0 && (
        <ReadingStatsSection isZh={isZh} readingStats={readingStats} />
      )}

      <RecentHistorySection
        displayedHistory={displayedHistory}
        history={history}
        historyQuery={historyQuery}
        isZh={isZh}
        onClearHistory={clearHistory}
        onHistoryQueryChange={setHistoryQuery}
        onOpenEntry={(entry) =>
          router.push({
            pathname: "/post/[slug]",
            params: { slug: entry.slug, locale: entry.locale },
          })
        }
      />

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

      {notifToastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.notifToast,
            {
              opacity: notifToastAnim,
              transform: [
                {
                  translateY: notifToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Feather name="bell" size={14} color="#ffffff" />
          <Text style={[styles.notifToastText, { fontFamily: fonts.sans.semiBold }]}>
            {notifToastMsg}
          </Text>
        </Animated.View>
      )}
    </View>
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
  notifToast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(30,30,30,0.88)",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  notifToastText: {
    color: "#ffffff",
    fontSize: 13,
  },
});
