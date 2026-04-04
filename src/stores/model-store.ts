import { create } from "zustand";
import type { ModelTier } from "@/types/assistant";

interface ModelState {
  activeTier: ModelTier;
  isDownloading: boolean;
  progress: number;
  /** Set while ExecuTorch downloads the LLM binary during chat init (remote URL). */
  llmInitDownload: { progress: number; modelName?: string; fileLabel?: string } | null;
  setActiveTier: (tier: ModelTier) => void;
  setDownloadState: (downloading: boolean, progress: number) => void;
  setLlmInitDownload: (state: { progress: number; modelName?: string; fileLabel?: string } | null) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeTier: "standard",
  isDownloading: false,
  progress: 0,
  llmInitDownload: null,
  setActiveTier: (activeTier) => set({ activeTier }),
  setDownloadState: (isDownloading, progress) => set({ isDownloading, progress }),
  setLlmInitDownload: (llmInitDownload) => set({ llmInitDownload }),
}));

