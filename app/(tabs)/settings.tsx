import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VisionBadge } from "@/components/VisionBadge";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getModelsForTier,
  getActiveModelFileLabel,
  getTierSpec,
  MODEL_TIERS,
  modelDisplayName,
  modelSupportsVision,
  resolveModelForTier,
} from "@/ai/model-registry";
import {
  downloadTierChatAndVoice,
  getMissingDownloadBytes,
  getTierChatAndVoiceAssets,
  getTierChatAssets,
  getTierChatAssetReadiness,
  getTierVoiceDownloadMb,
} from "@/ai/model-manager";
import { DownloadProgressCard } from "@/components/DownloadProgressCard";
import { useModelDownload } from "@/hooks/useModelDownload";
import { formatBytes } from "@/utils/download-format";
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
    title: "Set up again",
    body: "Runs the first-time setup again: see the size recommended for your phone, or choose another, and download it. Your chats, notes and settings stay.",
  },
  tts: {
    title: "Read replies aloud",
    body: "Reads each reply aloud with your phone's built-in voice. Off by default. Depending on your phone and voice settings, the voice provider may process the text online.",
  },
  webSearch: {
    title: "Web search and weather",
    body: "When on, questions that need current information are looked up online. Web searches go to DuckDuckGo, and the query can be your whole message. Weather questions send only the place name to Open-Meteo. On by default. Turn it off to keep every request on this device.",
  },
  history: {
    title: "Keep chat history",
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
  privacy: {
    title: "Privacy and internet use",
    body: "Chat, notes, reminders and the other phone actions work on this phone once the download is done. The internet is used for downloads, web search (your question goes to DuckDuckGo) and weather (only the place name goes to Open-Meteo). Turn off \u201cWeb search and weather\u201d to keep everything on this phone. Reading replies aloud uses your phone's built-in voice, which may use an online service.",
  },
  technical: {
    title: "Show technical details",
    body: "Shows the reply speed under each answer (in tokens per second), the exact model name and id in Chat and Settings, and tool ids in the Tools tab. Off by default.",
  },
} as const;

type SettingInfo = { title: string; body: string };

function InfoButton({ info }: { info: SettingInfo }) {
  return (
    <Pressable
      onPress={() => Alert.alert(info.title, info.body)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`About ${info.title}`}
      style={styles.infoButton}
    >
      <Ionicons name="information-circle-outline" size={20} color="#9ca3af" />
    </Pressable>
  );
}

/** A tappable action with an info button that explains it. */
function SettingRow({ label, info, onPress, last }: { label: string; info: SettingInfo; onPress: () => void; last?: boolean }) {
  return (
    <View style={[styles.settingRow, last && styles.settingRowLast]}>
      <Text style={[styles.link, styles.settingLabel]} onPress={onPress} accessibilityRole="button">
        {label}
      </Text>
      <InfoButton info={info} />
    </View>
  );
}

/** An on/off option: the label and the switch both toggle it. */
function ToggleRow({
  label,
  value,
  info,
  onValueChange,
  last,
}: {
  label: string;
  value: boolean;
  info: SettingInfo;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, last && styles.settingRowLast]}>
      <Text style={[styles.toggleLabel, styles.settingLabel]} onPress={() => onValueChange(!value)}>
        {label}
      </Text>
      <InfoButton info={info} />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#374151", true: "#2563eb" }}
        thumbColor="#f9fafb"
        accessibilityLabel={label}
      />
    </View>
  );
}

