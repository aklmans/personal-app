import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

import type { ReadingStats } from "./types";

interface ReadingStatsSectionProps {
  isZh: boolean;
  readingStats: ReadingStats;
}

export function ReadingStatsSection({ isZh, readingStats }: ReadingStatsSectionProps) {
  const colors = useColors();

  return (
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
            style={[styles.statValue, { color: colors.text, fontFamily: fonts.serif.bold, fontSize: readingStats.topCategories.length > 0 && readingStats.topCategories[0].length > 8 ? 16 : 26 }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {readingStats.topCategories.length > 0 ? readingStats.topCategories.join(" · ") : "—"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
            {isZh ? "最多分类" : readingStats.topCategories.length > 1 ? "Top Categories" : "Top Category"}
          </Text>
        </View>
      </View>
      <Text style={[styles.statsResetHint, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
        {isZh ? "清除阅读记录即可重置统计数据" : "Clear reading history to reset stats"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
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
});
