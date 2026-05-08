import { Feather } from "@expo/vector-icons";
import { useGetBlogPost } from "@workspace/api-client-react";
import type { RelatedPost } from "@workspace/api-client-react";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
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
import { useReadingPrefs } from "@/hooks/useReadingPrefs";

function PostHeaderTitle({
  title,
  progressAnim,
  primaryColor,
  borderColor,
  textColor,
}: {
  title: string;
  progressAnim: Animated.Value;
  primaryColor: string;
  borderColor: string;
  textColor: string;
}) {
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={headerTitleStyles.wrap}>
      <Text numberOfLines={1} style={[headerTitleStyles.title, { color: textColor }]}>
        {title}
      </Text>
      <View style={[headerTitleStyles.track, { backgroundColor: borderColor }]}>
        <Animated.View
          style={[headerTitleStyles.fill, { backgroundColor: primaryColor, width: progressWidth }]}
        />
      </View>
    </View>
  );
}

const headerTitleStyles = StyleSheet.create({
  wrap: { alignItems: "center", width: "100%" },
  title: { fontSize: 16, letterSpacing: -0.2, fontFamily: "Lora_400Regular" },
  track: { height: 2, width: "80%", borderRadius: 1, marginTop: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 1 },
});

function FontSizeControls({
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  primaryColor,
  mutedColor,
}: {
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  primaryColor: string;
  mutedColor: string;
}) {
  return (
    <View style={fontCtrlStyles.row}>
      <Pressable
        onPress={onDecrease}
        disabled={!canDecrease}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={({ pressed }) => [
          fontCtrlStyles.btn,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        accessibilityLabel="Decrease font size"
        accessibilityRole="button"
      >
        <Text style={[fontCtrlStyles.aSmall, { color: canDecrease ? primaryColor : mutedColor }]}>
          A
        </Text>
      </Pressable>
      <Pressable
        onPress={onIncrease}
        disabled={!canIncrease}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={({ pressed }) => [
          fontCtrlStyles.btn,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        accessibilityLabel="Increase font size"
        accessibilityRole="button"
      >
        <Text style={[fontCtrlStyles.aLarge, { color: canIncrease ? primaryColor : mutedColor }]}>
          A
        </Text>
      </Pressable>
    </View>
  );
}

const fontCtrlStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2, marginRight: 4 },
  btn: { paddingHorizontal: 6, paddingVertical: 4 },
  aSmall: { fontSize: 13, fontFamily: "Lora_400Regular", fontWeight: "600" },
  aLarge: { fontSize: 19, fontFamily: "Lora_700Bold", fontWeight: "700", lineHeight: 22 },
});

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

function buildInjectedJS(fontSize: number): string {
  return `(function() {
  document.documentElement.style.setProperty('font-size', '${fontSize}px', 'important');
  function send() {
    var el = document.documentElement;
    var top = el.scrollTop || document.body.scrollTop || 0;
    var total = (el.scrollHeight || document.body.scrollHeight) - (el.clientHeight || window.innerHeight);
    var p = total <= 0 ? 1 : top / total;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'scroll', p: Math.min(1, Math.max(0, p)) }));
    }
  }
  window.addEventListener('scroll', send, { passive: true });
  window.addEventListener('load', send);
  send();
})();
true;`;
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html { font-size: 17px; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0; padding: 0 20px 48px;
      background-color: ${bg};
      color: ${text};
      font-family: 'Lora', Georgia, 'Times New Roman', serif;
      line-height: 1.85;
      max-width: 100%;
      word-wrap: break-word;
      overflow-x: hidden;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Lora', Georgia, serif;
      font-weight: 700;
      color: ${text};
      line-height: 1.3;
      margin-top: 1.8em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.35em; border-bottom: 1px solid ${border}; padding-bottom: 0.25em; }
    h3 { font-size: 1.15em; }
    a { color: ${primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    p { margin: 0 0 1.25em; }
    img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 1.2em auto; }
    figure { margin: 1.5em 0; }
    figcaption {
      font-size: 0.82em;
      font-family: 'Inter', system-ui, sans-serif;
      color: ${muted};
      text-align: center;
      margin-top: 0.4em;
    }
    pre {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      background: ${codeBg};
      border-radius: 10px;
      padding: 16px 18px;
      margin: 1.4em 0;
      font-size: 14px;
      line-height: 1.6;
    }
    code {
      font-family: 'Menlo', 'SF Mono', 'Courier New', monospace;
      font-size: 14px;
    }
    pre code {
      background: none;
      padding: 0;
      font-size: inherit;
      line-height: inherit;
    }
    :not(pre) > code {
      background: ${codeBg};
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 0.87em;
    }
    blockquote {
      border-left: 3px solid ${primary};
      margin: 1.4em 0;
      padding: 6px 0 6px 18px;
      color: ${muted};
      font-style: italic;
    }
    blockquote p { margin: 0; }
    hr {
      border: 0;
      border-top: 1px solid ${border};
      margin: 2.2em 0;
    }
    table {
      width: 100%;
      overflow-x: auto;
      display: block;
      border-collapse: collapse;
      margin: 1.4em 0;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 0.9em;
    }
    th, td {
      padding: 8px 12px;
      border: 1px solid ${border};
      text-align: left;
    }
    th { background: ${codeBg}; font-weight: 600; }
    ul, ol { padding-left: 1.7em; margin: 0.8em 0 1.25em; }
    li { margin-bottom: 0.45em; }
    .astro-code, .shiki {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    strong { font-weight: 700; }
    em { font-style: italic; }
    mark { background: rgba(218,119,86,0.18); padding: 1px 3px; border-radius: 3px; }
    sup, sub { font-size: 0.75em; }
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
  const { fontSize, canIncrease, canDecrease, increase, decrease } = useReadingPrefs();

  const safeLocale = (locale === "zh-cn" ? "zh-cn" : "en") as "en" | "zh-cn";

  const progressAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);

  const { data, isLoading, isError } = useGetBlogPost(
    slug ?? "",
    { locale: safeLocale },
    { query: { enabled: !!slug, refetchOnWindowFocus: false } }
  );

  const post = data as PostWithContent | undefined;

  useEffect(() => {
    navigation.setOptions({
      ...(post?.title
        ? {
            headerTitle: () => (
              <PostHeaderTitle
                title={post.title}
                progressAnim={progressAnim}
                primaryColor={colors.primary}
                borderColor={colors.border}
                textColor={colors.text}
              />
            ),
          }
        : {}),
      headerRight: () => (
        <FontSizeControls
          onDecrease={decrease}
          onIncrease={increase}
          canDecrease={canDecrease}
          canIncrease={canIncrease}
          primaryColor={colors.primary}
          mutedColor={colors.mutedForeground}
        />
      ),
    });
  }, [
    post,
    navigation,
    progressAnim,
    colors,
    decrease,
    increase,
    canDecrease,
    canIncrease,
  ]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `document.documentElement.style.setProperty('font-size','${fontSize}px','important');true;`
      );
    }
  }, [fontSize]);

  const htmlContent = useMemo(
    () => (post ? buildHtml(post.content ?? "", colors, isDark) : ""),
    [post, colors, isDark]
  );

  const onWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.t === "scroll" && typeof msg.p === "number") {
          Animated.timing(progressAnim, {
            toValue: msg.p,
            duration: 80,
            useNativeDriver: false,
          }).start();
        }
      } catch {}
    },
    [progressAnim]
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
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: post.link }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          originWhitelist={["*"]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled={false}
          allowsInlineMediaPlayback={false}
          injectedJavaScript={buildInjectedJS(fontSize)}
          onMessage={onWebViewMessage}
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
              >
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
                    style={[
                      styles.tagChip,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: colors.primary, fontFamily: fonts.sans.medium },
                      ]}
                    >
                      #{tag}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {related.length > 0 && (
            <View style={[styles.relatedSection, { borderTopColor: colors.border }]}>
              <Text
                style={[
                  styles.relatedLabel,
                  { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
                ]}
              >
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
                      style={[
                        styles.relatedTitle,
                        { color: colors.text, fontFamily: fonts.serif.regular },
                      ]}
                      numberOfLines={2}
                    >
                      {rp.title}
                    </Text>
                    {rp.categories.length > 0 && (
                      <Text
                        style={[
                          styles.relatedCat,
                          { color: colors.primary, fontFamily: fonts.sans.regular },
                        ]}
                      >
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
