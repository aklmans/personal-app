import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const FONT_SIZE_KEY = "@aklman/reading_font_size";
const LINE_SPACING_KEY = "@aklman/reading_line_spacing";
const CONTENT_WIDTH_KEY = "@aklman/reading_content_width";
const FONT_FAMILY_KEY = "@aklman/reading_font_family";
const COLOR_THEME_KEY = "@aklman/reading_color_theme";
const ACCENT_COLOR_KEY = "@aklman/reading_accent_color";

export const FONT_SIZE_DEFAULT = 17;
export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 22;
const FONT_SIZE_STEP = 1;

export const LINE_SPACING_PRESETS = [1.6, 1.85, 2.1] as const;
export type LineSpacing = (typeof LINE_SPACING_PRESETS)[number];
export const LINE_SPACING_DEFAULT: LineSpacing = 1.85;

export type ContentWidth = "full" | "narrow";
export const CONTENT_WIDTH_DEFAULT: ContentWidth = "full";

export type FontFamily = "serif" | "sans";
export const FONT_FAMILY_DEFAULT: FontFamily = "serif";

export type ColorTheme = "default" | "sepia" | "high-contrast";
export const COLOR_THEME_DEFAULT: ColorTheme = "default";

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
  fontFamily: FontFamily;
  setFontFamily: (v: FontFamily) => void;
  hydrated: boolean;
  colorTheme: ColorTheme;
  setColorTheme: (v: ColorTheme) => void;
  accentColor: string | null;
  setAccentColor: (v: string | null) => void;
}

const defaultPrefs: ReadingPrefs = {
  fontSize: FONT_SIZE_DEFAULT,
  canIncrease: true,
  canDecrease: true,
  increase: () => {},
  decrease: () => {},
  lineSpacing: LINE_SPACING_DEFAULT,
  setLineSpacing: () => {},
  contentWidth: CONTENT_WIDTH_DEFAULT,
  setContentWidth: () => {},
  fontFamily: FONT_FAMILY_DEFAULT,
  setFontFamily: () => {},
  hydrated: false,
  colorTheme: COLOR_THEME_DEFAULT,
  setColorTheme: () => {},
  accentColor: null,
  setAccentColor: () => {},
};

const ReadingPrefsContext = createContext<ReadingPrefs>(defaultPrefs);

export function ReadingPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fontSize, setFontSizeState] = useState(FONT_SIZE_DEFAULT);
  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>(
    LINE_SPACING_DEFAULT
  );
  const [contentWidth, setContentWidthState] = useState<ContentWidth>(
    CONTENT_WIDTH_DEFAULT
  );
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(
    FONT_FAMILY_DEFAULT
  );
  const [hydrated, setHydrated] = useState(false);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    COLOR_THEME_DEFAULT
  );
  const [accentColor, setAccentColorState] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FONT_SIZE_KEY),
      AsyncStorage.getItem(LINE_SPACING_KEY),
      AsyncStorage.getItem(CONTENT_WIDTH_KEY),
      AsyncStorage.getItem(FONT_FAMILY_KEY),
      AsyncStorage.getItem(COLOR_THEME_KEY),
      AsyncStorage.getItem(ACCENT_COLOR_KEY),
    ])
      .then(([storedSize, storedSpacing, storedWidth, storedFamily, storedTheme, storedAccent]) => {
        if (storedSize !== null) {
          const parsed = parseInt(storedSize, 10);
          if (!isNaN(parsed) && parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
            setFontSizeState(parsed);
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
        if (storedFamily === "serif" || storedFamily === "sans") {
          setFontFamilyState(storedFamily);
        }
        if (storedTheme === "default" || storedTheme === "sepia" || storedTheme === "high-contrast") {
          setColorThemeState(storedTheme as ColorTheme);
        }
        if (storedAccent && /^#[0-9a-fA-F]{6}$/.test(storedAccent)) {
          setAccentColorState(storedAccent);
        }
        setHydrated(true);
      })
      .catch(() => {
        setHydrated(true);
      });
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const increase = useCallback(() => {
    setFontSizeState((prev) => {
      const next = Math.min(FONT_SIZE_MAX, prev + FONT_SIZE_STEP);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        AsyncStorage.setItem(FONT_SIZE_KEY, String(next));
      }, 300);
      return next;
    });
  }, []);

  const decrease = useCallback(() => {
    setFontSizeState((prev) => {
      const next = Math.max(FONT_SIZE_MIN, prev - FONT_SIZE_STEP);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        AsyncStorage.setItem(FONT_SIZE_KEY, String(next));
      }, 300);
      return next;
    });
  }, []);

  const setLineSpacing = useCallback((v: LineSpacing) => {
    setLineSpacingState(v);
    AsyncStorage.setItem(LINE_SPACING_KEY, String(v));
  }, []);

  const setContentWidth = useCallback((v: ContentWidth) => {
    setContentWidthState(v);
    AsyncStorage.setItem(CONTENT_WIDTH_KEY, v);
  }, []);

  const setFontFamily = useCallback((v: FontFamily) => {
    setFontFamilyState(v);
    AsyncStorage.setItem(FONT_FAMILY_KEY, v);
  }, []);

  const setColorTheme = useCallback((v: ColorTheme) => {
    setColorThemeState(v);
    AsyncStorage.setItem(COLOR_THEME_KEY, v);
  }, []);

  const setAccentColor = useCallback((v: string | null) => {
    setAccentColorState(v);
    if (v === null) {
      AsyncStorage.removeItem(ACCENT_COLOR_KEY);
    } else {
      AsyncStorage.setItem(ACCENT_COLOR_KEY, v);
    }
  }, []);

  const value: ReadingPrefs = {
    fontSize,
    canIncrease: fontSize < FONT_SIZE_MAX,
    canDecrease: fontSize > FONT_SIZE_MIN,
    increase,
    decrease,
    lineSpacing,
    setLineSpacing,
    contentWidth,
    setContentWidth,
    fontFamily,
    setFontFamily,
    hydrated,
    colorTheme,
    setColorTheme,
    accentColor,
    setAccentColor,
  };

  return (
    <ReadingPrefsContext.Provider value={value}>
      {children}
    </ReadingPrefsContext.Provider>
  );
}

export function useReadingPrefs(): ReadingPrefs {
  return useContext(ReadingPrefsContext);
}
