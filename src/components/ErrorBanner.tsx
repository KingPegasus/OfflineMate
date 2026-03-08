import { StyleSheet, Text, View } from "react-native";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#3f1d2e",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  title: { color: "#fecaca", fontWeight: "700", marginBottom: 4 },
  body: { color: "#fecaca" },
});

