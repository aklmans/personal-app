import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import HighlightedTitle from "@/components/HighlightedTitle";
import { fonts } from "@/constants/fonts";
import type { HistoryEntry } from "@/context/HistoryContext";
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

interface RecentHistorySectionProps {
  displayedHistory: HistoryEntry[];
  history: HistoryEntry[];
  historyQuery: string;
  isZh: boolean;
  onClearHistory: () => void;
  onHistoryQueryChange: (query: string) => void;
  onOpenEntry: (entry: HistoryEntry) => void;
}

export function RecentHistorySection({
  displayedHistory,
  history,
  historyQuery,
  isZh,
  onClearHistory,
  onHistoryQueryChange,
  onOpenEntry,
}: RecentHistorySectionProps) {
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
          {isZh ? "最近阅读" : "RECENTLY READ"}
        </Text>
        {history.length > 0 && (
          <Pressable
            onPress={onClearHistory}
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
            onChangeText={onHistoryQueryChange}
            placeholder={isZh ? "搜索历史记录…" : "Search history…"}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.text, fontFamily: fonts.sans.regular }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {historyQuery.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => onHistoryQueryChange("")} hitSlop={8}>
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
            onPress={() => onOpenEntry(entry)}
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
  clearBtn: {
    fontSize: 13,
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
