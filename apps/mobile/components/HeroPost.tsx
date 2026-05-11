import React from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { PostData } from "@/components/PostCard";
import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

interface HeroPostProps {
  post: PostData;
  onPress: () => void;
}

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

export function HeroPost({ post, onPress }: HeroPostProps) {
  const colors = useColors();

  if (post.coverImage) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.container, { opacity: pressed ? 0.88 : 1 }]}
      >
        <ImageBackground
          source={{ uri: post.coverImage! }}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <View style={styles.contentOverlay}>
            {post.categories.length > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {post.categories[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              style={[styles.title, { fontFamily: fonts.serif.bold }]}
              numberOfLines={3}
            >
              {post.title}
            </Text>
            <Text style={[styles.date, { fontFamily: fonts.sans.regular }]}>
              {formatDate(post.pubDate)}
              {post.readingTime != null
                ? ` · ${post.readingTime} min read`
                : ""}
            </Text>
          </View>
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.containerPlain,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {post.categories.length > 0 && (
        <Text
          style={[
            styles.categoryPlain,
            { color: colors.primary, fontFamily: fonts.sans.semiBold },
          ]}
        >
          {post.categories[0].toUpperCase()}
        </Text>
      )}
      <Text
        style={[
          styles.titlePlain,
          { color: colors.text, fontFamily: fonts.serif.bold },
        ]}
        numberOfLines={3}
      >
        {post.title}
      </Text>
      <Text
        style={[
          styles.excerptPlain,
          { color: colors.mutedForeground, fontFamily: fonts.sans.regular },
        ]}
        numberOfLines={3}
      >
        {post.description}
      </Text>
      <Text
        style={[styles.datePlain, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}
      >
        {formatDate(post.pubDate)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  imageBackground: {
    height: 320,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  contentOverlay: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(218,119,86,0.90)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  categoryText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    color: "#ffffff",
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  containerPlain: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 20,
  },
  categoryPlain: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },
  titlePlain: {
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 10,
  },
  excerptPlain: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  datePlain: {
    fontSize: 13,
  },
});
