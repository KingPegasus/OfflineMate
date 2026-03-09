import { StyleSheet, View } from "react-native";
import { MarkdownText } from "@/components/MarkdownText";

export function StreamingText({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <MarkdownText text={text} style={styles.text} boldStyle={styles.boldText} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  text: { color: "#e5e7eb", lineHeight: 24 },
  boldText: { fontWeight: "700", color: "#f8fafc" },
});

