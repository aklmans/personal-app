import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "@aklman/reading_font_size";
export const FONT_SIZE_DEFAULT = 17;
export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 22;
const FONT_SIZE_STEP = 1;

export interface ReadingPrefs {
  fontSize: number;
  canIncrease: boolean;
  canDecrease: boolean;
  increase: () => void;
  decrease: () => void;
}

export function useReadingPrefs(): ReadingPrefs {
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
          setFontSize(parsed);
        }
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
      AsyncStorage.setItem(STORAGE_KEY, String(clamped));
    }, 300);
  }, []);

  return {
    fontSize,
    canIncrease: fontSize < FONT_SIZE_MAX,
    canDecrease: fontSize > FONT_SIZE_MIN,
    increase: () => update(fontSize + FONT_SIZE_STEP),
    decrease: () => update(fontSize - FONT_SIZE_STEP),
  };
}
