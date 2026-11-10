import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatListPane } from "@/components/ChatListPane";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatModelBadge } from "@/components/ChatModelBadge";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LlmInitDownloadModal } from "@/components/LlmInitDownloadModal";
import { LiveThinkingPanel } from "@/components/LiveThinkingPanel";
import { StreamingText } from "@/components/StreamingText";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useLLMChat } from "@/hooks/useLLMChat";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec, resolveModelForTier } from "@/ai/model-registry";
import { CHAT_MAX_WIDTH, LIST_PANE_WIDTH } from "@/utils/layout";

export default function ChatScreen() {
  const router = useRouter();
  // Wide: cap and centre the message column. Two-pane: chat list on the left, conversation on the right.
  const { isWide, isTwoPane } = useBreakpoint();
  const column = isWide ? styles.column : null;
  const [prompt, setPrompt] = useState("");
  const {
    messages,
    startNewConversation,
    sendMessage,
    stopGeneration,
    streamingResponse,
    streamingThinking,
    streamingHasThinkTag,
    streamingThinkClosed,
    isLoading,
    error,
  } = useLLMChat();
  const errorTier = useChatStore((s) => s.errorTier);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const selectedModelId = useSettingsStore((s) => s.tierModelIds[selectedTier] ?? null);
  const tierSpec = getTierSpec(selectedTier);
  const activeModel = resolveModelForTier(selectedTier, selectedModelId);
  const [liveThinkingExpandedOverride, setLiveThinkingExpandedOverride] = useState<boolean | null>(
    null,
  );
  const autoLiveThinkingOpen =
    !isLoading || !streamingHasThinkTag || !streamingThinkClosed;
  const isLiveThinkingOpen = liveThinkingExpandedOverride ?? autoLiveThinkingOpen;

  const resetLiveThinkingOverride = () => setLiveThinkingExpandedOverride(null);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !isLoading, [prompt, isLoading]);
  const handleNewChat = () => {
    resetLiveThinkingOverride();
    startNewConversation("New chat");
  };

  return (
    <SafeAreaView style={styles.root} edges={isWide ? ["top", "bottom"] : ["top"]}>
      <LlmInitDownloadModal />
      <View style={styles.panes}>
        {isTwoPane ? (
          <View style={styles.listPane}>
            <ChatListPane onNewChat={handleNewChat} />
          </View>
        ) : null}
        <View style={styles.conversationPane}>
          {isTwoPane ? null : (
            <View style={[styles.conversationBar, column]}>
              <Pressable style={styles.primaryBtn} onPress={handleNewChat}>
                <Text style={styles.primaryBtnText}>+ New chat</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => router.push("/chats" as never)}>
                <Text style={styles.secondaryBtnText}>Open chats</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            style={styles.messages}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.messagesContent, column]}
          >
            <ChatModelBadge modelName={tierSpec.name} modelId={activeModel.id} />
            {error ? (
              <ErrorBanner
                message={error}
                action={
                  errorTier
                    ? {
                        label: `Open ${getTierSpec(errorTier).name} in Settings`,
                        onPress: () =>
                          // `at` makes every tap a new param value, so Settings reopens the picker each time.
                          router.push({
                            pathname: "/settings",
                            params: { tier: errorTier, at: String(Date.now()) },
                          } as never),
                      }
                    : undefined
                }
              />
            ) : null}
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                role={m.role}
                content={m.content}
                thinking={m.thinking}
                tokensPerSecond={m.tokensPerSecond}
              />
            ))}
            <LiveThinkingPanel
              visible={isLoading && streamingHasThinkTag}
              lines={streamingThinking}
              expanded={isLiveThinkingOpen}
              onToggleExpanded={() =>
                setLiveThinkingExpandedOverride((value) => !(value ?? autoLiveThinkingOpen))
              }
            />
            {streamingResponse ? <StreamingText text={streamingResponse} /> : null}
          </ScrollView>
          <KeyboardStickyView offset={{ closed: 0, opened: 0 }} style={isWide ? styles.composerBar : null}>
            <ChatComposer
              style={isWide ? styles.composerColumn : undefined}
              value={prompt}
              onChangeText={setPrompt}
              onSend={() => {
                if (!canSubmit) return;
                resetLiveThinkingOverride();
                void sendMessage(prompt.trim());
                setPrompt("");
              }}
              onStop={() => {
                resetLiveThinkingOverride();
                stopGeneration();
              }}
              isLoading={isLoading}
              canSubmit={canSubmit}
              onVoiceTranscript={(text) => {
                setPrompt((prev) => (prev ? `${prev} ${text}` : text));
              }}
            />
          </KeyboardStickyView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  panes: { flex: 1, flexDirection: "row" },
  listPane: { width: LIST_PANE_WIDTH, borderRightWidth: 1, borderRightColor: "#1f2937" },
  conversationPane: { flex: 1, minWidth: 0 },
  column: { width: "100%", maxWidth: CHAT_MAX_WIDTH, alignSelf: "center" },
  composerBar: { borderTopWidth: 1, borderTopColor: "#1f2937", backgroundColor: "#0b1020" },
  composerColumn: { width: "100%", maxWidth: CHAT_MAX_WIDTH, alignSelf: "center", borderTopWidth: 0 },
  conversationBar: {
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryBtnText: { color: "#e5e7eb", fontWeight: "700", fontSize: 12 },
  secondaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: { color: "#93c5fd", fontWeight: "600", fontSize: 12 },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
});
