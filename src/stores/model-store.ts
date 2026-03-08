import { create } from "zustand";
import type { ModelTier } from "@/types/assistant";

interface ModelState {
  activeTier: ModelTier;
  isDownloading: boolean;
  progress: number;
  setActiveTier: (tier: ModelTier) => void;
  setDownloadState: (downloading: boolean, progress: number) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeTier: "standard",
  isDownloading: false,
  progress: 0,
  setActiveTier: (activeTier) => set({ activeTier }),
  setDownloadState: (isDownloading, progress) => set({ isDownloading, progress }),
}));

