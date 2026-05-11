import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";
import {
  type ColorTheme,
  type ContentWidth,
  type FontFamily,
  type LineSpacing,
} from "@/hooks/useReadingPrefs";
import {
  ACCENT_PRESETS,
  COLOR_THEME_OPTS,
  FONT_FAMILY_OPTS,
  SPACING_OPTS,
  WIDTH_OPTS,
} from "@/features/post-detail/readingPrefsOptions";

export function ReadingPrefsSheet({
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
  accentColor,
  setAccentColor,
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
  accentColor: string | null;
  setAccentColor: (v: string | null) => void;
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
          {isZh ? "强调色" : "ACCENT COLOR"}
        </Text>
        <View style={sheetStyles.accentRow}>
          {ACCENT_PRESETS.map((preset) => {
            const active = accentColor === preset.hex;
            if (preset.hex === null) {
              return (
                <Pressable
                  key="auto"
                  onPress={() => setAccentColor(null)}
                  style={({ pressed }) => [
                    sheetStyles.accentDot,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: active ? colors.primary : colors.border,
                      borderWidth: active ? 2 : 1,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                  accessibilityLabel={isZh ? "自动" : "Auto"}
                  accessibilityRole="button"
                >
                  <Text style={[sheetStyles.accentAutoLabel, { color: colors.mutedForeground, fontFamily: fonts.sans.regular }]}>
                    {isZh ? "自动" : "Auto"}
                  </Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={preset.hex}
                onPress={() => setAccentColor(preset.hex as string)}
                style={({ pressed }) => [
                  sheetStyles.accentDot,
                  {
                    backgroundColor: preset.hex as string,
                    borderColor: active ? colors.text : "transparent",
                    borderWidth: active ? 2 : 0,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
                accessibilityLabel={isZh ? preset.labelZh : preset.label}
                accessibilityRole="button"
              >
                {active && (
                  <Feather name="check" size={12} color="#fff" />
                )}
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
  accentRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  accentDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  accentAutoLabel: { fontSize: 10, textAlign: "center" },
});