/** One line of the "Your setup" summary. */
function SummaryLine({
  icon,
  text,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  tone?: "good" | "warn";
}) {
  const color = tone === "good" ? "#86efac" : tone === "warn" ? "#fcd34d" : "#9ca3af";
  return (
    <View style={styles.summaryLine}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.summaryText, tone && { color }]}>{text}</Text>
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
  const showTechnicalDetails = useSettingsStore((s) => s.showTechnicalDetails);
  const setShowTechnicalDetails = useSettingsStore((s) => s.setShowTechnicalDetails);
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
  const modelDownload = useModelDownload();
  const isDownloadingSelected = modelDownload.state.active;
  /** "Gemma 4 E2B", shown on the progress card even after the picker is closed. */
  const [downloadingTitle, setDownloadingTitle] = useState("");
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
  /** What "Download now" will fetch: only the files that are missing, the same figure the progress card uses. */
  const [modalBytesLeft, setModalBytesLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMissingDownloadBytes(getTierChatAndVoiceAssets(modalTier, modalActiveModelId)).then((bytes) => {
      if (!cancelled) setModalBytesLeft(bytes);
    });
    return () => {
      cancelled = true;
    };
  }, [modalTier, modalActiveModelId, modalSelectedReady, isDownloadingSelected]);

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
    const tier = modalTier;
    const model = modalActiveModel;
    const modelId = modalActiveModelId ?? null;
    setDownloadingTitle(`${model.family} ${model.size}`);
    let voiceFailed = false;
    const outcome = await modelDownload.start(
      getTierChatAndVoiceAssets(tier, modelId),
      async (onProgress) => {
        if (redownload) {
          // Free the model before deleting its files.
          llmEngine.cancelPendingLoad();
          llmEngine.unload();
          // Files are deleted first; show that instead of a stale "Downloaded" badge.
          setModelReadinessByTier((prev) => ({
            ...prev,
            [tier]: { ...prev[tier], [model.id]: false },
          }));
        }
        // Tiers use different Whisper sizes; fetch this tier's too so the mic works offline later.
        ({ voiceFailed } = await downloadTierChatAndVoice(tier, modelId, onProgress, { redownload }));
      },
      // A re-download deletes the chat files first, so the storage and mobile-data checks count them.
      { replacing: redownload ? getTierChatAssets(tier, modelId) : [] },
    );
    await refreshReadinessForTier(tier);
    if (outcome === "done") {
      const voiceNote = voiceFailed ? " Voice typing didn't download; tap the mic to try again." : "";
      Alert.alert("Ready to chat", `${model.family} ${model.size} is downloaded and works without internet.${voiceNote}`);
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
            setMemoryCount(0);
          } catch (e) {
            console.warn("[OfflineMate] Settings: clearing memories failed", e);
            setMemoryCount(safeMemoryCount());
          }
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

  const currentReady: boolean | undefined = modelReadinessByTier[selectedTier][activeModel.id];
  const assistantStatus =
    currentReady === undefined ? "Checking…" : currentReady ? "Downloaded · works without internet" : "Not downloaded yet";

  return (
    // The header already covers the status bar; padding the top again left an empty band.
    <SafeAreaView style={styles.root} edges={isWide ? ["bottom"] : []}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isWide && styles.contentWide]} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your setup</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <Ionicons name="sparkles-outline" size={24} color="#93c5fd" />
            <View style={styles.summaryHeadText}>
              <Text style={styles.summaryName}>{tierSpec.label} assistant</Text>
              <Text style={styles.summaryModel}>
                {modelDisplayName(activeModel)}
                {showTechnicalDetails ? ` (${activeModel.id})` : ""}
              </Text>
            </View>
          </View>
          <SummaryLine
            icon={currentReady ? "checkmark-circle-outline" : "cloud-download-outline"}
            text={assistantStatus}
            tone={currentReady ? "good" : currentReady === false ? "warn" : undefined}
          />
          {modelSupportsVision(activeModel) ? <SummaryLine icon="image-outline" text="Can look at photos" /> : null}
          {currentReady === false && !isDownloadingSelected ? (
            <Pressable style={styles.summaryButton} onPress={() => handleOpenTierPicker(selectedTier)} accessibilityRole="button">
              <Text style={styles.summaryButtonText}>Download now</Text>
            </Pressable>
          ) : null}
          <View style={styles.divider} />
          <SummaryLine
            icon="options-outline"
            text={[
              `Read aloud ${voiceEnabled ? "on" : "off"}`,
              `web search ${webSearchEnabled ? "on" : "off"}`,
              persistChatHistory ? "chats kept" : "chats cleared on close",
              ...(memoryCount > 0 ? [`${memoryCount} ${memoryCount === 1 ? "memory" : "memories"}`] : []),
            ].join(" · ")}
          />
        </View>
        {isDownloadingSelected && modelPickerTier === null ? (
          <DownloadProgressCard
            state={modelDownload.state}
            title={downloadingTitle}
            onCancel={modelDownload.cancel}
            style={styles.downloadCard}
          />
        ) : null}

        <Text style={[styles.title, styles.titleGap]}>Change settings</Text>
        <Text style={styles.groupTitle}>Assistant size</Text>
        <Text style={styles.hint}>Smaller is faster; bigger is smarter but needs a newer phone. Tap one to change it.</Text>
        <View style={styles.sizeRow}>
          {MODEL_TIERS.map((tier) => {
            const inUse = tier.key === selectedTier;
            return (
              <Pressable
                key={tier.key}
                style={[styles.sizeCell, inUse && styles.selected]}
                onPress={() => handleOpenTierPicker(tier.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: inUse }}
                accessibilityHint="Choose or download a model for this size"
              >
                <Text style={styles.itemTitle}>{tier.label}</Text>
                {inUse ? <Text style={styles.inUseTag}>In use</Text> : null}
                {showTechnicalDetails ? <Text style={styles.itemSubtitle}>{tier.targetRam}</Text> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.itemSubtitle}>
          {tierSpec.summary} Uses {modelDisplayName(activeModel)}
          {activeModel.id === tierSpec.primary.id ? " (recommended)." : " (your choice)."}
        </Text>

        <Text style={styles.groupTitle}>Options</Text>
        <View style={styles.group}>
          <ToggleRow label="Read replies aloud" value={voiceEnabled} info={SETTING_INFO.tts} onValueChange={setVoiceEnabled} />
          <ToggleRow
            label="Web search and weather"
            value={webSearchEnabled}
            info={SETTING_INFO.webSearch}
            onValueChange={setWebSearchEnabled}
          />
          <ToggleRow
            label="Keep chats after closing the app"
            value={persistChatHistory}
            info={SETTING_INFO.history}
            onValueChange={() => handleTogglePersistHistory()}
          />
          <SettingRow
            label={memoryCount > 0 ? `Clear chats and memories (${memoryCount} saved)` : "Clear chats and memories"}
            info={SETTING_INFO.clear}
            onPress={handleClearChatsAndMemories}
          />
          <SettingRow
            label="Privacy and internet use"
            info={SETTING_INFO.privacy}
            onPress={() => Alert.alert(SETTING_INFO.privacy.title, SETTING_INFO.privacy.body)}
          />
          <SettingRow label="Set up again" info={SETTING_INFO.onboarding} onPress={() => router.push("/onboarding")} last={!canRateApp} />
          {canRateApp ? (
            <SettingRow
              label="Rate OfflineMate"
              info={SETTING_INFO.rate}
              onPress={() => {
                void openStoreListingForRating().then((opened) => {
                  if (!opened) Alert.alert("Couldn't open the store", "Search for OfflineMate in Google Play to rate it.");
                });
              }}
              last
            />
          ) : null}
        </View>

        <Text style={styles.groupTitle}>Advanced</Text>
        <View style={styles.group}>
          <ToggleRow
            label="Show technical details"
            value={showTechnicalDetails}
            info={SETTING_INFO.technical}
            onValueChange={setShowTechnicalDetails}
            last
          />
        </View>
        {showTechnicalDetails ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionBody}>
              Tier: {tierSpec.name} ({tierSpec.targetRam}){"\n"}
              Model: {modelDisplayName(activeModel)} · {activeModel.id} · {activeModel.quantization}{"\n"}
              File: {getActiveModelFileLabel(selectedTier, activeModelId)}{"\n"}
              Chat runs on an on-device LLM; notes are found with local retrieval (RAG).
            </Text>
          </View>
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
            <Text style={styles.modalTitle}>{modalTierSpec.label}: choose a model</Text>
            <Text style={styles.modalHint}>
              The recommended one suits most people. Pick one, then tap Download now if it isn’t on your phone yet.
              Models with the image icon can look at photos.
            </Text>
            {showTechnicalDetails ? (
              <Text style={styles.modalHint}>
                Last checked: {lastReadinessCheckByTier[modalTier]?.toLocaleTimeString() ?? "Not checked yet"}
              </Text>
            ) : null}
            <Text
              style={[styles.modalAction, (isCheckingReadiness || isDownloadingSelected) && styles.disabledLink]}
              onPress={() => {
                if (isCheckingReadiness || isDownloadingSelected) return;
                void refreshReadinessForTier(modalTier);
              }}
            >
              {isCheckingReadiness ? "Checking downloads…" : "Check downloads again"}
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
                    <View style={styles.modalOptionTitleRow}>
                      <Text style={styles.modalOptionTitle}>
                        {modelDisplayName(model)}
                        {isPrimary ? " (recommended)" : ""}
                      </Text>
                      {modelSupportsVision(model) ? <VisionBadge /> : null}
                    </View>
                    <Text style={styles.modalOptionMeta}>
                      {readinessBadge}
                      {showTechnicalDetails ? ` · ${model.id}` : ""}
                    </Text>
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
            {isDownloadingSelected ? (
              <DownloadProgressCard
                state={modelDownload.state}
                title={downloadingTitle}
                onCancel={modelDownload.cancel}
              />
            ) : !modalSelectedReady ? (
              <Text style={styles.modalAction} onPress={() => void handleDownloadModalModel()}>
                {`Download now · ${formatBytes(
                  modalBytesLeft ?? (modalActiveModel.estimatedSizeMb + getTierVoiceDownloadMb(modalTier)) * 1024 * 1024,
                )} (includes voice input)`}
              </Text>
            ) : null}
            <Text style={styles.modalClose} onPress={() => setModelPickerTier(null)}>
              {isDownloadingSelected ? "Hide (keeps downloading)" : "Done"}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  downloadCard: { marginTop: 12, marginBottom: 4 },
  root: { flex: 1, backgroundColor: "#0b1020" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  contentWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center", paddingTop: 24 },
  title: { color: "#e5e7eb", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  titleGap: { marginTop: 24, marginBottom: 4 },
  groupTitle: { color: "#93c5fd", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  group: { backgroundColor: "#111827", borderRadius: 10, borderWidth: 1, borderColor: "#1f2937", paddingHorizontal: 12 },
  summaryCard: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937", borderRadius: 12, padding: 14, gap: 8 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  summaryHeadText: { flex: 1 },
  summaryName: { color: "#f9fafb", fontSize: 18, fontWeight: "800" },
  summaryModel: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  summaryLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryText: { color: "#cbd5e1", flex: 1 },
  summaryButton: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 2 },
  summaryButtonText: { color: "#f9fafb", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#1f2937", marginVertical: 2 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sizeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  sizeCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  inUseTag: {
    color: "#0b1020",
    backgroundColor: "#93c5fd",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: "hidden",
  },
  toggleLabel: { color: "#e5e7eb", fontWeight: "600" },
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
  link: { color: "#93c5fd", fontWeight: "600" },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  settingRowLast: { borderBottomWidth: 0 },
  settingLabel: { flex: 1 },
  infoButton: { padding: 2 },
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
  modalOptionTitle: { color: "#e5e7eb", fontWeight: "700", flexShrink: 1 },
  modalOptionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  advancedTitle: { marginTop: 24, color: "#e5e7eb", fontSize: 16, fontWeight: "700" },
  versionLabel: { marginTop: 20, color: "#9ca3af", fontSize: 12 },
});

