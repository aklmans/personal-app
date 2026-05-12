import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fonts } from "@/constants/fonts";
import { useBookmarks } from "@/context/BookmarksContext";
import { useHistory } from "@/context/HistoryContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

export interface PostData {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  coverImage?: string | null;
  categories: string[];
  readingTime?: number | null;
  locale: string;
  stale?: boolean;
}

interface PostCardProps {
  post: PostData;
  onPress: () => void;
}

function formatDate(pubDate: string): string {
  try {
    return new Date(pubDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return pubDate;
  }
}

export function PostCard({ post, onPress }: PostCardProps) {
  const colors = useColors();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { hasRead } = useHistory();
  const { optedIn, mutedSlugs, mutePost } = useNotifications();
  const [imageFailed, setImageFailed] = useState(false);
  const bookmarked = isBookmarked(post.slug, post.locale);
  const read = hasRead(post.slug, post.locale);
  const muted = mutedSlugs.includes(post.slug);
  const coverImageUri = imageFailed ? null : post.coverImage;

  useEffect(() => {
    setImageFailed(false);
  }, [post.coverImage]);

  const handleLongPress = () => {
    if (!optedIn) return;
    if (muted) return;
    const label = post.locale === "zh-cn"
      ? "不再推送此文章"
      : "Don't notify me about this";
    const cancel = post.locale === "zh-cn" ? "取消" : "Cancel";
    Alert.alert(
      post.title,
      undefined,
      [
        {
          text: label,
          style: "destructive",
          onPress: () => mutePost(post.slug),
        },
        { text: cancel, style: "cancel" },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={optedIn && !muted ? handleLongPress : undefined}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {read && (
        <View style={[styles.readBadge, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Feather name="check" size={13} color={colors.primaryForeground} />
        </View>
      )}
      {coverImageUri ? (
        <Image
          source={{ uri: coverImageUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
          <Feather name="book-open" size={28} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.body}>
        {post.categories.length > 0 && (
          <Text
            style={[styles.category, { color: colors.primary }]}
            numberOfLines={1}
          >
            {post.categories[0].toUpperCase()}
          </Text>
        )}
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: fonts.serif.semiBold },
          ]}
          numberOfLines={2}
        >
          {post.title}
        </Text>
        <Text
          style={[
            styles.excerpt,
            {
              color: colors.mutedForeground,
              fontFamily: fonts.sans.regular,
            },
          ]}
          numberOfLines={2}
        >
          {post.description}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaLeft}>
            <Text
              style={[styles.metaText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}
            >
              {formatDate(post.pubDate)}
            </Text>
            {post.readingTime != null && (
              <Text
                style={[styles.metaText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}
              >
                {" · "}
                {post.readingTime} min read
              </Text>
            )}
            {post.stale && (
              <View style={[styles.stalePill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.staleText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                  {post.locale === "zh-cn" ? "已缓存" : "Cached"}
                </Text>
              </View>
            )}
            {muted && (
              <View style={[styles.stalePill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.staleText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                  {post.locale === "zh-cn" ? "已静音" : "Muted"}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              toggleBookmark(post);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.bookmarkBtn, { opacity: pressed ? 0.5 : 1 }]}
            accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark article"}
            accessibilityRole="button"
          >
            <Feather
              name="bookmark"
              size={20}
              color={bookmarked ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: 176,
  },
  imagePlaceholder: {
    width: "100%",
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
  },
  category: {
    fontSize: 10,
    fontWeight: "600" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    lineHeight: 25,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stalePill: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  staleText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  readBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
