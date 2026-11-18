import { StyleSheet, Text, View } from "react-native";
import { chatModelBadgeText, type ChatModelLabelInput } from "@/utils/chat-model-label";

type Props = ChatModelLabelInput;

export function ChatModelBadge(props: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{chatModelBadgeText(props)}</Text>
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
