import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ModelTier } from "@/types/assistant";

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface SettingsState {
  selectedTier: ModelTier;
  voiceEnabled: boolean;
  webSearchEnabled: boolean;
  hasCompletedOnboarding: boolean;
  setSelectedTier: (tier: ModelTier) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedTier: "standard",
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      setSelectedTier: (tier) => set({ selectedTier: tier }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setWebSearchEnabled: (webSearchEnabled) => set({ webSearchEnabled }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: "offlinemate-settings",
      storage: createJSONStorage(() => secureStorage),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const p = persisted as Record<string, unknown> | undefined;
        if (version < 2 && p && !("webSearchEnabled" in p)) {
          return { ...p, webSearchEnabled: true };
        }
        return p ?? {};
      },
      partialize: (s) => ({
        selectedTier: s.selectedTier,
        voiceEnabled: s.voiceEnabled,
        webSearchEnabled: s.webSearchEnabled,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
      }),
    },
  ),
);

