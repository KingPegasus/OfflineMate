import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDeviceRamGb, getDeviceTierRecommendation } from "@/utils/device-profiler";
import {
  getModelsForTier,
  getTierSpec,
  MODEL_TIERS,
  modelDisplayName,
  modelSupportsVision,
  resolveModelForTier,
} from "@/ai/model-registry";
import { getTierAssets } from "@/ai/model-manager";
import { VisionBadge } from "@/components/VisionBadge";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelDownloader } from "@/components/ModelDownloader";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { READABLE_MAX_WIDTH } from "@/utils/layout";
import { formatBytes } from "@/utils/download-format";
import { describePhoneRam, describeRecommendation } from "@/utils/tier-recommendation";
import type { ModelTier } from "@/types/assistant";

/** Everything the first download fetches for a tier and model: chat, voice input and notes search. */
function totalDownloadBytes(tier: ModelTier, modelId: string | null): number {
  return getTierAssets(tier, modelId).reduce((sum, asset) => sum + asset.estimatedBytes, 0);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { isWide } = useBreakpoint();
  const [recommended, setRecommended] = useState<ModelTier | null>(null);
  const [phoneRamGb, setPhoneRamGb] = useState<number | null>(null);
  const [isSelectedTierReady, setIsSelectedTierReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const selectedModelId = useSettingsStore((s) => s.tierModelIds[selectedTier] ?? null);
  const setTierModelId = useSettingsStore((s) => s.setTierModelId);
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  // Only the first setup follows the recommendation; running setup again from Settings keeps the user's choice.
  const followRecommendation = useRef(!hasCompletedOnboarding);

  useEffect(() => {
    void getDeviceRamGb()
      .then(setPhoneRamGb)
      .catch(() => setPhoneRamGb(null));
    void getDeviceTierRecommendation().then((tier) => {
      setRecommended(tier);
      if (followRecommendation.current) setTier(tier);
    });
  }, [setTier]);

  const tierSpec = getTierSpec(selectedTier);
  const activeModel = resolveModelForTier(selectedTier, selectedModelId);
  // The default can also be saved by id (picked from the list, or saved before it became the default).
  const usesDefaultModel = activeModel.id === tierSpec.primary.id;
  const isRecommended = recommended === selectedTier && usesDefaultModel;
  const headline = describeRecommendation(tierSpec.label, formatBytes(totalDownloadBytes(selectedTier, selectedModelId)));

  const chooseTier = (tier: ModelTier) => {
    if (isDownloading) return;
    followRecommendation.current = false;
    setTier(tier);
  };

  const chooseModel = (modelId: string) => {
    if (isDownloading) return;
    followRecommendation.current = false;
    // Same convention as Settings: the tier default is stored as null.
    setTierModelId(selectedTier, modelId === tierSpec.primary.id ? null : modelId);
  };

  return (
    // The Setup header already sits below the status bar, so only pad the other edges.
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text style={styles.h1}>Welcome to OfflineMate</Text>
        <Text style={styles.body}>
          Your assistant runs on this phone, so your chats stay private and work without internet. It needs a one-time
          download first.
        </Text>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>{isRecommended ? "Recommended for your phone" : "Your choice"}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.body}>
            {usesDefaultModel ? tierSpec.summary : `Uses ${modelDisplayName(activeModel)}.`}
            {modelSupportsVision(activeModel) ? " Can also look at your photos." : ""}
          </Text>
          <ModelDownloader
            tier={selectedTier}
            modelId={selectedModelId}
            onReadinessChange={setIsSelectedTierReady}
            onDownloadingChange={setIsDownloading}
          />
        </View>

        <Pressable
          onPress={() => setShowChoices((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showChoices }}
          style={styles.choiceToggle}
        >
          <Text style={styles.link}>{showChoices ? "Hide other choices" : "Choose a different model"}</Text>
          <Ionicons name={showChoices ? "chevron-up" : "chevron-down"} size={16} color="#93c5fd" />
        </Pressable>

        {showChoices ? (
          <View style={styles.choices}>
            <Text style={styles.legendText}>
              Smaller is faster; bigger is smarter but needs more memory (RAM).
              {describePhoneRam(phoneRamGb) ? ` ${describePhoneRam(phoneRamGb)}` : ""}
            </Text>
            <View style={styles.sizeRow}>
              {MODEL_TIERS.map((tier) => {
                const selected = tier.key === selectedTier;
                return (
                  <Pressable
                    key={tier.key}
                    onPress={() => chooseTier(tier.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${tier.label}, for phones with ${tier.ramLabel}${tier.key === recommended ? ", recommended" : ""}`}
                    accessibilityState={{ selected, disabled: isDownloading }}
                    style={[styles.sizeCell, selected && styles.optionSelected, isDownloading && styles.disabled]}
                  >
                    <Text style={styles.optionTitle}>{tier.label}</Text>
                    {/* RAM, not download size: Balanced and Smartest download the same model. */}
                    <Text style={styles.meta}>{tier.ramLabel}</Text>
                    {tier.key === recommended ? <Text style={styles.tag}>Recommended</Text> : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setShowAllModels(true)} accessibilityRole="button" style={styles.choiceToggle}>
              <Text style={styles.link}>See every model for {tierSpec.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#93c5fd" />
            </Pressable>
          </View>
        ) : null}

        <Modal
          transparent
          visible={showAllModels}
          animationType="slide"
          onRequestClose={() => setShowAllModels(false)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={[styles.sheet, isWide && styles.sheetWide]}>
              <Text style={styles.sheetTitle}>{tierSpec.label}: every model</Text>
              <View style={styles.legendRow}>
                <VisionBadge size={14} />
                <Text style={styles.legendText}>Can look at photos. You can change this any time in Settings.</Text>
              </View>
              <ScrollView contentContainerStyle={styles.sheetList}>
                {getModelsForTier(selectedTier).map((model) => {
                  const selected = model.id === activeModel.id;
                  return (
                    <Pressable
                      key={model.id}
                      onPress={() => chooseModel(model.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: isDownloading }}
                      style={[styles.option, selected && styles.optionSelected, isDownloading && styles.disabled]}
                    >
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>
                          {modelDisplayName(model)}
                          {model.id === tierSpec.primary.id ? " (recommended)" : ""}
                        </Text>
                        {modelSupportsVision(model) ? <VisionBadge size={14} /> : null}
                        <Text style={styles.meta}>{formatBytes(model.estimatedSizeMb * 1024 * 1024)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable onPress={() => setShowAllModels(false)} accessibilityRole="button" style={styles.sheetDone}>
                <Text style={styles.continueText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {isDownloading ? (
          // Chat and voice need these files, so don't offer Chat until they're here (Cancel is on the
          // progress card). Leaving mid-download used to open Chat with nothing ready.
          <Text style={styles.waitNote}>
            You can start chatting as soon as the download finishes. Keep OfflineMate open until then.
          </Text>
        ) : (
          <>
            <Pressable
              style={[styles.continue, !isSelectedTierReady && styles.continueLater]}
              accessibilityRole="button"
              onPress={() => {
                completeOnboarding();
                router.replace("/chat");
              }}
            >
              <Text style={[styles.continueText, !isSelectedTierReady && styles.continueLaterText]}>
                {isSelectedTierReady ? "Start chatting" : "Skip for now"}
              </Text>
            </Pressable>
            {!isSelectedTierReady ? (
              <Text style={styles.note}>If you skip, chat will remind you to finish the download.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#030712" },
  content: { padding: 20, gap: 12 },
  contentWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center", paddingTop: 32 },
  h1: { color: "#e5e7eb", fontSize: 26, fontWeight: "800" },
  body: { color: "#9ca3af", lineHeight: 20 },
  card: { backgroundColor: "#111827", borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: "#1f2937" },
  eyebrow: { color: "#93c5fd", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  headline: { color: "#f9fafb", fontSize: 20, fontWeight: "800" },
  choiceToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  link: { color: "#93c5fd", fontWeight: "600" },
  choices: { gap: 8 },
  sizeRow: { flexDirection: "row", gap: 8 },
  sizeCell: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#1f2937",
    alignItems: "center",
    gap: 4,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
    maxHeight: "80%",
  },
  sheetWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center" },
  sheetTitle: { color: "#e5e7eb", fontSize: 18, fontWeight: "700" },
  sheetList: { gap: 8 },
  sheetDone: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { color: "#9ca3af", fontSize: 13 },
  option: { backgroundColor: "#111827", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1f2937", gap: 4 },
  optionSelected: { borderColor: "#60a5fa" },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  optionTitle: { color: "#e5e7eb", fontWeight: "700", flexShrink: 1 },
  tag: {
    color: "#0b1020",
    backgroundColor: "#93c5fd",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  disabled: { opacity: 0.5 },
  meta: { color: "#6b7280", fontSize: 12 },
  note: { color: "#6b7280", fontSize: 12 },
  waitNote: { color: "#cbd5e1", textAlign: "center", lineHeight: 20, marginTop: 4 },
  continue: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  continueText: { color: "#e5e7eb", fontWeight: "700" },
  continueLater: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#374151" },
  continueLaterText: { color: "#cbd5e1" },
});
