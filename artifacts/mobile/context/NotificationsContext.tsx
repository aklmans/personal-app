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
import { Platform } from "react-native";
import { useRouter } from "expo-router";

const STORAGE_KEY = "@notifications_opted_in_v1";
const STORAGE_TOKEN_KEY = "@notifications_push_token_v1";

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080";
const isLocalDev = domain.startsWith("localhost") || domain.startsWith("127.");
const API_BASE = `${isLocalDev ? "http" : "https"}://${domain}/api`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationsContextValue {
  optedIn: boolean;
  permissionStatus: "undetermined" | "granted" | "denied";
  isLoading: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  optedIn: false,
  permissionStatus: "undetermined",
  isLoading: false,
  enable: async () => {},
  disable: async () => {},
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

async function registerToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notifications/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
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
  const router = useRouter();
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === "true") {
          setOptedIn(true);
          if (Platform.OS !== "web") {
            Promise.all([
              AsyncStorage.getItem(STORAGE_TOKEN_KEY),
              getPushToken(),
            ])
              .then(async ([storedToken, currentToken]) => {
                if (!currentToken) return;
                if (storedToken && storedToken !== currentToken) {
                  await unregisterToken(storedToken);
                  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, currentToken);
                }
                await registerToken(currentToken);
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
      }
    );

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, [router]);

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

      const registered = await registerToken(token);
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
      value={{ optedIn, permissionStatus, isLoading, enable, disable }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
