import { Feather } from "@expo/vector-icons";
import { useGetBlogPost } from "@workspace/api-client-react";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

interface RelatedPost {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  categories: string[];
}

interface PostWithContent {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  coverImage?: string | null;
  categories: string[];
  tags: string[];
  readingTime?: number | null;
  content?: string | null;
  locale: string;
  series?: string | null;
  seriesSlug?: string | null;
  related?: RelatedPost[];
}

function buildHtml(
  content: string,
  colors: ReturnType<typeof useColors>,
  isDark: boolean
): string {
  const bg = colors.background;
  const text = colors.text;
  const primary = colors.primary;
  const muted = colors.mutedForeground;
  const codeBg = isDark ? "#2e2825" : "#ede8e0";
  const border = colors.border;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0">
  <style>
    * { box-sizing: border-box; }
    html { font-size: 17px; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0; padding: 0 20px 40px;
      background-color: ${bg};
      color: ${text};
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.75;
      max-width: 100%;
      word-wrap: break-word;
      overflow-x: hidden;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: Georgia, serif;
      color: ${text};
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.35em; }
    h3 { font-size: 1.15em; }
    a { color: ${primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    p { margin: 0 0 1.2em; }
    img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1em auto; }
    figure { margin: 1.5em 0; }
    figcaption { font-size: 0.85em; color: ${muted}; text-align: center; margin-top: 0.4em; }
    pre {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      background: ${codeBg};
      border-radius: 8px;
      padding: 14px 16px;
      margin: 1.2em 0;
      font-size: 14px;
    }
    code {
      font-family: 'Menlo', 'Courier New', monospace;
      font-size: 14px;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: inherit;
    }
    :not(pre) > code {
      background: ${codeBg};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
    }
    blockquote {
      border-left: 3px solid ${primary};
      margin: 1.2em 0;
      padding: 4px 0 4px 16px;
      color: ${muted};
      font-style: italic;
    }
    blockquote p { margin: 0; }
    hr {
      border: 0;
      border-top: 1px solid ${border};
      margin: 2em 0;
    }
    table {
      width: 100%;
      overflow-x: auto;
      display: block;
      border-collapse: collapse;
      margin: 1.2em 0;
    }
    th, td {
      padding: 8px 12px;
      border: 1px solid ${border};
      text-align: left;
      font-size: 0.9em;
    }
    th { background: ${codeBg}; font-weight: 600; }
    ul, ol { padding-left: 1.6em; margin: 0.8em 0 1.2em; }
    li { margin-bottom: 0.4em; }
    .astro-code, .shiki {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  </style>
</head>
<body>${content || "<p>No content available for this article. Tap the button below to read it in full.</p>"}</body>
</html>`;
}

export default function PostDetailScreen() {
  const colors = useColors();
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { slug, locale } = useLocalSearchParams<{
    slug: string;
    locale: string;
  }>();
  const { isZh } = useLanguage();

  const safeLocale = (locale === "zh-cn" ? "zh-cn" : "en") as "en" | "zh-cn";

  const { data, isLoading, isError } = useGetBlogPost(
    slug ?? "",
    { locale: safeLocale },
    { query: { enabled: !!slug, refetchOnWindowFocus: false } }
  );

  const post = data as PostWithContent | undefined;

  useEffect(() => {
    if (post?.title) {
      navigation.setOptions({ title: post.title });
    }
  }, [post, navigation]);

  const htmlContent = useMemo(
    () => (post ? buildHtml(post.content ?? "", colors, isDark) : ""),
    [post, colors, isDark]
  );

  const openInBrowser = async () => {
    if (!post?.link) return;
    await WebBrowser.openBrowserAsync(post.link);
  };

  const bottomPad = insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
          Post not found
        </Text>
      </View>
    );
  }

  const tags = post.tags ?? [];
  const related = post.related ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? (
        <iframe
          srcDoc={htmlContent}
          style={{
            flex: 1,
            border: "none",
            width: "100%",
            height: "100%",
            backgroundColor: colors.background,
          } as React.CSSProperties}
          title={post.title}
        />
      ) : (
        <WebView
          source={{ html: htmlContent, baseUrl: post.link }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          originWhitelist={["*"]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={false}
          domStorageEnabled={false}
          allowsInlineMediaPlayback={false}
        />
      )}

      {(tags.length > 0 || related.length > 0) && (
        <View
          style={[
            styles.metaSection,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
                {tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() =>
                      router.push({
                        pathname: "/tag/[slug]",
                        params: {
                          slug: tag.toLowerCase().replace(/\s+/g, "-"),
                          locale: safeLocale,
                        },
                      })
                    }
                    style={[styles.tagChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Text style={[styles.tagChipText, { color: colors.primary, fontFamily: fonts.sans.medium }]}>
                      #{tag}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {related.length > 0 && (
            <View style={[styles.relatedSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.relatedLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold }]}>
                {isZh ? "相关文章" : "RELATED POSTS"}
              </Text>
              {related.map((rp) => (
                <Pressable
                  key={rp.slug}
                  onPress={() =>
                    router.push({
                      pathname: "/post/[slug]",
                      params: { slug: rp.slug, locale: safeLocale },
                    })
                  }
                  style={({ pressed }) => [
                    styles.relatedRow,
                    {
                      backgroundColor: pressed ? colors.secondary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.relatedContent}>
                    <Text
                      style={[styles.relatedTitle, { color: colors.text, fontFamily: fonts.serif.regular }]}
                      numberOfLines={2}
                    >
                      {rp.title}
                    </Text>
                    {rp.categories.length > 0 && (
                      <Text style={[styles.relatedCat, { color: colors.primary, fontFamily: fonts.sans.regular }]}>
                        {rp.categories[0]}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={openInBrowser}
          style={({ pressed }) => [
            styles.openBtn,
            { backgroundColor: pressed ? "#c05540" : colors.primary },
          ]}
        >
          <Text style={[styles.openBtnText, { fontFamily: fonts.sans.semiBold }]}>
            {isZh ? "在 aklman.com 上阅读" : "Open on aklman.com"}
          </Text>
          <Feather name="external-link" size={15} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  webview: { flex: 1 },
  metaSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tagsRow: {
    paddingVertical: 10,
  },
  tagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagChipText: { fontSize: 13 },
  relatedSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  relatedLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
    gap: 8,
  },
  relatedContent: { flex: 1 },
  relatedTitle: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  relatedCat: { fontSize: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  openBtnText: { color: "#ffffff", fontSize: 15 },
  errorText: { fontSize: 16, marginTop: 8 },
});
