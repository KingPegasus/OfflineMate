import { StyleSheet, Text, View } from "react-native";

type Props = {
  modelName: string;
  modelId: string;
};

export function ChatModelBadge({ modelName, modelId }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        Active model: {modelName} · {modelId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  text: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "600",
  },
});
