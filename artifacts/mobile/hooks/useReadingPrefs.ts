import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const FONT_SIZE_KEY = "@aklman/reading_font_size";
const LINE_SPACING_KEY = "@aklman/reading_line_spacing";
const CONTENT_WIDTH_KEY = "@aklman/reading_content_width";

export const FONT_SIZE_DEFAULT = 17;
export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 22;
const FONT_SIZE_STEP = 1;

export const LINE_SPACING_PRESETS = [1.6, 1.85, 2.1] as const;
export type LineSpacing = (typeof LINE_SPACING_PRESETS)[number];
export const LINE_SPACING_DEFAULT: LineSpacing = 1.85;

export type ContentWidth = "full" | "narrow";
export const CONTENT_WIDTH_DEFAULT: ContentWidth = "full";

export interface ReadingPrefs {
  fontSize: number;
  canIncrease: boolean;
  canDecrease: boolean;
  increase: () => void;
  decrease: () => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (v: LineSpacing) => void;
  contentWidth: ContentWidth;
  setContentWidth: (v: ContentWidth) => void;
}

export function useReadingPrefs(): ReadingPrefs {
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>(LINE_SPACING_DEFAULT);
  const [contentWidth, setContentWidthState] = useState<ContentWidth>(CONTENT_WIDTH_DEFAULT);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FONT_SIZE_KEY),
      AsyncStorage.getItem(LINE_SPACING_KEY),
      AsyncStorage.getItem(CONTENT_WIDTH_KEY),
    ]).then(([storedSize, storedSpacing, storedWidth]) => {
      if (storedSize !== null) {
        const parsed = parseInt(storedSize, 10);
        if (!isNaN(parsed) && parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
          setFontSize(parsed);
        }
      }
      if (storedSpacing !== null) {
        const parsed = parseFloat(storedSpacing);
        if (parsed === 1.6 || parsed === 1.85 || parsed === 2.1) {
          setLineSpacingState(parsed as LineSpacing);
        }
      }
      if (storedWidth === "full" || storedWidth === "narrow") {
        setContentWidthState(storedWidth);
      }
    });
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const update = useCallback((next: number) => {
    const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, next));
    setFontSize(clamped);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(FONT_SIZE_KEY, String(clamped));
    }, 300);
  }, []);

  const setLineSpacing = useCallback((v: LineSpacing) => {
    setLineSpacingState(v);
    AsyncStorage.setItem(LINE_SPACING_KEY, String(v));
  }, []);

  const setContentWidth = useCallback((v: ContentWidth) => {
    setContentWidthState(v);
    AsyncStorage.setItem(CONTENT_WIDTH_KEY, v);
  }, []);

  return {
    fontSize,
    canIncrease: fontSize < FONT_SIZE_MAX,
    canDecrease: fontSize > FONT_SIZE_MIN,
    increase: () => update(fontSize + FONT_SIZE_STEP),
    decrease: () => update(fontSize - FONT_SIZE_STEP),
    lineSpacing,
    setLineSpacing,
    contentWidth,
    setContentWidth,
  };
}
