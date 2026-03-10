import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { runMigrations } from "@/db/migrations";
import { registerBackgroundUnload } from "@/utils/performance";
import { llmEngine } from "@/ai/llm-engine";

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

  useEffect(() => {
    runMigrations();
    const sub = registerBackgroundUnload(() => llmEngine.unload());
    return () => sub.remove();
  }, []);

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" hidden={false} translucent={false} backgroundColor="#ffffff" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: "modal", headerShown: true, title: "Setup" }}
          />
        </Stack>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}

