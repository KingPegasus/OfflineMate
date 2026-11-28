import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOOL_DISPLAY } from "@/tools/tool-display";

/** Examples shown in an empty chat, from the Help tab's list. */
const SUGGESTED = ["reminders.set", "weather.current", "notes.create"];

/** "Try asking" chips for a new chat: tap one to put it in the message box. */
export function ChatSuggestions({
  onPick,
  onAskAboutPhoto,
}: {
  onPick: (text: string) => void;
  /** Shown when the assistant can look at photos. */
  onAskAboutPhoto?: () => void;
}) {
  const examples = SUGGESTED.map((name) => TOOL_DISPLAY.find((t) => t.name === name)).filter(
    (t): t is (typeof TOOL_DISPLAY)[number] => !!t,
  );
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Try asking</Text>
      {examples.map((tool) => (
        <Pressable
          key={tool.name}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          onPress={() => onPick(tool.example)}
          accessibilityRole="button"
          accessibilityHint="Puts this in the message box"
        >
          <Ionicons name={tool.icon} size={18} color="#93c5fd" />
          <Text style={styles.chipText}>{tool.example}</Text>
        </Pressable>
      ))}
      {onAskAboutPhoto ? (
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          onPress={onAskAboutPhoto}
          accessibilityRole="button"
        >
          <Ionicons name="image-outline" size={18} color="#93c5fd" />
          <Text style={styles.chipText}>Ask about a photo</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>Or type anything. More ideas in Help.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8, marginTop: 8 },
  title: { color: "#e5e7eb", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  pressed: { backgroundColor: "#1f2937" },
  chipText: { color: "#dbeafe", flexShrink: 1 },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 2 },
});
