import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";
import { getDeviceTierRecommendation } from "@/utils/device-profiler";
import { MODEL_TIERS } from "@/ai/model-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelDownloader } from "@/components/ModelDownloader";

export default function OnboardingScreen() {
  const router = useRouter();
  const [recommended, setRecommended] = useState<"lite" | "standard" | "full">("standard");
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  useEffect(() => {
    void getDeviceTierRecommendation().then(setRecommended);
  }, []);

  const recommendedTier = useMemo(
    () => MODEL_TIERS.find((it) => it.key === recommended) ?? MODEL_TIERS[1],
    [recommended],
  );
  const selectedTierSpec = useMemo(
    () => MODEL_TIERS.find((it) => it.key === selectedTier) ?? MODEL_TIERS[1],
    [selectedTier],
  );

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.h1}>Welcome to OfflineMate</Text>
      <Text style={styles.body}>
        Recommended tier: {recommendedTier.name} ({recommendedTier.targetRam})
      </Text>
      <Text style={styles.body}>Selected download size: {selectedTierSpec.estimatedDownload}</Text>
      <View style={styles.buttons}>
        {MODEL_TIERS.map((item) => (
          <Text
            key={item.key}
            style={[styles.btn, selectedTier === item.key && styles.selected]}
            onPress={() => setTier(item.key)}
          >
            Choose {item.name}
          </Text>
        ))}
      </View>
      <Text style={styles.note}>
        Model download manager and resumable download flow will run after base setup.
      </Text>
      <ModelDownloader tier={selectedTier} />
      <Text
        style={styles.continue}
        onPress={() => {
          completeOnboarding();
          router.replace("/chat");
        }}
      >
        Continue to Chat
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030712", padding: 20, gap: 12 },
  h1: { color: "#e5e7eb", fontSize: 26, fontWeight: "800" },
  body: { color: "#9ca3af" },
  buttons: { gap: 8, marginTop: 6 },
  btn: { color: "#93c5fd", backgroundColor: "#111827", borderRadius: 10, padding: 10 },
  selected: { borderWidth: 1, borderColor: "#60a5fa", color: "#60a5fa" },
  note: { marginTop: 6, color: "#6b7280" },
  continue: {
    marginTop: 8,
    color: "#e5e7eb",
    backgroundColor: "#2563eb",
    borderRadius: 10,
    textAlign: "center",
    fontWeight: "700",
    paddingVertical: 12,
  },
});

