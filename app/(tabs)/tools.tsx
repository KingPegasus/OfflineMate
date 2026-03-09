import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import { useTools } from "@/hooks/useTools";

export default function ToolsScreen() {
  const { registeredTools } = useTools();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Tool Registry</Text>
      {registeredTools.map((tool) => (
        <View key={tool.name} style={styles.tool}>
          <Text style={styles.toolName}>{tool.name}</Text>
          <Text style={styles.toolDesc}>{tool.description}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16, gap: 10 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 6 },
  tool: { backgroundColor: "#111827", borderRadius: 12, padding: 12 },
  toolName: { color: "#93c5fd", fontWeight: "700", marginBottom: 4 },
  toolDesc: { color: "#9ca3af" },
});

