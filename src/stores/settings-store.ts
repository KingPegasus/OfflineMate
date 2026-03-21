import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ModelTier } from "@/types/assistant";

const MIGRATE_DEFAULTS = {
  selectedTier: "standard" as ModelTier,
  voiceEnabled: false,
  webSearchEnabled: true,
  hasCompletedOnboarding: false,
};

const SETTINGS_KEYS = ["selectedTier", "voiceEnabled", "webSearchEnabled", "hasCompletedOnboarding"] as const;

/** Exported for tests. Ensures undefined/invalid persisted state yields full defaults. Never returns {} or partial state. */
export function migrateSettingsState(
  persisted: unknown,
  version: number
): Record<string, unknown> {
  const p = persisted as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") {
    return { ...MIGRATE_DEFAULTS };
  }
  const base = version < 2 && !("webSearchEnabled" in p)
    ? { ...MIGRATE_DEFAULTS, ...p, webSearchEnabled: true }
    : { ...MIGRATE_DEFAULTS, ...p };
  // Ensure no key is undefined (corrupted or partial persist can leave undefined)
  const out = { ...MIGRATE_DEFAULTS } as Record<string, unknown>;
  for (const k of SETTINGS_KEYS) {
    if (base[k] !== undefined) out[k] = base[k];
  }
  return out;
}

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
      migrate: migrateSettingsState,
      partialize: (s) => ({
        selectedTier: s.selectedTier,
        voiceEnabled: s.voiceEnabled,
        webSearchEnabled: s.webSearchEnabled,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
      }),
    },
  ),
);

