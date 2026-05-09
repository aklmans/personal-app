import { Feather } from "@expo/vector-icons";
import { useGetBlogPost, queryOpts } from "@workspace/api-client-react";
import type { RelatedPost } from "@workspace/api-client-react";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import { fonts } from "@/constants/fonts";
import { useBookmarks } from "@/context/BookmarksContext";
import { useHistory } from "@/context/HistoryContext";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  useReadingPrefs,
  type LineSpacing,
  type ContentWidth,
  type FontFamily,
  type ColorTheme,
  LINE_SPACING_PRESETS,
} from "@/hooks/useReadingPrefs";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCROLL_KEY_PREFIX = "@aklman/scroll/";
const SCROLL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

async function saveScrollPos(key: string, position: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ position, savedAt: Date.now() }));
  } catch {}
}

async function loadScrollPos(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { position: number; savedAt: number };
    if (Date.now() - parsed.savedAt > SCROLL_EXPIRY_MS) {
      AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    return typeof parsed.position === "number" ? parsed.position : null;
  } catch {
    return null;
  }
}

async function clearScrollPos(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

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

const SPACING_OPTS: { value: LineSpacing; label: string; labelZh: string }[] = [
  { value: LINE_SPACING_PRESETS[0], label: "Compact", labelZh: "紧凑" },
  { value: LINE_SPACING_PRESETS[1], label: "Default", labelZh: "默认" },
  { value: LINE_SPACING_PRESETS[2], label: "Relaxed", labelZh: "宽松" },
];

const WIDTH_OPTS: {
  value: ContentWidth;
  label: string;
  labelZh: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: "full", label: "Full Width", labelZh: "全宽", icon: "maximize-2" },
  { value: "narrow", label: "Narrow", labelZh: "窄列", icon: "minimize-2" },
];

const FONT_FAMILY_OPTS: { value: FontFamily; label: string; labelZh: string; sampleFont: string }[] = [
  { value: "serif", label: "Serif", labelZh: "衬线", sampleFont: "Lora_400Regular" },
  { value: "sans", label: "Sans", labelZh: "无衬线", sampleFont: "Inter_400Regular" },
];

const COLOR_THEME_OPTS: { value: ColorTheme; label: string; labelZh: string; bg: string; fg: string }[] = [
  { value: "default", label: "Default", labelZh: "默认", bg: "transparent", fg: "" },
  { value: "sepia", label: "Sepia", labelZh: "暖棕", bg: "#f5ede0", fg: "#3b2314" },
  { value: "high-contrast", label: "High Contrast", labelZh: "高对比", bg: "#000000", fg: "#ffffff" },
];

