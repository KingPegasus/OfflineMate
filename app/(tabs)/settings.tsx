import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec, MODEL_TIERS } from "@/ai/model-registry";
import { useChatStore } from "@/stores/chat-store";

export default function SettingsScreen() {
  const router = useRouter();
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const setWebSearchEnabled = useSettingsStore((s) => s.setWebSearchEnabled);
  const persistChatHistory = useSettingsStore((s) => s.persistChatHistory);
  const setPersistChatHistory = useSettingsStore((s) => s.setPersistChatHistory);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const tierSpec = getTierSpec(selectedTier);
  const appVersion = Constants.expoConfig?.version ?? "unknown";

  const handleClearCurrentChat = () => {
    Alert.alert("Clear current chat", "Delete this chat permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: clearMessages },
    ]);
  };
  const handleTogglePersistHistory = () => {
    if (persistChatHistory) {
      Alert.alert(
        "Turn off chat history",
        "Turning this off will clear saved chats on this device. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Turn off & clear",
            style: "destructive",
            onPress: () => {
              setPersistChatHistory(false);
              clearMessages();
            },
          },
        ],
      );
      return;
    }
    setPersistChatHistory(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Model Tier</Text>
        <View style={styles.activeModelCard}>
          <Text style={styles.activeLabel}>Active model</Text>
          <Text style={styles.activeValue}>
            {tierSpec.name} - {tierSpec.primary.family} {tierSpec.primary.size} ({tierSpec.primary.id})
          </Text>
        </View>
        <View style={styles.section}>
          {MODEL_TIERS.map((tier) => (
            <Text
              key={tier.key}
              style={[styles.item, tier.key === selectedTier && styles.selected]}
              onPress={() => setTier(tier.key)}
            >
              {tier.name} - {tier.targetRam}
            </Text>
          ))}
        </View>
        <Text style={styles.link} onPress={() => router.push("/onboarding")}>
          Open Onboarding
        </Text>
        <Text style={styles.link} onPress={() => setVoiceEnabled(!voiceEnabled)}>
          Speak responses (TTS): {voiceEnabled ? "On" : "Off"}
        </Text>
        <Text style={styles.link} onPress={() => setWebSearchEnabled(!webSearchEnabled)}>
          Web search fallback: {webSearchEnabled ? "On" : "Off"}
        </Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy and network boundaries</Text>
          <Text style={styles.sectionBody}>
            Core chat, retrieval, and tools run on device after models are downloaded. Network use is mainly for model
            downloads and optional web search.
          </Text>
          <Text style={styles.sectionBody}>
            Text-to-speech uses device OS voices and may use vendor online services.
          </Text>
        </View>

        <Text
          style={styles.link}
          onPress={handleTogglePersistHistory}
        >
          Persist chat history on device: {persistChatHistory ? "On" : "Off"} (default Off)
        </Text>
        <Text style={styles.link} onPress={handleClearCurrentChat}>
          Clear current chat
        </Text>
        <Text style={styles.versionLabel}>App version: {appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  activeModelCard: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  activeLabel: { color: "#93c5fd", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  activeValue: { color: "#e5e7eb", fontSize: 14, fontWeight: "600" },
  section: { gap: 8 },
  item: { color: "#9ca3af", backgroundColor: "#111827", borderRadius: 10, padding: 10 },
  selected: { color: "#60a5fa", borderWidth: 1, borderColor: "#60a5fa" },
  link: { marginTop: 16, color: "#93c5fd", fontWeight: "600" },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  sectionTitle: { color: "#e5e7eb", fontWeight: "700" },
  sectionBody: { color: "#9ca3af", fontSize: 12, lineHeight: 18 },
  versionLabel: { marginTop: 20, color: "#9ca3af", fontSize: 12 },
});

