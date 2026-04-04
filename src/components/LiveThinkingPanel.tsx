import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  lines: string[];
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function LiveThinkingPanel({ visible, lines, expanded, onToggleExpanded }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.header} activeOpacity={0.8} onPress={onToggleExpanded}>
        <Text style={styles.title}>Thinking</Text>
        <Text style={styles.hint}>{expanded ? "Hide" : "Show"}</Text>
      </TouchableOpacity>
      {expanded ? (
        lines.length > 0 ? (
          lines.map((step, idx) => (
            <Text key={`${idx}-${step}`} style={styles.line}>
              {step}
            </Text>
          ))
        ) : (
          <Text style={styles.line}>Thinking...</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#243041",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "700",
  },
  hint: {
    color: "#9ca3af",
    fontSize: 12,
  },
  line: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 2,
  },
});
