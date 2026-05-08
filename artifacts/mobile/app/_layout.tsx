import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_600SemiBold,
  Lora_700Bold,
} from "@expo-google-fonts/lora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost:8080";
setBaseUrl(`https://${domain}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,
      retry: 1,
    },
  },
});

function StackNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="post/[slug]"
        options={{ title: "", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="category/[slug]"
        options={{ title: "Category", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="tag/[slug]"
        options={{ title: "Tag", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="archives"
        options={{ title: "Archives", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="series/[slug]"
        options={{ title: "Series", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="about"
        options={{ title: "About", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="showcases"
        options={{ title: "Showcases", headerBackTitle: "Back" }}
      />
    </Stack>
  );
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>{children}</KeyboardProvider>
            </GestureHandlerRootView>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_600SemiBold,
    Lora_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <AppProviders>
        <StackNav />
      </AppProviders>
    </ThemeProvider>
  );
}
