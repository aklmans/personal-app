import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolved: "light",
  setPreference: () => {},
});

const STORAGE_KEY = "aklman_theme";

function resolve(
  pref: ThemePreference,
  system: "light" | "dark" | null
): ResolvedTheme {
  if (pref === "system") return system === "dark" ? "dark" : "light";
  return pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceSt] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setPreferenceSt(val);
      }
    });
  }, []);

  // Push the user's preference down to the native trait collection so
  // SwiftUI-rendered chrome (iOS 26 Liquid Glass NativeTabs, system pickers,
  // alerts, etc.) follows the in-app theme picker. Without this the JS side
  // tints correctly but the native tab bar stays on the OS-level appearance,
  // which causes the bottom bar to flash light cream while content is dark.
  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? null : preference);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceSt(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const resolved = resolve(preference, system ?? null);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
