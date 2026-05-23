import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatModelBadge } from "@/components/ChatModelBadge";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LlmInitDownloadModal } from "@/components/LlmInitDownloadModal";
import { LiveThinkingPanel } from "@/components/LiveThinkingPanel";
import { StreamingText } from "@/components/StreamingText";
import { useLLMChat } from "@/hooks/useLLMChat";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec } from "@/ai/model-registry";

export default function ChatScreen() {
  const router = useRouter();
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
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const tierSpec = getTierSpec(selectedTier);
  const [liveThinkingExpandedOverride, setLiveThinkingExpandedOverride] = useState<boolean | null>(
    null,
  );
  const autoLiveThinkingOpen =
    !isLoading || !streamingHasThinkTag || !streamingThinkClosed;
  const isLiveThinkingOpen = liveThinkingExpandedOverride ?? autoLiveThinkingOpen;

  const resetLiveThinkingOverride = () => setLiveThinkingExpandedOverride(null);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !isLoading, [prompt, isLoading]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LlmInitDownloadModal />
      <View style={styles.conversationBar}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            resetLiveThinkingOverride();
            startNewConversation("New chat");
          }}
        >
          <Text style={styles.primaryBtnText}>+ New chat</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/chats" as never)}>
          <Text style={styles.secondaryBtnText}>Open chats</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.messages}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messagesContent}
      >
        <ChatModelBadge modelName={tierSpec.name} modelId={tierSpec.primary.id} />
        {error ? <ErrorBanner message={error} /> : null}
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} content={m.content} thinking={m.thinking} />
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
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <ChatComposer
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
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
