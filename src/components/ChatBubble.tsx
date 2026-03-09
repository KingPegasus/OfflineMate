import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { MarkdownText } from "@/components/MarkdownText";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string[];
}

export function ChatBubble({ role, content, thinking }: Props) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  const hasThinking = !!thinking && thinking.length > 0;

  const copyResponse = async () => {
    await Clipboard.setStringAsync(content);
    setCopyLabel("Copied");
    setTimeout(() => setCopyLabel("Copy"), 1200);
  };

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        {isAssistant && hasThinking ? (
          <View style={styles.thinkingWrap}>
            <TouchableOpacity
              style={styles.thinkingHeader}
              onPress={() => setIsThinkingOpen((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.thinkingTitle}>Thinking</Text>
              <Text style={styles.thinkingHint}>{isThinkingOpen ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {isThinkingOpen ? (
              <View style={styles.thinkingBody}>
                {thinking.map((step, idx) => (
                  <Text key={`${idx}-${step}`} style={styles.thinkingText}>
                    {step}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        <MarkdownText text={content} style={styles.text} boldStyle={styles.textBold} />
        {isAssistant ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.copyBtn} onPress={() => void copyResponse()}>
              <Text style={styles.copyText}>{copyLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 8, width: "100%" },
  userRow: { alignItems: "flex-end" },
  assistantRow: { alignItems: "flex-start" },
  bubble: { maxWidth: "85%", borderRadius: 12, padding: 10 },
  user: { backgroundColor: "#2563eb" },
  assistant: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937" },
  text: { color: "#e5e7eb" },
  textBold: { fontWeight: "700", color: "#f3f4f6" },
  thinkingWrap: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#243041",
    borderRadius: 10,
    backgroundColor: "#0f172a",
  },
  thinkingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  thinkingTitle: { color: "#93c5fd", fontWeight: "700", fontSize: 12 },
  thinkingHint: { color: "#9ca3af", fontSize: 12 },
  thinkingBody: {
    borderTopWidth: 1,
    borderTopColor: "#243041",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  thinkingText: { color: "#9ca3af", fontSize: 12 },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  copyBtn: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyText: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "600",
  },
});

