import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { ChatBubble } from "@/components/ChatBubble";
import { VoiceButton } from "@/components/VoiceButton";
import { StreamingText } from "@/components/StreamingText";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useLLMChat } from "@/hooks/useLLMChat";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec } from "@/ai/model-registry";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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
      // Cursor-like behavior: minimize once </think> appears.
      setIsLiveThinkingOpen(false);
    } else {
      setIsLiveThinkingOpen(true);
    }
  }, [isLoading, streamingHasThinkTag, streamingThinkClosed]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.messages}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.messagesContent}
      >
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>
            Active model: {tierSpec.name} · {tierSpec.primary.id}
          </Text>
        </View>
        {error ? <ErrorBanner message={error} /> : null}
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} content={m.content} thinking={m.thinking} />
        ))}
        {isLoading && streamingHasThinkTag ? (
          <View style={styles.liveThinking}>
            <TouchableOpacity
              style={styles.liveThinkingHeader}
              activeOpacity={0.8}
              onPress={() => setIsLiveThinkingOpen((v) => !v)}
            >
              <Text style={styles.liveThinkingTitle}>Thinking</Text>
              <Text style={styles.liveThinkingHint}>{isLiveThinkingOpen ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {isLiveThinkingOpen ? (
              streamingThinking.length > 0 ? (
                streamingThinking.map((step, idx) => (
                  <Text key={`${idx}-${step}`} style={styles.liveThinkingText}>
                    {step}
                  </Text>
                ))
              ) : (
                <Text style={styles.liveThinkingText}>Thinking...</Text>
              )
            ) : null}
          </View>
        ) : null}
        {streamingResponse ? <StreamingText text={streamingResponse} /> : null}
      </ScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={styles.composer}>
          <TextInput
            placeholder="Ask OfflineMate..."
            placeholderTextColor="#6b7280"
            value={prompt}
            onChangeText={setPrompt}
            style={styles.input}
            multiline
          />
          <VoiceButton
            onTranscript={(text) => {
              setPrompt((prev) => (prev ? `${prev} ${text}` : text));
            }}
          />
          {isLoading ? (
            <TouchableOpacity style={styles.stopButton} onPress={stopGeneration}>
              <Text style={styles.stopText}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
              onPress={() => {
                if (!canSubmit) return;
                void sendMessage(prompt.trim());
                setPrompt("");
              }}
              disabled={!canSubmit}
            >
              <Text style={[styles.sendText, !canSubmit && styles.disabled]}>Send</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardStickyView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  modelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  modelBadgeText: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "600",
  },
  liveThinking: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#243041",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  liveThinkingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  liveThinkingTitle: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
  },
  liveThinkingHint: {
    color: "#9ca3af",
    fontSize: 12,
  },
  liveThinkingText: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 2,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0b1020",
  },
  input: {
    flex: 1,
    color: "#e5e7eb",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#1f2937",
    borderRadius: 12,
    minWidth: 56,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  stopButton: {
    backgroundColor: "#7f1d1d",
    borderRadius: 12,
    minWidth: 56,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  stopText: { color: "#fecaca", fontWeight: "700" },
  sendText: { color: "#60a5fa", fontWeight: "700" },
  disabled: { color: "#6b7280" },
});

