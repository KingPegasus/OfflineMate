import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { runMigrations } from "@/db/migrations";
import { registerBackgroundUnload } from "@/utils/performance";
import { llmEngine } from "@/ai/llm-engine";

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  useEffect(() => {
    runMigrations();
    const sub = registerBackgroundUnload(() => llmEngine.unload());
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: "modal", headerShown: true, title: "Setup" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}

