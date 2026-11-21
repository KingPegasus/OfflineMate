import { Pressable, StyleSheet, Text, View } from "react-native";

type ErrorBannerAction = { label: string; onPress: () => void };

/**
 * A problem shown in Chat. "info" is for things the user just needs to do (download the assistant,
 * pick one that can see photos), so it isn't styled as a red error.
 */
export function ErrorBanner({
  message,
  action,
  title = "Something went wrong",
  tone = "error",
}: {
  message: string;
  action?: ErrorBannerAction;
  title?: string;
  tone?: "error" | "info";
}) {
  const info = tone === "info";
  return (
    <View style={[styles.root, info && styles.rootInfo]}>
      <Text style={[styles.title, info && styles.titleInfo]}>{title}</Text>
      <Text style={[styles.body, info && styles.bodyInfo]}>{message}</Text>
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
    padding: 12,
    marginBottom: 8,
  },
  rootInfo: { backgroundColor: "#0f1d33", borderColor: "#3b82f6" },
  title: { color: "#fecaca", fontWeight: "700", marginBottom: 4 },
  titleInfo: { color: "#dbeafe" },
  body: { color: "#fecaca", lineHeight: 20 },
  bodyInfo: { color: "#cbd5e1" },
  action: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionText: { color: "#f9fafb", fontWeight: "700", fontSize: 14 },
});
