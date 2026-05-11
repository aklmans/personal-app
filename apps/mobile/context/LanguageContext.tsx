import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Locale = "en" | "zh-cn";

interface LanguageContextValue {
  locale: Locale;
  toggleLocale: () => void;
  isZh: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  toggleLocale: () => {},
  isZh: false,
});

const STORAGE_KEY = "aklman_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "zh-cn") setLocale("zh-cn");
    });
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next: Locale = prev === "en" ? "zh-cn" : "en";
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <LanguageContext.Provider
      value={{ locale, toggleLocale, isZh: locale === "zh-cn" }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
