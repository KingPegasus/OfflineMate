import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getDeviceTierRecommendation } from "@/utils/device-profiler";
import { getModelsForTier, MODEL_TIERS, resolveModelForTier } from "@/ai/model-registry";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelDownloader } from "@/components/ModelDownloader";

export default function OnboardingScreen() {
  const router = useRouter();
  const [recommended, setRecommended] = useState<"lite" | "standard" | "full">("standard");
  const [isSelectedTierReady, setIsSelectedTierReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const selectedModelId = useSettingsStore((s) => s.tierModelIds[selectedTier] ?? null);
  const setTierModelId = useSettingsStore((s) => s.setTierModelId);
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
  const tierModels = useMemo(() => getModelsForTier(selectedTier), [selectedTier]);
  const activeModel = resolveModelForTier(selectedTier, selectedModelId);

  const handleSelectModel = (modelId: string) => {
    if (isDownloading) return;
    // Same convention as Settings: the tier default is stored as null.
    setTierModelId(selectedTier, modelId === selectedTierSpec.primary.id ? null : modelId);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Welcome to OfflineMate</Text>
        <Text style={styles.body}>
          Recommended tier: {recommendedTier.name} ({recommendedTier.targetRam})
        </Text>
        <Text style={styles.body}>
          Chat uses fully on-device generation after model files are downloaded. Downloads require internet one time
          per tier.
        </Text>
        <View style={styles.buttons}>
          {MODEL_TIERS.map((item) => (
            <Text
              key={item.key}
              style={[styles.btn, selectedTier === item.key && styles.selected, isDownloading && styles.disabled]}
              onPress={() => {
                if (!isDownloading) setTier(item.key);
              }}
            >
              Choose {item.name}
            </Text>
          ))}
        </View>
        <Text style={styles.h2}>{selectedTierSpec.name} model</Text>
        <View style={styles.buttons}>
          {tierModels.map((model) => {
            const isPrimary = model.id === selectedTierSpec.primary.id;
            return (
              <Text
                key={model.id}
                style={[
                  styles.btn,
                  model.id === activeModel.id && styles.selected,
                  isDownloading && styles.disabled,
                ]}
                onPress={() => handleSelectModel(model.id)}
              >
                {model.family} {model.size}
                {isPrimary ? " (default)" : ""}
                <Text style={styles.meta}>{`  ${model.estimatedSizeMb} MB`}</Text>
              </Text>
            );
          })}
        </View>
        <Text style={styles.note}>
          Download: {activeModel.estimatedSizeMb} MB chat model plus speech and search files. You can switch models later
          in Settings.
        </Text>
        <Text style={styles.note}>
          Status: {isSelectedTierReady ? "Chat-ready for selected model" : "Downloads still required for selected model"}
        </Text>
        <ModelDownloader
          tier={selectedTier}
          modelId={selectedModelId}
          onReadinessChange={setIsSelectedTierReady}
          onDownloadingChange={setIsDownloading}
        />
        <Text
          style={styles.continue}
          onPress={() => {
            completeOnboarding();
            router.replace("/chat");
          }}
        >
          {isSelectedTierReady ? "Continue to Chat" : "Continue to Chat (finish download later)"}
        </Text>
        {!isSelectedTierReady ? (
          <Text style={styles.note}>
            If you continue now, chat will show a model-readiness message and guide you back here to finish download.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, gap: 12 },
  h1: { color: "#e5e7eb", fontSize: 26, fontWeight: "800" },
  h2: { color: "#e5e7eb", fontSize: 16, fontWeight: "700", marginTop: 6 },
  body: { color: "#9ca3af" },
  buttons: { gap: 8, marginTop: 6 },
  btn: { color: "#93c5fd", backgroundColor: "#111827", borderRadius: 10, padding: 10 },
  selected: { borderWidth: 1, borderColor: "#60a5fa", color: "#60a5fa" },
  disabled: { opacity: 0.5 },
  meta: { color: "#6b7280", fontSize: 12 },
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
