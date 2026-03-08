import { create } from "zustand";
import type { ChatMessage } from "@/types/assistant";

interface ChatState {
  messages: ChatMessage[];
  streamingResponse: string;
  isLoading: boolean;
  error: string | null;
  pushMessage: (message: ChatMessage) => void;
  setStreamingResponse: (text: string) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streamingResponse: "",
  isLoading: false,
  error: null,
  pushMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setStreamingResponse: (streamingResponse) => set({ streamingResponse }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

