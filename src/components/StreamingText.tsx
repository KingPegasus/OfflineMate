import { StyleSheet, Text, View } from "react-native";

export function StreamingText({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
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
  text: { color: "#93c5fd", fontStyle: "italic" },
});

