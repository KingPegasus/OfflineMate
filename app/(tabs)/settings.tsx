import { useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSettingsStore } from "@/stores/settings-store";
import { MODEL_TIERS } from "@/ai/model-registry";

export default function SettingsScreen() {
  const router = useRouter();
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Model Tier</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  section: { gap: 8 },
  item: { color: "#9ca3af", backgroundColor: "#111827", borderRadius: 10, padding: 10 },
  selected: { color: "#60a5fa", borderWidth: 1, borderColor: "#60a5fa" },
  link: { marginTop: 16, color: "#93c5fd", fontWeight: "600" },
});

