import { create } from "zustand";
import type { ModelTier } from "@/types/assistant";

interface SettingsState {
  selectedTier: ModelTier;
  voiceEnabled: boolean;
  setSelectedTier: (tier: ModelTier) => void;
  setVoiceEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  selectedTier: "standard",
  voiceEnabled: false,
  setSelectedTier: (tier) => set({ selectedTier: tier }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
}));

