import { Pressable, StyleSheet, Text, View } from "react-native";

type ErrorBannerAction = { label: string; onPress: () => void };

export function ErrorBanner({ message, action }: { message: string; action?: ErrorBannerAction }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.body}>{message}</Text>
      {action ? (
        <Pressable style={styles.action} onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
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
  action: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: { color: "#e5e7eb", fontWeight: "700", fontSize: 13 },
});
