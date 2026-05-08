import { Feather } from "@expo/vector-icons";
import { useGetBlogPost } from "@workspace/api-client-react";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryPill } from "@/components/CategoryPill";
import { SkeletonCard } from "@/components/SkeletonCard";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

function formatDate(pubDate: string): string {
  try {
    return new Date(pubDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return pubDate;
  }
}

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { slug, locale } = useLocalSearchParams<{
    slug: string;
    locale: string;
  }>();

  const safeLocale = (locale === "zh-cn" ? "zh-cn" : "en") as "en" | "zh-cn";

  const { data: post, isLoading, isError } = useGetBlogPost(
    slug ?? "",
    { locale: safeLocale },
    { query: { enabled: !!slug, refetchOnWindowFocus: false } }
  );

  useEffect(() => {
    if (post?.title) {
      navigation.setOptions({ title: "" });
    }
  }, [post, navigation]);

  const openInBrowser = async () => {
    if (!post?.link) return;
    const url =
      safeLocale === "zh-cn"
        ? `${post.link}zh-cn/`.replace(/\/+$/, "/")
        : post.link;
    await WebBrowser.openBrowserAsync(url);
  };

  const bottomPad =
    insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.background, paddingTop: 16 }]}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text
          style={[
            styles.errorText,
            { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
          ]}
        >
          Post not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {post.coverImage && (
        <Image
          source={{ uri: post.coverImage }}
          style={styles.cover}
          resizeMode="cover"
        />
      )}

      <View style={styles.body}>
        {post.categories.length > 0 && (
          <View style={styles.categories}>
            {post.categories.map((cat: string) => (
              <CategoryPill key={cat} label={cat} />
            ))}
          </View>
        )}

        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: fonts.serif.bold },
          ]}
        >
          {post.title}
        </Text>

        <View style={styles.meta}>
          <Text
            style={[
              styles.metaText,
              { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
            ]}
          >
            {formatDate(post.pubDate)}
          </Text>
          {post.readingTime != null && (
            <Text
              style={[
                styles.metaText,
                { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
              ]}
            >
              {" · "}
              {post.readingTime} min read
            </Text>
          )}
        </View>

        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />

        <Text
          style={[
            styles.excerpt,
            { color: colors.text, fontFamily: fonts.serif.italic ?? fonts.serif.regular },
          ]}
        >
          {post.description}
        </Text>

        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />

        <Pressable
          onPress={openInBrowser}
          style={({ pressed }) => [
            styles.readBtn,
            {
              backgroundColor: pressed ? colors.accentForeground === "#1a1714" ? "#c05540" : "#c86341" : colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.readBtnText,
              { fontFamily: fonts.sans.semiBold },
            ]}
          >
            Read Full Article
          </Text>
          <Feather name="external-link" size={16} color="#ffffff" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cover: {
    width: "100%",
    height: 240,
  },
  body: {
    padding: 20,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 12,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  metaText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    opacity: 0.4,
  },
  excerpt: {
    fontSize: 17,
    lineHeight: 27,
  },
  errorText: {
    fontSize: 16,
    marginTop: 8,
  },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  readBtnText: {
    color: "#ffffff",
    fontSize: 16,
  },
});
