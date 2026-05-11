import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "./LanguageContext";
import { API_BASE } from "@/lib/api-base";

const STORAGE_KEY = "@notifications_opted_in_v1";
const STORAGE_TOKEN_KEY = "@notifications_push_token_v1";
const STORAGE_CATEGORIES_KEY = "@notifications_categories_v1";
const STORAGE_MUTED_SLUGS_KEY = "@notifications_muted_slugs_v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationsContextValue {
  optedIn: boolean;
  permissionStatus: "undetermined" | "granted" | "denied";
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  notifCategories: string[];
  setNotifCategories: (cats: string[]) => Promise<void>;
  availableCategories: string[];
  refreshAvailableCategories: () => void;
  clearBadge: () => void;
  mutedSlugs: string[];
  mutePost: (slug: string) => Promise<void>;
  localeRegisteredAt: number | null;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  optedIn: false,
  permissionStatus: "undetermined",
  isLoading: false,
  enable: async () => {},
  disable: async () => {},
  notifCategories: [],
  setNotifCategories: async () => {},
  availableCategories: [],
  refreshAvailableCategories: () => {},
  clearBadge: () => {},
  mutedSlugs: [],
  mutePost: async () => {},
  localeRegisteredAt: null,
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "New Posts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
}

async function registerToken(token: string, locale: string, categories: string[], mutedSlugs: string[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, locale, categories, mutedSlugs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function clearBadge(token: string | null): Promise<void> {
  Notifications.setBadgeCountAsync(0).catch(() => {});
  if (!token) return;
  try {
    await fetch(`${API_BASE}/notifications/clear-badge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort
  }
}

async function unregisterToken(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort
  }
}

async function muteTokenSlug(token: string, slug: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, slug }),
    });
  } catch {
    // best-effort
  }
}

async function getPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    await ensureAndroidChannel();
    const result = await Notifications.getExpoPushTokenAsync();
    return result.data ?? null;
  } catch {
    return null;
  }
}

function navigateToPost(
  router: ReturnType<typeof useRouter>,
  data: { slug?: string; locale?: string }
) {
  if (data?.slug) {
    router.push({
      pathname: "/post/[slug]",
      params: { slug: data.slug, locale: data.locale ?? "en" },
    });
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [optedIn, setOptedIn] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"undetermined" | "granted" | "denied">("undetermined");
  const [isLoading, setIsLoading] = useState(false);
  const [notifCategories, setNotifCategoriesState] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [mutedSlugs, setMutedSlugsState] = useState<string[]>([]);
  const [localeRegisteredAt, setLocaleRegisteredAt] = useState<number | null>(null);
  const fetchAvailableCategories = useCallback(() => {
    fetch(`${API_BASE}/notifications/categories`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (data && typeof data === "object" && "categories" in data && Array.isArray((data as { categories: unknown }).categories)) {
          setAvailableCategories((data as { categories: string[] }).categories);
        }
      })
      .catch(() => {});
  }, []);
  const router = useRouter();
  const { locale } = useLanguage();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const coldStartHandled = useRef(false);
  const pushTokenRef = useRef<string | null>(null);
  const prevLocaleRef = useRef<string>(locale);
  const mutedSlugsRef = useRef<string[]>([]);
  const pendingLocaleRetryRef = useRef<{
    token: string;
    locale: string;
    categories: string[];
    mutedSlugs: string[];
  } | null>(null);

  useEffect(() => {
    fetchAvailableCategories();
  }, [fetchAvailableCategories]);

  useEffect(() => {
    const prevLocale = prevLocaleRef.current;
    prevLocaleRef.current = locale;
    if (prevLocale === locale) return;
    if (!optedIn || Platform.OS === "web") return;
    AsyncStorage.getItem(STORAGE_TOKEN_KEY)
      .then(async (token) => {
        if (!token) return;
        const ok = await registerToken(token, locale, notifCategories, mutedSlugsRef.current);
        if (ok) {
          setLocaleRegisteredAt(Date.now());
          pendingLocaleRetryRef.current = null;
        } else {
          pendingLocaleRetryRef.current = {
            token,
            locale,
            categories: notifCategories,
            mutedSlugs: mutedSlugsRef.current,
          };
        }
      })
      .catch(() => {});
  }, [locale, optedIn, notifCategories]);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, STORAGE_CATEGORIES_KEY, STORAGE_TOKEN_KEY, STORAGE_MUTED_SLUGS_KEY])
      .then(([[, optedInVal], [, categoriesVal], , [, mutedVal]]) => {
        const cats: string[] = categoriesVal ? (JSON.parse(categoriesVal) as string[]) : [];
        const muted: string[] = mutedVal ? (JSON.parse(mutedVal) as string[]) : [];
        setNotifCategoriesState(cats);
        setMutedSlugsState(muted);
        mutedSlugsRef.current = muted;
        if (optedInVal === "true") {
          setOptedIn(true);
          if (Platform.OS !== "web") {
            AsyncStorage.getItem(STORAGE_TOKEN_KEY)
              .then(async (storedToken) => {
                const currentToken = await getPushToken();
                if (!currentToken) return;
                pushTokenRef.current = currentToken;
                const registered = await registerToken(currentToken, locale, cats, muted);
                if (registered && storedToken && storedToken !== currentToken) {
                  await unregisterToken(storedToken);
                  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, currentToken);
                }
                if (AppState.currentState === "active") {
                  clearBadge(currentToken).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    if (Platform.OS === "web") return;

    Notifications.getPermissionsAsync()
      .then((perm) => {
        if (perm.granted) {
          setPermissionStatus("granted");
        } else if (perm.status === "denied") {
          setPermissionStatus("denied");
        } else {
          setPermissionStatus("undetermined");
        }
      })
      .catch(() => {});

    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) {
            const data = response.notification.request.content.data as {
              slug?: string;
              locale?: string;
            };
            navigateToPost(router, data);
            clearBadge(pushTokenRef.current).catch(() => {});
          }
        })
        .catch(() => {});
    }

    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          slug?: string;
          locale?: string;
        };
        navigateToPost(router, data);
        clearBadge(pushTokenRef.current).catch(() => {});
      }
    );

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        clearBadge(pushTokenRef.current).catch(() => {});
        const retry = pendingLocaleRetryRef.current;
        if (retry) {
          registerToken(retry.token, retry.locale, retry.categories, retry.mutedSlugs)
            .then((ok) => {
              if (ok) {
                pendingLocaleRetryRef.current = null;
              }
            })
            .catch(() => {});
        }
      }
    });

    return () => {
      notificationResponseListener.current?.remove();
      appStateSub.remove();
    };
  }, [router, locale]);

  const enable = useCallback(async () => {
    if (Platform.OS === "web") return;
    setIsLoading(true);
    try {
      let perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) {
        perm = await Notifications.requestPermissionsAsync();
      }
      if (!perm.granted) {
        setPermissionStatus("denied");
        return;
      }

      setPermissionStatus("granted");

      const token = await getPushToken();
      if (!token) {
        return;
      }

      const registered = await registerToken(token, locale, notifCategories, mutedSlugsRef.current);
      if (!registered) {
        return;
      }

      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
      pushTokenRef.current = token;
      setOptedIn(true);
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore unexpected errors — leave opt-in as false
    } finally {
      setIsLoading(false);
    }
  }, [locale, notifCategories]);

  const setNotifCategories = useCallback(async (cats: string[]) => {
    const normalized = [...new Set(cats.map((c) => c.trim().toLowerCase()).filter(Boolean))];
    setNotifCategoriesState(normalized);
    try {
      await AsyncStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(normalized));
      if (optedIn && Platform.OS !== "web") {
        const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        if (token) await registerToken(token, locale, normalized, mutedSlugsRef.current);
      }
    } catch {
      // best-effort
    }
  }, [optedIn, locale]);

  const mutePost = useCallback(async (slug: string) => {
    const trimmed = slug.trim();
    if (!trimmed) return;
    const updated = mutedSlugsRef.current.includes(trimmed)
      ? mutedSlugsRef.current
      : [...mutedSlugsRef.current, trimmed];
    mutedSlugsRef.current = updated;
    setMutedSlugsState(updated);
    try {
      await AsyncStorage.setItem(STORAGE_MUTED_SLUGS_KEY, JSON.stringify(updated));
      if (optedIn && Platform.OS !== "web") {
        const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        if (token) await muteTokenSlug(token, trimmed);
      }
    } catch {
      // best-effort
    }
  }, [optedIn]);

  const clearBadgeCallback = useCallback(() => {
    clearBadge(pushTokenRef.current).catch(() => {});
  }, []);

  const disable = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      if (token) {
        await unregisterToken(token);
        await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
      }
      setOptedIn(false);
      await AsyncStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        optedIn,
        permissionStatus,
        isLoading,
        enable,
        disable,
        notifCategories,
        setNotifCategories,
        availableCategories,
        refreshAvailableCategories: fetchAvailableCategories,
        clearBadge: clearBadgeCallback,
        mutedSlugs,
        mutePost,
        localeRegisteredAt,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
