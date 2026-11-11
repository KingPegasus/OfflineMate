import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { initExecutorch } from "react-native-executorch/legacy";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher/legacy";
import { runMigrations } from "@/db/migrations";
import { registerBackgroundUnload } from "@/utils/performance";
import { llmEngine } from "@/ai/llm-engine";
import { cleanupStalePartFiles } from "@/ai/model-manager";
import { usePhonePortraitLock } from "@/hooks/usePhonePortraitLock";

initExecutorch({
  resourceFetcher: ExpoResourceFetcher,
});

// Show notifications when app is in foreground (e.g. scheduled reminders)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  useKeepAwake();
  usePhonePortraitLock();

  useEffect(() => {
    runMigrations();
    // Nothing is downloading yet at launch, so any .part file is from an interrupted download.
    cleanupStalePartFiles().catch((e) => console.warn("[OfflineMate] Partial download cleanup failed:", e));
    const sub = registerBackgroundUnload(() => llmEngine.unload());
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" hidden={false} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ statusBarStyle: "dark" }} />
            <Stack.Screen
              name="onboarding"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Setup",
                // Match the dark onboarding screen. An opaque background also keeps iOS from
                // laying the screen out underneath a translucent header.
                headerStyle: { backgroundColor: "#030712" },
                headerTintColor: "#e5e7eb",
                headerShadowVisible: false,
                // iOS uses view-controller-based status bar appearance, so the style is set per screen.
                statusBarStyle: "light",
              }}
            />
          </Stack>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

