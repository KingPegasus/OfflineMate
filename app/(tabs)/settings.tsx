import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSettingsStore } from "@/stores/settings-store";
import { getModelsForTier, getTierSpec, MODEL_TIERS, resolveModelForTier } from "@/ai/model-registry";
import {
  downloadTierChatModel,
  downloadTierVoiceModel,
  getTierChatAssetReadiness,
  getTierVoiceDownloadMb,
  redownloadTierChatModel,
} from "@/ai/model-manager";
import { useChatStore } from "@/stores/chat-store";
import { clearImportantMemories, countImportantMemories } from "@/context/long-term-memory";
import { getStoreListingUrl, openStoreListingForRating } from "@/stores/review-store";
import { llmEngine } from "@/ai/llm-engine";
import type { ModelTier } from "@/types/assistant";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { DIALOG_MAX_WIDTH, READABLE_MAX_WIDTH } from "@/utils/layout";

function safeMemoryCount(): number {
  try {
    return countImportantMemories();
  } catch {
    return 0;
  }
}

/** What each Settings option does, shown from its info button. Keep in step with docs/legal/privacy-policy.md. */
const SETTING_INFO = {
  onboarding: {
    title: "Open Onboarding",
    body: "Runs the first-time setup again: pick a tier and download its model. Your chats, notes and settings stay.",
  },
  tts: {
    title: "Speak responses (TTS)",
    body: "Reads each reply aloud with your phone's built-in voice. Off by default. Depending on your phone and voice settings, the voice provider may process the text online.",
  },
  webSearch: {
    title: "Web search and weather",
    body: "When on, questions that need current information are looked up online. Web searches go to DuckDuckGo, and the query can be your whole message. Weather questions send only the place name to Open-Meteo. On by default. Turn it off to keep every request on this device.",
  },
  history: {
    title: "Persist chat history",
    body: "When on, your chats are saved on this device and are still there after you close the app. When off (the default), chats are cleared when the app closes, and turning it off deletes saved chats. Nothing is uploaded either way.",
  },
  clear: {
    title: "Clear chats and memories",
    body: "Deletes all chats and every saved memory on this device. Memories are messages that start with \"remember\" (for example \"remember my locker code is 42\"); OfflineMate keeps them for later answers even when chat history is off. Notes aren't affected. To delete one chat, use Open chats in the Chat tab.",
  },
  rate: {
    title: "Rate OfflineMate",
    body: "Opens OfflineMate's Google Play page so you can rate or review it.",
  },
} as const;

