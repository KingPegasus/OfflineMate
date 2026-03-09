import { create } from "zustand";
import type { ChatMessage } from "@/types/assistant";

interface ChatState {
  messages: ChatMessage[];
  streamingResponse: string;
  streamingThinking: string[];
  streamingHasThinkTag: boolean;
  streamingThinkClosed: boolean;
  isLoading: boolean;
  error: string | null;
  pushMessage: (message: ChatMessage) => void;
  setStreamingResponse: (text: string) => void;
  setStreamingThinking: (steps: string[]) => void;
  setStreamingHasThinkTag: (value: boolean) => void;
  setStreamingThinkClosed: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streamingResponse: "",
  streamingThinking: [],
  streamingHasThinkTag: false,
  streamingThinkClosed: false,
  isLoading: false,
  error: null,
  pushMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setStreamingResponse: (streamingResponse) => set({ streamingResponse }),
  setStreamingThinking: (streamingThinking) => set({ streamingThinking }),
  setStreamingHasThinkTag: (streamingHasThinkTag) => set({ streamingHasThinkTag }),
  setStreamingThinkClosed: (streamingThinkClosed) => set({ streamingThinkClosed }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

