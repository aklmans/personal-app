import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { fonts } from "@/constants/fonts";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface NavItem {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  labelZh: string;
  onPress: () => void;
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locale, toggleLocale, isZh } = useLanguage();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

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
      onPress: () => openUrl("https://aklman.com/archives"),
    },
    {
      icon: "star",
      label: "Showcases",
      labelZh: "作品集",
      onPress: () => openUrl("https://aklman.com/showcases"),
    },
    {
      icon: "user",
      label: "About",
      labelZh: "关于",
      onPress: () => openUrl("https://aklman.com/about"),
    },
    {
      icon: "rss",
      label: "RSS Feed",
      labelZh: "RSS 订阅",
      onPress: () =>
        openUrl(isZh ? "https://aklman.com/zh-cn/rss.xml" : "https://aklman.com/rss.xml"),
    },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 12,
          paddingBottom: insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.blogHeader,
          { borderBottomColor: colors.border, paddingBottom: 20 },
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
                borderBottomColor: colors.border,
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
            styles.row,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.card,
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
            style={[styles.langBadge, { borderColor: colors.border }]}
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

        <View
          style={[
            styles.row,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          <View style={styles.rowLeft}>
            <View
              style={[styles.iconWrap, { backgroundColor: colors.secondary }]}
            >
              <Feather
                name={colorScheme === "dark" ? "moon" : "sun"}
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
          <Text
            style={[
              styles.schemeLabel,
              { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
            ]}
          >
            {colorScheme === "dark"
              ? isZh
                ? "深色"
                : "Dark"
              : isZh
              ? "浅色"
              : "Light"}
          </Text>
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
    borderBottomWidth: 0,
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
  langBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langBadgeText: {
    fontSize: 13,
  },
  schemeLabel: {
    fontSize: 14,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerLink: {
    fontSize: 14,
  },
});
