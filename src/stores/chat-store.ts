import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { ChatConversation, ChatMessage } from "@/types/assistant";
import { useSettingsStore } from "@/stores/settings-store";

const DEFAULT_CONVERSATION_TITLE = "New chat";
const MAX_TITLE_LENGTH = 60;

function normalizeConversationTitle(input?: string) {
  const trimmed = (input ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return DEFAULT_CONVERSATION_TITLE;
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_TITLE_LENGTH - 3).trimEnd()}...`;
}

interface ChatState {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  streamingResponse: string;
  streamingThinking: string[];
  streamingHasThinkTag: boolean;
  streamingThinkClosed: boolean;
  isLoading: boolean;
  error: string | null;
  createConversation: (seedTitle?: string) => string;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, nextTitle: string) => void;
  pushMessage: (message: ChatMessage, conversationId?: string) => void;
  clearMessages: () => void;
  setStreamingResponse: (text: string) => void;
  setStreamingThinking: (steps: string[]) => void;
  setStreamingHasThinkTag: (value: boolean) => void;
  setStreamingThinkClosed: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      messages: [],
      streamingResponse: "",
      streamingThinking: [],
      streamingHasThinkTag: false,
      streamingThinkClosed: false,
      isLoading: false,
      error: null,
      createConversation: (seedTitle) => {
        const now = Date.now();
        const id = `conv-${now}-${Math.random().toString(36).slice(2, 8)}`;
        const title = normalizeConversationTitle(seedTitle);
        set((state) => ({
          conversations: [{ id, title, createdAt: now, updatedAt: now }, ...state.conversations],
          activeConversationId: id,
          streamingResponse: "",
          streamingThinking: [],
          streamingHasThinkTag: false,
          streamingThinkClosed: false,
          error: null,
        }));
        return id;
      },
      selectConversation: (conversationId) => {
        set((state) => {
          if (!state.conversations.some((it) => it.id === conversationId)) return {};
          return {
            activeConversationId: conversationId,
            streamingResponse: "",
            streamingThinking: [],
            streamingHasThinkTag: false,
            streamingThinkClosed: false,
            error: null,
          };
        });
      },
      deleteConversation: (conversationId) => {
        set((state) => {
          const nextConversations = state.conversations.filter((it) => it.id !== conversationId);
          const nextMessages = state.messages.filter((m) => m.conversationId !== conversationId);
          let nextActive = state.activeConversationId;
          if (state.activeConversationId === conversationId) {
            nextActive = nextConversations[0]?.id ?? null;
          }
          return {
            conversations: nextConversations,
            messages: nextMessages,
            activeConversationId: nextActive,
            streamingResponse: "",
            streamingThinking: [],
            streamingHasThinkTag: false,
            streamingThinkClosed: false,
            error: null,
          };
        });
      },
      renameConversation: (conversationId, nextTitle) => {
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  title: normalizeConversationTitle(nextTitle),
                  updatedAt: Date.now(),
                }
              : conversation,
          ),
        }));
      },
      pushMessage: (message, conversationId) =>
        set((state) => {
          let targetConversationId = conversationId ?? state.activeConversationId;
          let nextConversationsBase = state.conversations;
          const targetExists = targetConversationId
            ? state.conversations.some((conversation) => conversation.id === targetConversationId)
            : false;
          if (targetConversationId && !targetExists) {
            return {};
          }
          let createdConversation = false;
          if (!targetConversationId) {
            const now = Date.now();
            targetConversationId = `conv-${now}-${Math.random().toString(36).slice(2, 8)}`;
            createdConversation = true;
            nextConversationsBase = [
              {
                id: targetConversationId,
                title:
                  message.role === "user"
                    ? normalizeConversationTitle(message.content)
                    : DEFAULT_CONVERSATION_TITLE,
                createdAt: now,
                updatedAt: now,
              },
              ...state.conversations,
            ];
          }
          const now = Date.now();
          const withConversation = { ...message, conversationId: targetConversationId };
          const nextMessages = [...state.messages, withConversation];
          const nextConversations = nextConversationsBase.map((conversation) =>
            conversation.id === targetConversationId
              ? {
                  ...conversation,
                  title:
                    conversation.title === DEFAULT_CONVERSATION_TITLE && withConversation.role === "user"
                      ? normalizeConversationTitle(withConversation.content)
                      : conversation.title,
                  updatedAt: now,
                }
              : conversation,
          );
          const nextState: Pick<ChatState, "messages" | "conversations" | "activeConversationId"> = {
            messages: nextMessages,
            conversations: nextConversations,
            activeConversationId: state.activeConversationId,
          };
          if (createdConversation) {
            nextState.activeConversationId = targetConversationId;
          }
          return nextState;
        }),
      clearMessages: () =>
        set((state) => {
          const active = state.activeConversationId;
          if (!active) return {};
          return {
            messages: state.messages.filter((m) => m.conversationId !== active),
            conversations: state.conversations.filter((c) => c.id !== active),
            activeConversationId:
              state.conversations.find((c) => c.id !== active)?.id ?? null,
            streamingResponse: "",
            streamingThinking: [],
            streamingHasThinkTag: false,
            streamingThinkClosed: false,
            error: null,
          };
        }),
      setStreamingResponse: (streamingResponse) => set({ streamingResponse }),
      setStreamingThinking: (streamingThinking) => set({ streamingThinking }),
      setStreamingHasThinkTag: (streamingHasThinkTag) => set({ streamingHasThinkTag }),
      setStreamingThinkClosed: (streamingThinkClosed) => set({ streamingThinkClosed }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: "offlinemate-chat",
      storage: createJSONStorage(() => secureStorage),
      version: 2,
      migrate: (persisted: unknown, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version >= 2) {
          if ((p.activeConversationId as string | null | undefined) || !Array.isArray(p.conversations)) {
            return p;
          }
          const conversations = p.conversations as ChatConversation[];
          return {
            ...p,
            activeConversationId: conversations[0]?.id ?? null,
          };
        }
        const oldMessages = Array.isArray(p.messages) ? (p.messages as ChatMessage[]) : [];
        if (oldMessages.length === 0) {
          return {
            conversations: [],
            activeConversationId: null,
            messages: [],
          };
        }
        const now = Date.now();
        const conversationId = `conv-migrated-${now}`;
        const title =
          oldMessages.find((m) => m.role === "user")?.content?.slice(0, 60) ||
          "Previous chat";
        return {
          conversations: [{ id: conversationId, title, createdAt: now, updatedAt: now }],
          activeConversationId: conversationId,
          messages: oldMessages.map((m) => ({ ...m, conversationId })),
        };
      },
      partialize: (s) => {
        const settings = useSettingsStore.getState();
        if (!settings.persistChatHistory) {
          return { messages: [], conversations: [], activeConversationId: null };
        }
        return {
          messages: s.messages,
          conversations: s.conversations,
          activeConversationId: s.activeConversationId,
        };
      },
    },
  ),
);

