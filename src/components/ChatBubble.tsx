import { StyleSheet, Text, View } from "react-native";

interface Props {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatBubble({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={styles.text}>{content}</Text>
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
});

