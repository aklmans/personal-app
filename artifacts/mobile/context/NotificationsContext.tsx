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

const STORAGE_KEY = "@notifications_opted_in_v1";
const STORAGE_TOKEN_KEY = "@notifications_push_token_v1";
const STORAGE_CATEGORIES_KEY = "@notifications_categories_v1";

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080";
const isLocalDev = domain.startsWith("localhost") || domain.startsWith("127.");
const API_BASE = `${isLocalDev ? "http" : "https"}://${domain}/api`;

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

async function registerToken(token: string, locale: string, categories: string[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, locale, categories }),
    });
    return res.ok;
  } catch {
    return false;
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
  const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    fetchAvailableCategories();
  }, [fetchAvailableCategories]);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, STORAGE_CATEGORIES_KEY, STORAGE_TOKEN_KEY])
      .then(([[, optedInVal], [, categoriesVal]]) => {
        const cats: string[] = categoriesVal ? (JSON.parse(categoriesVal) as string[]) : [];
        setNotifCategoriesState(cats);
        if (optedInVal === "true") {
          setOptedIn(true);
          if (Platform.OS !== "web") {
            AsyncStorage.getItem(STORAGE_TOKEN_KEY)
              .then(async (storedToken) => {
                const currentToken = await getPushToken();
                if (!currentToken) return;
                const registered = await registerToken(currentToken, locale, cats);
                if (registered && storedToken && storedToken !== currentToken) {
                  await unregisterToken(storedToken);
                  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, currentToken);
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
            Notifications.setBadgeCountAsync(0).catch(() => {});
          }
        })
        .catch(() => {});
    }

    notificationReceivedListener.current = Notifications.addNotificationReceivedListener(() => {
      Notifications.getBadgeCountAsync()
        .then((count) => Notifications.setBadgeCountAsync(count + 1))
        .catch(() => {});
    });

    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          slug?: string;
          locale?: string;
        };
        navigateToPost(router, data);
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    );

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    });

    return () => {
      notificationReceivedListener.current?.remove();
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

      const registered = await registerToken(token, locale, notifCategories);
      if (!registered) {
        return;
      }

      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
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
        if (token) await registerToken(token, locale, normalized);
      }
    } catch {
      // best-effort
    }
  }, [optedIn, locale]);

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
      value={{ optedIn, permissionStatus, isLoading, enable, disable, notifCategories, setNotifCategories, availableCategories, refreshAvailableCategories: fetchAvailableCategories }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
