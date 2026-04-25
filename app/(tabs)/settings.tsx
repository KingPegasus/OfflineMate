import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec, MODEL_TIERS } from "@/ai/model-registry";

export default function SettingsScreen() {
  const router = useRouter();
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const setWebSearchEnabled = useSettingsStore((s) => s.setWebSearchEnabled);
  const tierSpec = getTierSpec(selectedTier);
  const appVersion = Constants.expoConfig?.version ?? "unknown";

  return (
    <SafeAreaView style={styles.root}>
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
        Voice replies: {voiceEnabled ? "On" : "Off"}
      </Text>
      <Text style={styles.link} onPress={() => setWebSearchEnabled(!webSearchEnabled)}>
        Web search: {webSearchEnabled ? "On" : "Off"}
      </Text>
      <Text style={styles.versionLabel}>App version: {appVersion}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16 },
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
  versionLabel: { marginTop: 20, color: "#9ca3af", fontSize: 12 },
});

