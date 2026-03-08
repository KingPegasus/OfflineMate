import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ChatBubble } from "@/components/ChatBubble";
import { VoiceButton } from "@/components/VoiceButton";
import { StreamingText } from "@/components/StreamingText";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useLLMChat } from "@/hooks/useLLMChat";

export default function ChatScreen() {
  const [prompt, setPrompt] = useState("");
  const { messages, sendMessage, streamingResponse, isLoading, error } = useLLMChat();

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !isLoading, [prompt, isLoading]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView style={styles.messages}>
        {error ? <ErrorBanner message={error} /> : null}
        {messages.map((m) => (
          <ChatBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {streamingResponse ? <StreamingText text={streamingResponse} /> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          placeholder="Ask OfflineMate..."
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
        <Text
          style={[styles.send, !canSubmit && styles.disabled]}
          onPress={() => {
            if (!canSubmit) return;
            void sendMessage(prompt.trim());
            setPrompt("");
          }}
        >
          Send
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  messages: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    padding: 12,
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
  send: { color: "#60a5fa", fontWeight: "600" },
  disabled: { color: "#6b7280" },
});

