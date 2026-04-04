import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet } from "react-native";
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
  const [prompt, setPrompt] = useState("");
  const {
    messages,
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
  const [isLiveThinkingOpen, setIsLiveThinkingOpen] = useState(true);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !isLoading, [prompt, isLoading]);

  useEffect(() => {
    if (!isLoading || !streamingHasThinkTag) {
      setIsLiveThinkingOpen(true);
      return;
    }
    if (streamingThinkClosed) {
      // Cursor-like behavior: minimize once </redacted_thinking> appears.
      setIsLiveThinkingOpen(false);
    } else {
      setIsLiveThinkingOpen(true);
    }
  }, [isLoading, streamingHasThinkTag, streamingThinkClosed]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <LlmInitDownloadModal />
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
          onToggleExpanded={() => setIsLiveThinkingOpen((v) => !v)}
        />
        {streamingResponse ? <StreamingText text={streamingResponse} /> : null}
      </ScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <ChatComposer
          value={prompt}
          onChangeText={setPrompt}
          onSend={() => {
            if (!canSubmit) return;
            void sendMessage(prompt.trim());
            setPrompt("");
          }}
          onStop={stopGeneration}
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
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
});
