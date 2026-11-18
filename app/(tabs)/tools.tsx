import { useRef } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTools } from "@/hooks/useTools";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSettingsStore } from "@/stores/settings-store";
import { HELP_TOPICS, TOOL_DISPLAY } from "@/tools/tool-display";
import { READABLE_MAX_WIDTH } from "@/utils/layout";

/** The Help tab: what you can ask (tap one to try it in Chat), then short answers to common questions. */
export default function HelpScreen() {
  const router = useRouter();
  const { registeredTools } = useTools();
  const { isWide } = useBreakpoint();
  const showTechnicalDetails = useSettingsStore((s) => s.showTechnicalDetails);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const registered = new Set(registeredTools.map((t) => t.name));
  const tools = TOOL_DISPLAY.filter((t) => registered.has(t.name));

  const taps = useRef(0);
  const tryExample = (example: string) => {
    // `at` makes every tap a new param value, so Chat fills the box even when the text repeats.
    taps.current += 1;
    router.push({ pathname: "/chat", params: { prompt: example, at: String(taps.current) } } as never);
  };

  return (
    // The header covers the top inset and the tab bar the bottom one; only the side rail layout needs the bottom.
    <SafeAreaView style={styles.root} edges={isWide ? ["bottom"] : []}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text style={styles.title}>What you can ask</Text>
        <Text style={styles.intro}>Type or say it in your own words. Tap one to try it.</Text>
        {tools.map((tool) => {
          const off = tool.online && !webSearchEnabled;
          return (
            <Pressable
              key={tool.name}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => tryExample(tool.example)}
              accessibilityRole="button"
              accessibilityHint="Opens Chat with this example in the message box"
            >
              <Ionicons name={tool.icon} size={22} color="#93c5fd" style={styles.icon} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{tool.title}</Text>
                <Text style={styles.example}>“{tool.example}”</Text>
                <Text style={styles.cardBody}>
                  {tool.description}
                  {tool.online ? (off ? " Turned off in Settings." : " Needs internet.") : ""}
                </Text>
                {showTechnicalDetails ? <Text style={styles.toolId}>{tool.name}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#4b5563" />
            </Pressable>
          );
        })}

        <Text style={[styles.title, styles.sectionGap]}>Good to know</Text>
        {HELP_TOPICS.map((topic) => (
          <View key={topic.title} style={styles.card}>
            <Ionicons name={topic.icon} size={22} color="#93c5fd" style={styles.icon} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{topic.title}</Text>
              <Text style={styles.cardBody}>{topic.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  content: { padding: 16, gap: 10 },
  contentWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center", paddingTop: 24 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700" },
  sectionGap: { marginTop: 14 },
  intro: { color: "#9ca3af", marginBottom: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#111827", borderRadius: 12, padding: 12 },
  pressed: { backgroundColor: "#1f2937" },
  icon: { alignSelf: "flex-start", marginTop: 1 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { color: "#e5e7eb", fontWeight: "700" },
  example: { color: "#93c5fd" },
  cardBody: { color: "#9ca3af", fontSize: 13, lineHeight: 18 },
  toolId: { color: "#6b7280", fontSize: 11, fontFamily: "monospace" },
});
