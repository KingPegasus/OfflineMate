import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { getModelsForTier } from "@/ai/model-registry";
import type { ModelTier } from "@/types/assistant";

type TierModelIds = Record<ModelTier, string | null>;

const MIGRATE_DEFAULTS = {
  selectedTier: "standard" as ModelTier,
  tierModelIds: {
    lite: null,
    standard: null,
    full: null,
  } as TierModelIds,
  voiceEnabled: false,
  webSearchEnabled: true,
  hasCompletedOnboarding: false,
  persistChatHistory: false,
};

const SETTINGS_KEYS = [
  "selectedTier",
  "tierModelIds",
  "voiceEnabled",
  "webSearchEnabled",
  "hasCompletedOnboarding",
  "persistChatHistory",
] as const;

function normalizeModelIdForTier(tier: ModelTier, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const allowed = new Set(getModelsForTier(tier).map((m) => m.id));
  return allowed.has(value) ? value : null;
}

function normalizeTierModelIds(value: unknown): TierModelIds {
  const input = (value && typeof value === "object")
    ? (value as Partial<Record<ModelTier, unknown>>)
    : {};
  return {
    lite: normalizeModelIdForTier("lite", input.lite),
    standard: normalizeModelIdForTier("standard", input.standard),
    full: normalizeModelIdForTier("full", input.full),
  };
}

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
  if (version < 6) {
    const legacyStandardModelId = normalizeModelIdForTier(
      "standard",
      (p as { standardModelId?: unknown }).standardModelId
    );
    out.tierModelIds = {
      ...MIGRATE_DEFAULTS.tierModelIds,
      standard: legacyStandardModelId,
    };
  } else {
    out.tierModelIds = normalizeTierModelIds(out.tierModelIds);
  }
  out.tierModelIds = normalizeTierModelIds(out.tierModelIds);
  out.persistChatHistory = Boolean(out.persistChatHistory);
  return out;
}

/**
 * Exported for tests. Secure storage that never rejects. If the Keychain/Keystore read fails
 * (for example iOS error -34018 when the app lacks the keychain entitlement), zustand's persist
 * would never finish hydrating and the index screen would spin forever. Falling back to defaults
 * keeps the app usable; a failed write only means the setting isn't remembered.
 */
export const secureStorage = {
  getItem: async (name: string) => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch (e) {
      console.warn("[OfflineMate] Could not read settings, using defaults:", e);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (e) {
      console.warn("[OfflineMate] Could not save settings:", e);
    }
  },
  removeItem: async (name: string) => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (e) {
      console.warn("[OfflineMate] Could not clear settings:", e);
    }
  },
};

interface SettingsState {
  selectedTier: ModelTier;
  /** Per-tier selected model id; null means tier primary. */
  tierModelIds: TierModelIds;
  voiceEnabled: boolean;
  webSearchEnabled: boolean;
  hasCompletedOnboarding: boolean;
  persistChatHistory: boolean;
  setSelectedTier: (tier: ModelTier) => void;
  setTierModelId: (tier: ModelTier, modelId: string | null) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setPersistChatHistory: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedTier: "standard" as ModelTier,
      tierModelIds: { ...MIGRATE_DEFAULTS.tierModelIds },
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
      setSelectedTier: (tier: ModelTier) => set({ selectedTier: tier }),
      setTierModelId: (tier: ModelTier, modelId: string | null) => set((state) => ({
        tierModelIds: {
          ...state.tierModelIds,
          [tier]: normalizeModelIdForTier(tier, modelId),
        },
      })),
      setVoiceEnabled: (voiceEnabled: boolean) => set({ voiceEnabled }),
      setWebSearchEnabled: (webSearchEnabled: boolean) => set({ webSearchEnabled }),
      setPersistChatHistory: (persistChatHistory: boolean) => set({ persistChatHistory }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: "offlinemate-settings",
      storage: createJSONStorage(() => secureStorage),
      version: 6,
      migrate: migrateSettingsState,
      partialize: (s) => ({
        selectedTier: s.selectedTier,
        tierModelIds: s.tierModelIds,
        voiceEnabled: s.voiceEnabled,
        webSearchEnabled: s.webSearchEnabled,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        persistChatHistory: s.persistChatHistory,
      }),
    },
  ),
);

