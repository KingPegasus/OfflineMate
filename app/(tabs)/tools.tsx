import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTools } from "@/hooks/useTools";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSettingsStore } from "@/stores/settings-store";
import { TOOL_DISPLAY } from "@/tools/tool-display";
import { READABLE_MAX_WIDTH } from "@/utils/layout";

export default function ToolsScreen() {
  const { registeredTools } = useTools();
  const { isWide } = useBreakpoint();
  const showTechnicalDetails = useSettingsStore((s) => s.showTechnicalDetails);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const registered = new Set(registeredTools.map((t) => t.name));
  const tools = TOOL_DISPLAY.filter((t) => registered.has(t.name));

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.column, isWide && styles.columnWide]}>
        <Text style={styles.title}>What you can ask</Text>
        <Text style={styles.intro}>Type or say it in Chat, in your own words. For example:</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {tools.map((tool) => {
            const off = tool.online && !webSearchEnabled;
            return (
              <View key={tool.name} style={styles.tool}>
                <Ionicons name={tool.icon} size={22} color="#93c5fd" style={styles.icon} />
                <View style={styles.toolText}>
                  <Text style={styles.toolName}>{tool.title}</Text>
                  <Text style={styles.example}>“{tool.example}”</Text>
                  <Text style={styles.toolDesc}>
                    {tool.description}
                    {tool.online ? (off ? " Turned off in Settings." : " Needs internet.") : ""}
                  </Text>
                  {showTechnicalDetails ? <Text style={styles.toolId}>{tool.name}</Text> : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16 },
  column: { flex: 1 },
  columnWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center" },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  intro: { color: "#9ca3af", marginBottom: 10 },
  scroll: { flex: 1 },
  scrollContent: { gap: 10, paddingBottom: 24 },
  tool: { flexDirection: "row", gap: 12, backgroundColor: "#111827", borderRadius: 12, padding: 12 },
  icon: { marginTop: 1 },
  toolText: { flex: 1, gap: 3 },
  toolName: { color: "#e5e7eb", fontWeight: "700" },
  example: { color: "#93c5fd" },
  toolDesc: { color: "#9ca3af", fontSize: 13 },
  toolId: { color: "#6b7280", fontSize: 11, fontFamily: "monospace" },
});