/** A tappable setting with an info button that explains it. */
function SettingRow({ label, info, onPress }: { label: string; info: { title: string; body: string }; onPress: () => void }) {
  return (
    <View style={styles.settingRow}>
      <Text style={[styles.link, styles.settingLabel]} onPress={onPress} accessibilityRole="button">
        {label}
      </Text>
      <Pressable
        onPress={() => Alert.alert(info.title, info.body)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`About ${info.title}`}
        style={styles.infoButton}
      >
        <Ionicons name="information-circle-outline" size={20} color="#9ca3af" />
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isWide } = useBreakpoint();
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
  const clearAllConversations = useChatStore((s) => s.clearAllConversations);
  const [memoryCount, setMemoryCount] = useState(0);
  // Re-count when the tab is shown: "remember ..." messages add memories from the Chat tab.
  useFocusEffect(
    useCallback(() => {
      setMemoryCount(safeMemoryCount());
    }, []),
  );
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
  const canRateApp = getStoreListingUrl() !== null;
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

  // Chat's model error links here with ?tier=<key>: open that tier's picker so the user can download.
  const { tier: tierParam, at: tierParamAt } = useLocalSearchParams<{ tier?: string; at?: string }>();
  useEffect(() => {
    if (!tierParam) return;
    const target = MODEL_TIERS.find((t) => t.key === tierParam)?.key;
    const timeoutId = setTimeout(() => {
      if (target) handleOpenTierPicker(target);
      // Clear the params; `at` (a timestamp per tap) also re-triggers this effect if clearing is ignored.
      router.setParams({ tier: undefined, at: undefined } as never);
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per incoming link
  }, [tierParam, tierParamAt]);

  const handleSelectModelInModal = (tier: ModelTier, modelId: string) => {
    if (isDownloadingSelected) return;
    const spec = getTierSpec(tier);
    const currentId = tierModelIds[tier] ?? null;
    const nextId = modelId === spec.primary.id ? null : modelId;
    if (nextId === currentId || (nextId === null && currentId === null)) return;
    llmEngine.cancelPendingLoad();
    setTierModelId(tier, nextId);
  };

  const handleDownloadModalModel = async (redownload = false) => {
    if ((modalSelectedReady && !redownload) || isDownloadingSelected) return;
    setIsDownloadingSelected(true);
    setDownloadProgress(0);
    setDownloadLabel("");
    try {
      const onProgress = (progress: number, label?: string) => {
        setDownloadProgress(progress);
        setDownloadLabel(label ?? "");
      };
      if (redownload) {
        // Free the model before deleting its files.
        llmEngine.cancelPendingLoad();
        llmEngine.unload();
        // Files are deleted first; show that instead of a stale "Downloaded" badge.
        setModelReadinessByTier((prev) => ({
          ...prev,
          [modalTier]: { ...prev[modalTier], [modalActiveModel.id]: false },
        }));
        await redownloadTierChatModel(modalTier, modalActiveModelId ?? null, onProgress);
      } else {
        await downloadTierChatModel(modalTier, modalActiveModelId ?? null, onProgress);
      }
      // Tiers use different Whisper sizes; fetch this tier's now so the mic works offline later.
      // Independent of the TTS toggle (voiceEnabled), which only controls spoken replies.
      let voiceNote = "";
      try {
        await downloadTierVoiceModel(modalTier, (progress) => onProgress(progress, "voice model"));
      } catch (voiceError) {
        console.warn("[OfflineMate] Settings: voice model download failed", voiceError);
        voiceNote = " The voice input model did not download; the mic will offer to retry.";
      }
      await refreshReadinessForTier(modalTier);
      Alert.alert(
        "Model downloaded",
        `${modalActiveModel.family} ${modalActiveModel.size} is ready for chat.${voiceNote}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to download model files.";
      Alert.alert("Download failed", msg);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const handleClearChatsAndMemories = () => {
    const memories = safeMemoryCount();
    const what = memories > 0 ? `all chats and ${memories} saved ${memories === 1 ? "memory" : "memories"}` : "all chats";
    Alert.alert("Clear chats and memories", `Delete ${what} on this device? Notes aren't affected. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          clearAllConversations();
          try {
            clearImportantMemories();
          } catch (e) {
            console.warn("[OfflineMate] Settings: clearing memories failed", e);
          }
          setMemoryCount(safeMemoryCount());
        },
      },
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
              // All saved chats, not just the open one (the dialog promises "saved chats").
              clearAllConversations();
            },
          },
        ],
      );
      return;
    }
    setPersistChatHistory(true);
  };

  return (
    <SafeAreaView style={styles.root} edges={isWide ? ["top", "bottom"] : ["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isWide && styles.contentWide]} showsVerticalScrollIndicator={false}>
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
        <SettingRow label="Open Onboarding" info={SETTING_INFO.onboarding} onPress={() => router.push("/onboarding")} />
        <SettingRow
          label={`Speak responses (TTS): ${voiceEnabled ? "On" : "Off"}`}
          info={SETTING_INFO.tts}
          onPress={() => setVoiceEnabled(!voiceEnabled)}
        />
        <SettingRow
          label={`Web search and weather: ${webSearchEnabled ? "On" : "Off"}`}
          info={SETTING_INFO.webSearch}
          onPress={() => setWebSearchEnabled(!webSearchEnabled)}
        />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy and network boundaries</Text>
          <Text style={styles.sectionBody}>
            Core chat, retrieval, and tools run on device after models are downloaded. Network use is mainly for model
            downloads, and for web search (queries go to DuckDuckGo) and weather (only the place name goes to Open-Meteo).
            Both are on by default; turn off “Web search and weather” above to keep everything on this device.
          </Text>
          <Text style={styles.sectionBody}>
            Text-to-speech uses device OS voices and may use vendor online services.
          </Text>
        </View>

        <SettingRow
          label={`Persist chat history on device: ${persistChatHistory ? "On" : "Off"} (default Off)`}
          info={SETTING_INFO.history}
          onPress={handleTogglePersistHistory}
        />
        <SettingRow
          label={memoryCount > 0 ? `Clear chats and memories (${memoryCount} saved)` : "Clear chats and memories"}
          info={SETTING_INFO.clear}
          onPress={handleClearChatsAndMemories}
        />
        {canRateApp ? (
          <SettingRow
            label="Rate OfflineMate"
            info={SETTING_INFO.rate}
            onPress={() => {
              void openStoreListingForRating().then((opened) => {
                if (!opened) Alert.alert("Couldn't open the store", "Search for OfflineMate in Google Play to rate it.");
              });
            }}
          />
        ) : null}
        <Text style={styles.versionLabel}>App version: {appVersion}</Text>
      </ScrollView>

      <Modal
        transparent
        visible={modelPickerTier !== null}
        animationType="slide"
        onRequestClose={() => setModelPickerTier(null)}
      >
        <View style={[styles.modalBackdrop, isWide && styles.modalBackdropWide]}>
          <View style={[styles.modalCard, isWide && styles.modalCardWide]}>
            <Text style={styles.modalTitle}>{modalTierSpec.name} model options</Text>
            <Text style={styles.modalHint}>
              Pick a model for {modalTierSpec.name}, then tap Download now if it is not downloaded yet.
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
            {modalSelectedReady && !isDownloadingSelected && (
              <Text
                style={styles.modalAction}
                onPress={() =>
                  Alert.alert(
                    "Re-download model",
                    `Delete and download ${modalActiveModel.family} ${modalActiveModel.size} again (${modalActiveModel.estimatedSizeMb} MB)? Use this if chat says the model could not load.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Re-download", onPress: () => void handleDownloadModalModel(true) },
                    ],
                  )
                }
              >
                Re-download (fixes a damaged download)
              </Text>
            )}
            {(!modalSelectedReady || isDownloadingSelected) && (
              <Text
                style={[styles.modalAction, isDownloadingSelected && styles.disabledLink]}
                onPress={() => void handleDownloadModalModel()}
              >
                {isDownloadingSelected
                  ? `Downloading... ${Math.round(downloadProgress * 100)}%${
                      downloadLabel ? ` (${downloadLabel})` : ""
                    }`
                  : `Download now (${modalActiveModel.estimatedSizeMb} MB + ${getTierVoiceDownloadMb(modalTier)} MB voice)`}
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
  contentWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center", paddingTop: 24 },
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
  settingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingLabel: { flex: 1 },
  infoButton: { marginTop: 16, padding: 2 },
  disabledLink: { color: "#64748b" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modalBackdropWide: { alignItems: "center" },
  modalCardWide: { width: "100%", maxWidth: DIALOG_MAX_WIDTH, padding: 20 },
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

