import { Feather } from "@expo/vector-icons";

import {
  LINE_SPACING_PRESETS,
  type ColorTheme,
  type ContentWidth,
  type FontFamily,
  type LineSpacing,
} from "@/hooks/useReadingPrefs";

export const SPACING_OPTS: { value: LineSpacing; label: string; labelZh: string }[] = [
  { value: LINE_SPACING_PRESETS[0], label: "Compact", labelZh: "紧凑" },
  { value: LINE_SPACING_PRESETS[1], label: "Default", labelZh: "默认" },
  { value: LINE_SPACING_PRESETS[2], label: "Relaxed", labelZh: "宽松" },
];

export const WIDTH_OPTS: {
  value: ContentWidth;
  label: string;
  labelZh: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: "full", label: "Full Width", labelZh: "全宽", icon: "maximize-2" },
  { value: "narrow", label: "Narrow", labelZh: "窄列", icon: "minimize-2" },
];

export const FONT_FAMILY_OPTS: { value: FontFamily; label: string; labelZh: string; sampleFont: string }[] = [
  { value: "serif", label: "Serif", labelZh: "衬线", sampleFont: "Lora_400Regular" },
  { value: "sans", label: "Sans", labelZh: "无衬线", sampleFont: "Inter_400Regular" },
];

export const COLOR_THEME_OPTS: { value: ColorTheme; label: string; labelZh: string; bg: string; fg: string }[] = [
  { value: "default", label: "Default", labelZh: "默认", bg: "transparent", fg: "" },
  { value: "sepia", label: "Sepia", labelZh: "暖棕", bg: "#f5ede0", fg: "#3b2314" },
  { value: "high-contrast", label: "High Contrast", labelZh: "高对比", bg: "#000000", fg: "#ffffff" },
];

export const ACCENT_PRESETS: { hex: string | null; label: string; labelZh: string }[] = [
  { hex: null,      label: "Auto",     labelZh: "自动"   },
  { hex: "#DA7756", label: "Rust",     labelZh: "锈红"   },
  { hex: "#5B9BD5", label: "Sky",      labelZh: "天蓝"   },
  { hex: "#6AAB8E", label: "Sage",     labelZh: "鼠尾草" },
  { hex: "#9B7DC8", label: "Lavender", labelZh: "薰衣草" },
  { hex: "#C4627B", label: "Rose",     labelZh: "玫瑰"   },
  { hex: "#D4A839", label: "Amber",    labelZh: "琥珀"   },
];
