import { StyleSheet, Text, View } from "react-native";

interface Props {
  title: string;
  message: string;
}

export function ToolResultCard({ title, message }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#111827", borderRadius: 10, padding: 12, marginVertical: 4 },
  title: { color: "#e5e7eb", fontWeight: "700", marginBottom: 4 },
  message: { color: "#9ca3af" },
});

