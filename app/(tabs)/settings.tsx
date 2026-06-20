import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSettingsStore } from "@/stores/settings-store";
import { getModelsForTier, getTierSpec, MODEL_TIERS, resolveModelForTier } from "@/ai/model-registry";
import { downloadTierChatModel, getTierChatAssetReadiness } from "@/ai/model-manager";
import { useChatStore } from "@/stores/chat-store";
import { llmEngine } from "@/ai/llm-engine";
import type { ModelTier } from "@/types/assistant";

export default function SettingsScreen() {
  const router = useRouter();
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const tierModelIds = useSettingsStore((s) => s.tierModelIds);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const setTierModelId = useSettingsStore((s) => s.setTierModelId);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const setWebSearchEnabled = useSettingsStore((s) => s.setWebSearchEnabled);
  const persistChatHistory = useSettingsStore((s) => s.persistChatHistory);
  const setPersistChatHistory = useSettingsStore((s) => s.setPersistChatHistory);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const tierSpec = getTierSpec(selectedTier);
  const activeModelId = tierModelIds[selectedTier] ?? null;
  const activeModel = resolveModelForTier(selectedTier, activeModelId);
  const [modelReadinessByTier, setModelReadinessByTier] = useState<
    Record<ModelTier, Record<string, boolean>>
  >({
    lite: {},
    standard: {},
    full: {},
  });
  const [isCheckingReadinessTier, setIsCheckingReadinessTier] = useState<ModelTier | null>(null);
  const [modelPickerTier, setModelPickerTier] = useState<ModelTier | null>(null);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState<string>("");
  const [lastReadinessCheckByTier, setLastReadinessCheckByTier] = useState<Record<ModelTier, Date | null>>({
    lite: null,
    standard: null,
    full: null,
  });
  const appVersion = Constants.expoConfig?.version ?? "unknown";
  const modalTier = modelPickerTier ?? selectedTier;
  const modalTierSpec = getTierSpec(modalTier);
  const modalModels = getModelsForTier(modalTier);
  const modalActiveModelId = tierModelIds[modalTier] ?? null;
  const modalReadiness = modelReadinessByTier[modalTier];
  const modalActiveModel = resolveModelForTier(modalTier, modalActiveModelId);
  const modalSelectedReady = modalReadiness[modalActiveModel.id] ?? false;
  const isCheckingReadiness = isCheckingReadinessTier === modalTier;

  const refreshReadinessForTier = useCallback(async (tier: ModelTier) => {
    setIsCheckingReadinessTier(tier);
    try {
      const spec = getTierSpec(tier);
      const models = getModelsForTier(tier);
      const checks = await Promise.all(
        models.map(async (model) => {
          const readiness = await getTierChatAssetReadiness(
            tier,
            model.id === spec.primary.id ? null : model.id,
          );
          return [model.id, readiness.ready] as const;
        }),
      );
      setModelReadinessByTier((prev) => ({ ...prev, [tier]: Object.fromEntries(checks) }));
      setLastReadinessCheckByTier((prev) => ({ ...prev, [tier]: new Date() }));
    } finally {
      setIsCheckingReadinessTier((curr) => (curr === tier ? null : curr));
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void refreshReadinessForTier(selectedTier);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [refreshReadinessForTier, selectedTier]);

  const handleOpenTierPicker = (tier: ModelTier) => {
    if (isDownloadingSelected) return;
    setTier(tier);
    setModelPickerTier(tier);
    void refreshReadinessForTier(tier);
  };

  const handleSelectModelInModal = (tier: ModelTier, modelId: string) => {
    if (isDownloadingSelected) return;
    const spec = getTierSpec(tier);
    const currentId = tierModelIds[tier] ?? null;
    const nextId = modelId === spec.primary.id ? null : modelId;
    if (nextId === currentId || (nextId === null && currentId === null)) return;
    llmEngine.cancelPendingLoad();
    setTierModelId(tier, nextId);
  };

  const handleDownloadModalModel = async () => {
    if (modalSelectedReady || isDownloadingSelected) return;
    setIsDownloadingSelected(true);
    setDownloadProgress(0);
    setDownloadLabel("");
    try {
      await downloadTierChatModel(modalTier, modalActiveModelId ?? null, (progress, label) => {
        setDownloadProgress(progress);
        setDownloadLabel(label ?? "");
      });
      await refreshReadinessForTier(modalTier);
      Alert.alert("Model downloaded", `${modalActiveModel.family} ${modalActiveModel.size} is ready for chat.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to download model files.";
      Alert.alert("Download failed", msg);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

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
            {tierSpec.name} - {activeModel.family} {activeModel.size} ({activeModel.id})
          </Text>
        </View>
        <Text style={styles.hint}>Tap a tier to choose a model for that tier.</Text>
        <View style={styles.section}>
          {MODEL_TIERS.map((tier) => {
            const tierActiveModelId = tierModelIds[tier.key] ?? null;
            const tierActiveModel = resolveModelForTier(tier.key, tierActiveModelId);
            return (
              <Pressable
                key={tier.key}
                style={[styles.item, tier.key === selectedTier && styles.selected]}
                onPress={() => handleOpenTierPicker(tier.key)}
              >
                <Text style={styles.itemTitle}>{tier.name} - {tier.targetRam}</Text>
                <Text style={styles.itemSubtitle}>
                  {tierActiveModel.family} {tierActiveModel.size}
                  {tierActiveModel.id === tier.primary.id ? " (default)" : " (custom)"}
                </Text>
              </Pressable>
            );
          })}
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

      <Modal
        transparent
        visible={modelPickerTier !== null}
        animationType="slide"
        onRequestClose={() => setModelPickerTier(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTierSpec.name} model options</Text>
            <Text style={styles.modalHint}>
              Pick a model for {modalTierSpec.name}. Non-default variants can be downloaded now.
            </Text>
            <Text style={styles.modalHint}>
              Last checked: {lastReadinessCheckByTier[modalTier]?.toLocaleTimeString() ?? "Not checked yet"}
            </Text>
            <Text
              style={[styles.modalAction, (isCheckingReadiness || isDownloadingSelected) && styles.disabledLink]}
              onPress={() => {
                if (isCheckingReadiness || isDownloadingSelected) return;
                void refreshReadinessForTier(modalTier);
              }}
            >
              {isCheckingReadiness ? "Refreshing readiness..." : "Refresh readiness"}
            </Text>
            <View style={styles.modalOptions}>
              {modalModels.map((model) => {
                const isPrimary = model.id === modalTierSpec.primary.id;
                const isSelected =
                  (modalActiveModelId === null && isPrimary) || modalActiveModelId === model.id;
                const ready = modalReadiness[model.id];
                const readinessBadge = isCheckingReadiness && ready === undefined
                  ? "Checking..."
                  : ready
                    ? "Downloaded"
                    : "Not downloaded";
                return (
                  <Pressable
                    key={model.id}
                    style={[styles.modalOption, isSelected && styles.selected]}
                    onPress={() => handleSelectModelInModal(modalTier, model.id)}
                  >
                    <Text style={styles.modalOptionTitle}>
                      {model.family} {model.size}{isPrimary ? " (default)" : ""}
                    </Text>
                    <Text style={styles.modalOptionMeta}>{readinessBadge}</Text>
                  </Pressable>
                );
              })}
            </View>
            {!modalSelectedReady && (
              <Text
                style={[styles.modalAction, isDownloadingSelected && styles.disabledLink]}
                onPress={() => void handleDownloadModalModel()}
              >
                {isDownloadingSelected
                  ? `Downloading... ${Math.round(downloadProgress * 100)}%${
                      downloadLabel ? ` (${downloadLabel})` : ""
                    }`
                  : `Download now (${modalActiveModel.estimatedSizeMb} MB)`}
              </Text>
            )}
            <Text style={styles.modalClose} onPress={() => setModelPickerTier(null)}>
              Done
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { color: "#e5e7eb", fontSize: 16, fontWeight: "600", marginTop: 4, marginBottom: 8 },
  hint: { color: "#9ca3af", fontSize: 12, lineHeight: 18, marginBottom: 8 },
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
  item: { backgroundColor: "#111827", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#1f2937" },
  itemTitle: { color: "#e5e7eb", fontWeight: "700" },
  itemSubtitle: { color: "#9ca3af", marginTop: 4, fontSize: 12 },
  selected: { borderWidth: 1, borderColor: "#60a5fa" },
  link: { marginTop: 16, color: "#93c5fd", fontWeight: "600" },
  disabledLink: { color: "#64748b" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    maxHeight: "85%",
  },
  modalTitle: { color: "#e5e7eb", fontSize: 18, fontWeight: "700" },
  modalHint: { color: "#9ca3af", fontSize: 12, lineHeight: 18 },
  modalOptions: { gap: 8, marginTop: 4 },
  modalOption: {
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalOptionTitle: { color: "#e5e7eb", fontWeight: "700" },
  modalOptionMeta: { color: "#9ca3af", marginTop: 4, fontSize: 12 },
  modalAction: { color: "#93c5fd", fontWeight: "600", marginTop: 6 },
  modalClose: { color: "#cbd5e1", fontWeight: "700", textAlign: "right", marginTop: 8 },
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