function ReadingPrefsSheet({
  visible,
  onClose,
  lineSpacing,
  setLineSpacing,
  contentWidth,
  setContentWidth,
  fontFamily,
  setFontFamily,
  colorTheme,
  setColorTheme,
  isZh,
}: {
  visible: boolean;
  onClose: () => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (v: LineSpacing) => void;
  contentWidth: ContentWidth;
  setContentWidth: (v: ContentWidth) => void;
  fontFamily: FontFamily;
  setFontFamily: (v: FontFamily) => void;
  colorTheme: ColorTheme;
  setColorTheme: (v: ColorTheme) => void;
  isZh: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <View
        style={[
          sheetStyles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 20) + 8,
          },
        ]}
      >
        <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />

        <View style={sheetStyles.sheetHeader}>
          <Text
            style={[
              sheetStyles.sheetTitle,
              { color: colors.text, fontFamily: fonts.sans.semiBold },
            ]}
          >
            {isZh ? "阅读设置" : "Reading Preferences"}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text
          style={[
            sheetStyles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: fonts.sans.semiBold },
          ]}
        >
          {isZh ? "行距" : "LINE SPACING"}
        </Text>
        <View style={sheetStyles.optRow}>
          {SPACING_OPTS.map((opt) => {
            const active = lineSpacing === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setLineSpacing(opt.value)}
                style={({ pressed }) => [
                  sheetStyles.optBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    sheetStyles.optLabel,
                    {
                      color: active ? "#fff" : colors.text,
                      fontFamily: fonts.sans.regular,
                    },
                  ]}
                >
                  {isZh ? opt.labelZh : opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            sheetStyles.sectionLabel,
            {
              color: colors.mutedForeground,
              fontFamily: fonts.sans.semiBold,
              marginTop: 18,
            },
          ]}
        >
          {isZh ? "内容宽度" : "CONTENT WIDTH"}
        </Text>
        <View style={sheetStyles.optRow}>
          {WIDTH_OPTS.map((opt) => {
            const active = contentWidth === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setContentWidth(opt.value)}
                style={({ pressed }) => [
                  sheetStyles.optBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
              >
                <Feather
                  name={opt.icon}
                  size={13}
                  color={active ? "#fff" : colors.text}
                />
                <Text
                  style={[
                    sheetStyles.optLabel,
                    {
                      color: active ? "#fff" : colors.text,
                      fontFamily: fonts.sans.regular,
                    },
                  ]}
                >
                  {isZh ? opt.labelZh : opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            sheetStyles.sectionLabel,
            {
              color: colors.mutedForeground,
              fontFamily: fonts.sans.semiBold,
              marginTop: 18,
            },
          ]}
        >
          {isZh ? "字体风格" : "FONT STYLE"}
        </Text>
        <View style={sheetStyles.optRow}>
          {FONT_FAMILY_OPTS.map((opt) => {
            const active = fontFamily === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setFontFamily(opt.value)}
                style={({ pressed }) => [
                  sheetStyles.optBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    sheetStyles.optLabel,
                    {
                      color: active ? "#fff" : colors.text,
                      fontFamily: opt.sampleFont,
                    },
                  ]}
                >
                  {isZh ? opt.labelZh : opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            sheetStyles.sectionLabel,
            {
              color: colors.mutedForeground,
              fontFamily: fonts.sans.semiBold,
              marginTop: 18,
            },
          ]}
        >
          {isZh ? "文字主题" : "THEME"}
        </Text>
        <View style={sheetStyles.optRow}>
          {COLOR_THEME_OPTS.map((opt) => {
            const active = colorTheme === opt.value;
            const swatchBg = opt.value === "default" ? colors.background : opt.bg;
            const swatchFg = opt.value === "default" ? colors.text : opt.fg;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setColorTheme(opt.value)}
                style={({ pressed }) => [
                  sheetStyles.optBtn,
                  sheetStyles.themeBtn,
                  {
                    backgroundColor: swatchBg,
                    borderColor: active ? colors.primary : colors.border,
                    borderWidth: active ? 2 : 1,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    sheetStyles.optLabel,
                    { color: swatchFg || colors.text, fontFamily: fonts.sans.regular },
                  ]}
                >
                  {isZh ? opt.labelZh : opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    paddingTop: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 16 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.1, marginBottom: 10 },
  optRow: { flexDirection: "row", gap: 8 },
  optBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  optLabel: { fontSize: 13 },
  themeBtn: { minWidth: 0 },
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

function resolveThemeColors(
  colorTheme: ColorTheme,
  defaultBg: string,
  defaultText: string
): { bg: string; text: string } {
  if (colorTheme === "sepia") return { bg: "#f5ede0", text: "#3b2314" };
  if (colorTheme === "high-contrast") return { bg: "#000000", text: "#ffffff" };
  return { bg: defaultBg, text: defaultText };
}

function buildInjectedJS(
  fontSize: number,
  lineSpacing: number,
  contentWidth: ContentWidth,
  fontFamily: FontFamily,
  colorTheme: ColorTheme,
  defaultBg: string,
  defaultText: string
): string {
  const maxW = contentWidth === "narrow" ? "680px" : "100%";
  const padH = contentWidth === "narrow" ? "24px" : "20px";
  const fontStack = fontFamily === "sans"
    ? "'Inter', system-ui, sans-serif"
    : "'Lora', Georgia, 'Times New Roman', serif";
  const { bg, text } = resolveThemeColors(colorTheme, defaultBg, defaultText);
  return `(function() {
  document.documentElement.style.setProperty('font-size', '${fontSize}px', 'important');
  document.body.style.lineHeight = '${lineSpacing}';
  document.body.style.maxWidth = '${maxW}';
  document.body.style.paddingLeft = '${padH}';
  document.body.style.paddingRight = '${padH}';
  document.body.style.marginLeft = 'auto';
  document.body.style.marginRight = 'auto';
  document.body.style.fontFamily = '${fontStack}';
  document.body.style.backgroundColor = '${bg}';
  document.body.style.color = '${text}';
  document.documentElement.style.backgroundColor = '${bg}';
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
  var selTimer;
  document.addEventListener('selectionchange', function() {
    clearTimeout(selTimer);
    selTimer = setTimeout(function() {
      var sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ t: 'selection', text: sel }));
      }
    }, 300);
  });
})();
true;`;
}

function buildHtml(
  content: string,
  colors: ReturnType<typeof useColors>,
  isDark: boolean,
  fontSize = 17,
  lineSpacing = 1.85,
  contentWidth: ContentWidth = "full",
  fontFamily: FontFamily = "serif",
  colorTheme: ColorTheme = "default"
): string {
  const { bg, text } = resolveThemeColors(colorTheme, colors.background, colors.text);
  const primary = colors.primary;
  const muted = colors.mutedForeground;
  const codeBg = isDark ? "#2e2825" : "#ede8e0";
  const border = colors.border;
  const bodyMaxWidth = contentWidth === "narrow" ? "680px" : "100%";
  const padH = contentWidth === "narrow" ? "24px" : "20px";

  const prismCssUrl = isDark
    ? "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css"
    : "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css";

  const highlightScript = `(function() {
  function detectLang(pre, code) {
    var dl = pre.getAttribute('data-language');
    if (dl) return dl;
    var cls = (code ? code.className : '') || pre.className || '';
    var m = cls.match(/(?:^|\\s)language-(\\S+)/);
    if (m) return m[1];
    return 'text';
  }
  function addLangBadge(pre, lang) {
    if (!lang || lang === 'text' || lang === 'plaintext' || lang === 'none') return;
    if (pre.querySelector('.lang-badge')) return;
    var badge = document.createElement('span');
    badge.className = 'lang-badge';
    badge.textContent = lang;
    badge.dataset.langLabel = lang;
    badge.addEventListener('click', function() {
      if (badge.dataset.copying === '1') return;
      var code = pre.querySelector('code');
      var text = code ? (code.textContent || '') : (pre.textContent || '');
      if (!navigator.clipboard) return;
      badge.dataset.copying = '1';
      navigator.clipboard.writeText(text).then(function() {
        badge.textContent = 'Copied \u2713';
        badge.style.color = '#22c55e';
        badge.style.borderColor = '#22c55e';
        setTimeout(function() {
          badge.textContent = badge.dataset.langLabel || '';
          badge.style.color = '';
          badge.style.borderColor = '';
          badge.dataset.copying = '';
        }, 1500);
      }).catch(function() {
        badge.dataset.copying = '';
      });
    });
    pre.appendChild(badge);
  }
  function wrapCode(pre) {
    if (!pre.parentNode || pre.parentNode.classList && pre.parentNode.classList.contains('code-wrapper')) return pre.parentNode;
    var wrapper = document.createElement('div');
    wrapper.className = 'code-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    return wrapper;
  }
  function addLineNumbers(wrapper, lineCount) {
    if (!wrapper || lineCount <= 1) return;
    if (wrapper.querySelector('.line-gutter')) return;
    wrapper.classList.add('has-gutter');
    var gutter = document.createElement('div');
    gutter.className = 'line-gutter';
    var html = '';
    for (var n = 1; n <= lineCount; n++) { html += '<span>' + n + '</span>'; }
    gutter.innerHTML = html;
    wrapper.insertBefore(gutter, wrapper.querySelector('pre'));
  }
  function updateScrollable(wrapper) {
    if (!wrapper || !wrapper.classList || !wrapper.classList.contains('code-wrapper')) return;
    var pre = wrapper.querySelector('pre');
    if (!pre) return;
    if (pre.scrollWidth > pre.clientWidth) {
      wrapper.classList.add('scrollable');
    } else {
      wrapper.classList.remove('scrollable');
    }
  }
  var pres = document.querySelectorAll('pre.astro-code, pre.shiki');
  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    var code = pre.querySelector('code');
    var lang = detectLang(pre, code);
    if (!code) continue;
    var lineEls = code.querySelectorAll('.line');
    var rawText;
    if (lineEls.length > 0) {
      var parts = [];
      for (var j = 0; j < lineEls.length; j++) {
        parts.push(lineEls[j].textContent || '');
      }
      rawText = parts.join('\n').replace(/\n$/, '');
    } else {
      rawText = (code.textContent || '').replace(/^\n/, '').replace(/\n$/, '');
    }
    pre.removeAttribute('style');
    pre.className = 'language-' + lang;
    code.className = 'language-' + lang;
    code.textContent = rawText;
    addLangBadge(pre, lang);
    var wrapper = wrapCode(pre);
    var lineCount = rawText ? rawText.split('\n').length : 1;
    addLineNumbers(wrapper, lineCount);
    updateScrollable(wrapper);
    pre.addEventListener('scroll', function() {
      var w = this.parentNode;
      if (!w || !w.classList.contains('code-wrapper')) return;
      if (this.scrollLeft + this.clientWidth >= this.scrollWidth - 4) {
        w.classList.remove('scrollable');
      } else if (this.scrollWidth > this.clientWidth) {
        w.classList.add('scrollable');
      }
    }, { passive: true });
  }
  window.addEventListener('resize', function() {
    var wrappers = document.querySelectorAll('.code-wrapper');
    for (var w = 0; w < wrappers.length; w++) {
      updateScrollable(wrappers[w]);
    }
  }, { passive: true });
  if (window.Prism) {
    window.Prism.hooks.add('complete', function(env) {
      if (env.element && env.element.parentNode && env.element.parentNode.tagName === 'PRE') {
        var pre = env.element.parentNode;
        addLangBadge(pre, env.language);
        var wrapper = wrapCode(pre);
        var prismText = env.element ? (env.element.textContent || '') : '';
        addLineNumbers(wrapper, prismText ? prismText.split('\n').length : 1);
        updateScrollable(wrapper);
      }
    });
    if (window.Prism.plugins && window.Prism.plugins.autoloader) {
      window.Prism.plugins.autoloader.languages_path =
        'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/';
    }
    window.Prism.highlightAll();
  }
})();`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${prismCssUrl}">
  <style>
    * { box-sizing: border-box; }
    html { font-size: ${fontSize}px; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0 auto; padding: 0 ${padH} 48px;
      background-color: ${bg};
      color: ${text};
      font-family: ${fontFamily === "sans" ? "'Inter', system-ui, sans-serif" : "'Lora', Georgia, 'Times New Roman', serif"};
      line-height: ${lineSpacing};
      max-width: ${bodyMaxWidth};
      word-wrap: break-word;
      overflow-x: hidden;
      transition: background-color 0.25s, color 0.25s;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${fontFamily === "sans" ? "'Inter', system-ui, sans-serif" : "'Lora', Georgia, serif"};
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
    /* Prism overrides — palette-matched backgrounds, keep Prism token colors */
    .code-wrapper {
      position: relative;
      margin: 1.4em 0;
    }
    .code-wrapper.has-gutter {
      display: flex;
      align-items: stretch;
    }
    .line-gutter {
      flex-shrink: 0;
      width: 36px;
      padding: 16px 0 16px 0;
      display: flex;
      flex-direction: column;
      background: ${codeBg};
      border-right: 1px solid ${border};
      border-radius: 10px 0 0 10px;
      user-select: none;
      -webkit-user-select: none;
      box-sizing: border-box;
    }
    .line-gutter span {
      display: block;
      text-align: right;
      padding-right: 8px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11px;
      color: ${muted};
      opacity: 0.5;
      line-height: ${14 * 1.6}px;
    }
    .code-wrapper.has-gutter > pre,
    .code-wrapper.has-gutter > pre[class*="language-"] {
      flex: 1;
      min-width: 0;
      border-radius: 0 10px 10px 0;
      padding-left: 12px;
    }
    .code-wrapper::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 48px;
      background: linear-gradient(to right, transparent, ${codeBg});
      border-radius: 0 10px 10px 0;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .code-wrapper.scrollable::after {
      opacity: 1;
    }
    pre, pre[class*="language-"] {
      position: relative;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      background: ${codeBg} !important;
      border-radius: 10px;
      padding: 16px 18px;
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      min-height: 3.5em;
    }
    .lang-badge {
      position: absolute;
      top: 8px;
      right: 10px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 10px;
      color: ${muted};
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 4px;
      padding: 2px 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
      line-height: 1.4;
      opacity: 0.85;
      z-index: 2;
      transition: color 0.15s, border-color 0.15s;
    }
    code[class*="language-"], pre[class*="language-"] > code {
      background: transparent !important;
      font-family: 'Menlo', 'SF Mono', 'Courier New', monospace;
      font-size: 14px;
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
    strong { font-weight: 700; }
    em { font-style: italic; }
    mark { background: rgba(218,119,86,0.18); padding: 1px 3px; border-radius: 3px; }
    sup, sub { font-size: 0.75em; }
  </style>
</head>
<body>${content || "<p>No content available for this article. Tap the button below to read it in full.</p>"}
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" data-manual></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
<script>${highlightScript}</script>
</body>
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
  const {
    fontSize, canIncrease, canDecrease, increase, decrease,
    lineSpacing, setLineSpacing, contentWidth, setContentWidth,
    fontFamily, setFontFamily, hydrated,
    colorTheme, setColorTheme,
  } = useReadingPrefs();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [resumeBannerPos, setResumeBannerPos] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState("");
  const [bannerVisible, setBannerVisible] = useState(false);
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const copyToastAnim = useRef(new Animated.Value(0)).current;
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { recordVisit } = useHistory();

  const safeLocale = (locale === "zh-cn" ? "zh-cn" : "en") as "en" | "zh-cn";

  const progressAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeScrollHandlerRef = useRef<(() => void) | null>(null);
  const iframeContentWindowRef = useRef<Window | null>(null);
  const recordedKeyRef = useRef<string | null>(null);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredKeyRef = useRef<string | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const isRestoringRef = useRef(false);
  const resumeBannerPosRef = useRef<number | null>(null);
  const dismissBannerRef = useRef<() => void>(() => {});
  const isDismissingBannerRef = useRef(false);

  const { data, isLoading, isError } = useGetBlogPost(
    slug ?? "",
    { locale: safeLocale },
    { query: queryOpts({ enabled: !!slug, refetchOnWindowFocus: false }) }
  );

  const post = data as PostWithContent | undefined;

  const handleShareQuote = useCallback(async () => {
    if (!post || !selectedQuote) return;
    const message = `"${selectedQuote}"\n\n— ${post.title}\n${post.link}`;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message, url: post.link }
          : { message }
      );
    } catch {}
    setSelectedQuote("");
  }, [post, selectedQuote]);

  const themeColors = useMemo(
    () => resolveThemeColors(colorTheme, colors.background, colors.text),
    [colorTheme, colors.background, colors.text]
  );

  const showCopyToast = useCallback(() => {
    if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    copyToastAnim.stopAnimation();
    copyToastAnim.setValue(1);
    setCopyToastVisible(true);
    copyToastTimerRef.current = setTimeout(() => {
      Animated.timing(copyToastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setCopyToastVisible(false);
      });
    }, 2000);
  }, [copyToastAnim]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastAnim.stopAnimation();
    };
  }, [copyToastAnim]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    const url = post.link;
    const title = post.title;
    if (Platform.OS === "web") {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          try {
            await navigator.clipboard.writeText(url);
            showCopyToast();
          } catch {}
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        showCopyToast();
      } catch {}
      return;
    }
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url, message: title }
          : { message: `${title}\n${url}` }
      );
    } catch {}
  }, [post, showCopyToast]);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: themeColors.bg },
      headerTintColor: themeColors.text,
      ...(post?.title
        ? {
            headerTitle: () => (
              <PostHeaderTitle
                title={post.title}
                progressAnim={progressAnim}
                primaryColor={colors.primary}
                borderColor={colors.border}
                textColor={themeColors.text}
              />
            ),
          }
        : {}),
      headerRight: () => {
        const bookmarked = post ? isBookmarked(post.slug, post.locale) : false;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Pressable
              onPress={() => setSheetVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.5 : 1,
                paddingHorizontal: 6,
                paddingVertical: 4,
              })}
              accessibilityLabel="Reading preferences"
              accessibilityRole="button"
            >
              <Feather name="sliders" size={18} color={colors.mutedForeground} />
            </Pressable>
            {post && (
              <Pressable
                onPress={() => {
                  if (!post) return;
                  toggleBookmark({
                    slug: post.slug,
                    title: post.title,
                    description: post.description,
                    pubDate: post.pubDate,
                    link: post.link,
                    coverImage: post.coverImage,
                    categories: post.categories,
                    readingTime: post.readingTime,
                    locale: post.locale,
                  });
                }}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6, paddingVertical: 4 })}
                accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark article"}
                accessibilityRole="button"
              >
                <Feather
                  name="bookmark"
                  size={20}
                  color={bookmarked ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
            )}
            <FontSizeControls
              onDecrease={decrease}
              onIncrease={increase}
              canDecrease={canDecrease}
              canIncrease={canIncrease}
              primaryColor={colors.primary}
              mutedColor={colors.mutedForeground}
            />
            {post && (
              <Pressable
                onPress={handleShare}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 6, paddingVertical: 4 })}
                accessibilityLabel="Share article"
                accessibilityRole="button"
              >
                <Feather name="share-2" size={20} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        );
      },
    });
  }, [
    post,
    navigation,
    progressAnim,
    colors,
    themeColors,
    decrease,
    increase,
    canDecrease,
    canIncrease,
    isBookmarked,
    toggleBookmark,
    setSheetVisible,
    handleShare,
  ]);

  useEffect(() => {
    if (!post) return;
    const key = `${post.locale}:${post.slug}`;
    if (recordedKeyRef.current === key) return;
    recordedKeyRef.current = key;
    recordVisit({
      slug: post.slug,
      title: post.title,
      description: post.description,
      pubDate: post.pubDate,
      link: post.link,
      coverImage: post.coverImage,
      categories: post.categories,
      readingTime: post.readingTime,
      locale: post.locale,
    });
  }, [post, recordVisit]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `document.documentElement.style.setProperty('font-size','${fontSize}px','important');true;`
      );
    }
  }, [fontSize]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `document.body.style.lineHeight='${lineSpacing}';true;`
      );
    }
  }, [lineSpacing]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const maxW = contentWidth === "narrow" ? "680px" : "100%";
      const padH = contentWidth === "narrow" ? "24px" : "20px";
      webViewRef.current.injectJavaScript(
        `document.body.style.maxWidth='${maxW}';document.body.style.paddingLeft='${padH}';document.body.style.paddingRight='${padH}';document.body.style.marginLeft='auto';document.body.style.marginRight='auto';true;`
      );
    }
  }, [contentWidth]);

  useEffect(() => {
    return () => {
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      if (iframeScrollHandlerRef.current && iframeContentWindowRef.current) {
        iframeContentWindowRef.current.removeEventListener("scroll", iframeScrollHandlerRef.current);
        iframeScrollHandlerRef.current = null;
        iframeContentWindowRef.current = null;
      }
    };
  }, []);

  const scrollStorageKey = useMemo(
    () => (post ? `${SCROLL_KEY_PREFIX}${post.locale}:${post.slug}` : null),
    [post]
  );

  useEffect(() => {
    if (!scrollStorageKey) return;
    let cancelled = false;
    setResumeBannerPos(null);
    loadScrollPos(scrollStorageKey).then((pos) => {
      if (!cancelled && pos !== null && pos > 0.05 && pos < 0.95) {
        setResumeBannerPos(pos);
      }
    });
    return () => { cancelled = true; };
  }, [scrollStorageKey]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (!scrollStorageKey) return;
      const p = lastScrollPosRef.current;
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
        if (p > 0.05 && p < 0.95) {
          saveScrollPos(scrollStorageKey, p);
        }
      }
    });
    return unsubscribe;
  }, [navigation, scrollStorageKey]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const fontStack = fontFamily === "sans"
        ? "'Inter', system-ui, sans-serif"
        : "'Lora', Georgia, 'Times New Roman', serif";
      webViewRef.current.injectJavaScript(
        `document.body.style.fontFamily='${fontStack}';true;`
      );
    }
  }, [fontFamily]);

  useEffect(() => {
    if (Platform.OS !== "web" && webViewRef.current) {
      const { bg, text } = resolveThemeColors(colorTheme, colors.background, colors.text);
      webViewRef.current.injectJavaScript(
        `document.body.style.transition='background-color 0.25s, color 0.25s';document.body.style.backgroundColor='${bg}';document.body.style.color='${text}';document.documentElement.style.backgroundColor='${bg}';true;`
      );
    }
  }, [colorTheme, colors.background, colors.text]);

  const htmlContent = useMemo(
    () => (post ? buildHtml(post.content ?? "", colors, isDark, 17, 1.85, "full", "serif", colorTheme) : ""),
    [post, colors, isDark, colorTheme]
  );

  const webHtmlContent = useMemo(
    () =>
      post
        ? buildHtml(post.content ?? "", colors, isDark, fontSize, lineSpacing, contentWidth, fontFamily, colorTheme)
        : "",
    [post, colors, isDark, fontSize, lineSpacing, contentWidth, fontFamily, colorTheme]
  );

  const onWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.t === "selection" && typeof msg.text === "string") {
          setSelectedQuote(msg.text);
          return;
        }
        if (msg.t === "scroll" && typeof msg.p === "number") {
          Animated.timing(progressAnim, {
            toValue: msg.p,
            duration: 80,
            useNativeDriver: false,
          }).start();
          lastScrollPosRef.current = msg.p;
          if (scrollStorageKey) {
            if (msg.p >= 0.95) {
              if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
              clearScrollPos(scrollStorageKey);
            } else if (msg.p > 0.05) {
              if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
              scrollSaveTimerRef.current = setTimeout(() => {
                saveScrollPos(scrollStorageKey, msg.p);
              }, 500);
            }
          }
          if (
            resumeBannerPosRef.current !== null &&
            !isRestoringRef.current &&
            msg.p > resumeBannerPosRef.current + 0.02
          ) {
            dismissBannerRef.current();
          }
        }
      } catch {}
    },
    [progressAnim, scrollStorageKey]
  );

  const injectScrollToPos = useCallback((position: number, delay = 0) => {
    if (!webViewRef.current) return;
    isRestoringRef.current = true;
    const script = delay > 0
      ? `setTimeout(function(){var p=${position};var el=document.documentElement;var total=(el.scrollHeight||document.body.scrollHeight)-(el.clientHeight||window.innerHeight);if(total>0){window.scrollTo(0,Math.round(p*total));}},${delay});true;`
      : `(function(){var p=${position};var el=document.documentElement;var total=(el.scrollHeight||document.body.scrollHeight)-(el.clientHeight||window.innerHeight);if(total>0){window.scrollTo(0,Math.round(p*total));}})();true;`;
    webViewRef.current.injectJavaScript(script);
    setTimeout(() => { isRestoringRef.current = false; }, delay + 1200);
  }, []);

  const webScrollToPos = useCallback((position: number, delay = 0) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doScroll = () => {
      const cw = iframe.contentWindow;
      if (!cw) return;
      const doc = cw.document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total > 0) cw.scrollTo({ top: Math.round(position * total) });
    };
    if (delay > 0) setTimeout(doScroll, delay);
    else doScroll();
  }, []);

  useEffect(() => {
    resumeBannerPosRef.current = resumeBannerPos;
    if (resumeBannerPos !== null) {
      isDismissingBannerRef.current = false;
      setBannerVisible(true);
      bannerAnim.setValue(0);
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 55,
        friction: 9,
      }).start();
    } else {
      bannerAnim.setValue(0);
      setBannerVisible(false);
    }
  }, [resumeBannerPos, bannerAnim]);

  const dismissBanner = useCallback(() => {
    if (isDismissingBannerRef.current) return;
    isDismissingBannerRef.current = true;
    Animated.timing(bannerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      isDismissingBannerRef.current = false;
      setResumeBannerPos(null);
    });
  }, [bannerAnim]);

  dismissBannerRef.current = dismissBanner;

  const handleResumeTap = useCallback(() => {
    if (resumeBannerPos === null) return;
    if (Platform.OS === "web") {
      webScrollToPos(resumeBannerPos);
    } else {
      if (!webViewRef.current) return;
      injectScrollToPos(resumeBannerPos);
    }
    dismissBanner();
  }, [resumeBannerPos, injectScrollToPos, webScrollToPos, dismissBanner]);

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    // Remove any previous scroll listener before attaching a new one
    if (iframeScrollHandlerRef.current && iframeContentWindowRef.current) {
      iframeContentWindowRef.current.removeEventListener("scroll", iframeScrollHandlerRef.current);
      iframeScrollHandlerRef.current = null;
      iframeContentWindowRef.current = null;
    }
    const cw = iframe.contentWindow;
    if (scrollStorageKey && restoredKeyRef.current !== scrollStorageKey) {
      restoredKeyRef.current = scrollStorageKey;
      loadScrollPos(scrollStorageKey).then((position) => {
        if (position == null || position <= 0.05) return;
        webScrollToPos(position, 400);
      });
    }
    const handleScroll = () => {
      const doc = cw.document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, doc.scrollTop / total));
      lastScrollPosRef.current = p;
      Animated.timing(progressAnim, { toValue: p, duration: 80, useNativeDriver: false }).start();
      if (!scrollStorageKey) return;
      if (p >= 0.95) {
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
        clearScrollPos(scrollStorageKey);
        dismissBannerRef.current();
        return;
      }
      if (p > 0.05) {
        if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = setTimeout(() => {
          saveScrollPos(scrollStorageKey, p);
        }, 500);
      }
      if (resumeBannerPosRef.current !== null && p > resumeBannerPosRef.current + 0.02) {
        dismissBannerRef.current();
      }
    };
    cw.addEventListener("scroll", handleScroll, { passive: true });
    iframeScrollHandlerRef.current = handleScroll;
    iframeContentWindowRef.current = cw;
  }, [scrollStorageKey, webScrollToPos, progressAnim]);

  const restoreScrollPosition = useCallback(async () => {
    if (Platform.OS === "web" || !webViewRef.current || !scrollStorageKey) return;
    if (restoredKeyRef.current === scrollStorageKey) return;
    restoredKeyRef.current = scrollStorageKey;
    const position = await loadScrollPos(scrollStorageKey);
    if (position == null || position <= 0.05) return;
    injectScrollToPos(position, 400);
  }, [scrollStorageKey, injectScrollToPos]);

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
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      {Platform.OS === "web" ? (
        hydrated ? (
          <iframe
            ref={iframeRef}
            srcDoc={webHtmlContent}
            onLoad={onIframeLoad}
            style={{
              flex: 1,
              border: "none",
              width: "100%",
              height: "100%",
              backgroundColor: themeColors.bg,
            } as React.CSSProperties}
            title={post.title}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: themeColors.bg }} />
        )
      ) : hydrated ? (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent, baseUrl: post.link }}
          style={[styles.webview, { backgroundColor: themeColors.bg }]}
          originWhitelist={["*"]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled={false}
          allowsInlineMediaPlayback={false}
          injectedJavaScript={buildInjectedJS(fontSize, lineSpacing, contentWidth, fontFamily, colorTheme, colors.background, colors.text)}
          onMessage={onWebViewMessage}
          onLoadEnd={() => { restoreScrollPosition(); }}
        />
      ) : (
        <View style={[styles.webview, { backgroundColor: themeColors.bg }]} />
      )}

      {(tags.length > 0 || related.length > 0) && (
        <View
          style={[
            styles.metaSection,
            { backgroundColor: themeColors.bg, borderTopColor: colors.border },
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

      {Platform.OS !== "web" && selectedQuote.length > 0 && (
        <View
          style={[
            styles.shareQuoteBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={handleShareQuote}
            accessibilityRole="button"
            accessibilityLabel={isZh ? "分享引用" : "Share quote"}
            style={({ pressed }) => [
              styles.shareQuoteBtn,
              { backgroundColor: pressed ? "#c05540" : colors.primary },
            ]}
          >
            <Feather name="share-2" size={13} color="#ffffff" />
            <Text style={[styles.shareQuoteBtnText, { fontFamily: fonts.sans.semiBold }]}>
              {isZh ? "分享引用" : "Share quote"}
            </Text>
          </Pressable>
          <Text
            style={[styles.shareQuotePreview, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}
            numberOfLines={1}
          >
            {selectedQuote}
          </Text>
          <Pressable
            onPress={() => setSelectedQuote("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isZh ? "取消" : "Dismiss"}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {bannerVisible && Platform.OS !== "web" && (
        <Animated.View
          style={[
            styles.resumeBanner,
            {
              backgroundColor: colors.primary,
              marginHorizontal: 16,
              marginBottom: 8,
              opacity: bannerAnim,
              transform: [{
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 0],
                }),
              }],
            },
          ]}
        >
          <Pressable
            onPress={handleResumeTap}
            accessibilityRole="button"
            accessibilityLabel={isZh ? "从上次阅读处继续" : "Resume from where you left off"}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", flex: 1, opacity: pressed ? 0.75 : 1 })}
          >
            <Feather name="bookmark" size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={[styles.resumeBannerText, { fontFamily: fonts.sans.semiBold }]}>
              {isZh ? "从上次阅读处继续" : "Resume from where you left off"}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismissBanner}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={isZh ? "关闭" : "Dismiss"}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 8 })}
          >
            <Feather name="x" size={14} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </Animated.View>
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad,
            backgroundColor: themeColors.bg,
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

      <ReadingPrefsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        lineSpacing={lineSpacing}
        setLineSpacing={setLineSpacing}
        contentWidth={contentWidth}
        setContentWidth={setContentWidth}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        colorTheme={colorTheme}
        setColorTheme={setColorTheme}
        isZh={isZh}
      />

      {copyToastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.copyToast,
            { opacity: copyToastAnim, transform: [{ translateY: copyToastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
          ]}
        >
          <Feather name="check" size={14} color="#ffffff" />
          <Text style={[styles.copyToastText, { fontFamily: fonts.sans.semiBold }]}>
            {isZh ? "链接已复制" : "Link copied"}
          </Text>
        </Animated.View>
      )}
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
  resumeBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  resumeBannerText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
  },
  shareQuoteBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shareQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  shareQuoteBtnText: {
    color: "#ffffff",
    fontSize: 13,
  },
  shareQuotePreview: {
    flex: 1,
    fontSize: 12,
    fontStyle: "italic",
  },
  copyToast: {
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
  copyToastText: {
    color: "#ffffff",
    fontSize: 13,
  },
});
