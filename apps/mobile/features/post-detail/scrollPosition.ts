import AsyncStorage from "@react-native-async-storage/async-storage";

export const SCROLL_KEY_PREFIX = "@aklman/scroll/";
const SCROLL_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
export const SWIPE_HINT_KEY = "@aklman/banner_swipe_hint_seen";

export async function saveScrollPos(key: string, position: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ position, savedAt: Date.now() }));
  } catch {}
}

export async function loadScrollPos(key: string): Promise<number | null> {
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

export async function clearScrollPos(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}
