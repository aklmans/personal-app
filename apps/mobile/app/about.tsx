import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

const ABOUT_URL_EN = "https://aklman.com/about";
const ABOUT_URL_ZH = "https://aklman.com/zh-cn/about";

function buildInjectedCSS(bg: string, text: string): string {
  return `
    (function() {
      var style = document.createElement('style');
      style.textContent = [
        'nav, header, .site-header, .navbar, #nav, #header, .site-nav { display: none !important; }',
        'footer, .site-footer, #footer { display: none !important; }',
        'body { background-color: ${bg} !important; color: ${text} !important; padding-top: 16px !important; }'
      ].join('\\n');
      document.head.appendChild(style);
      document.body.style.backgroundColor = '${bg}';
    })();
    true;
  `;
}

export default function AboutScreen() {
  const colors = useColors();
  const { resolved } = useTheme();
  const { isZh } = useLanguage();
  const insets = useSafeAreaInsets();
  const pageUrl = isZh ? ABOUT_URL_ZH : ABOUT_URL_EN;
  const bottomPad = insets.bottom + 16 + (Platform.OS === "web" ? 34 : 0);

  const injectedJS = buildInjectedCSS(colors.background, colors.text);

  const openExternal = useCallback(async () => {
    await WebBrowser.openBrowserAsync(pageUrl);
  }, [pageUrl]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <iframe
          src={pageUrl}
          style={{ flex: 1, border: "none", width: "100%", height: "100%" } as React.CSSProperties}
          title="About"
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WebView
        source={{ uri: pageUrl }}
        style={{ flex: 1, backgroundColor: colors.background }}
        originWhitelist={["*"]}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        scrollEnabled
        showsVerticalScrollIndicator={false}
      />
      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad, backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={openExternal}
          style={({ pressed }) => [
            styles.openBtn,
            { backgroundColor: pressed ? "#c05540" : colors.primary },
          ]}
        >
          <Text style={[styles.openBtnText, { fontFamily: fonts.sans.semiBold }]}>
            {isZh ? "在浏览器中打开" : "Open in browser"}
          </Text>
          <Feather name="external-link" size={15} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
});
