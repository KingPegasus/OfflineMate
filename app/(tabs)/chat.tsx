import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatListPane } from "@/components/ChatListPane";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatModelBadge } from "@/components/ChatModelBadge";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LlmInitDownloadModal } from "@/components/LlmInitDownloadModal";
import { LiveThinkingPanel } from "@/components/LiveThinkingPanel";
import { StreamingText } from "@/components/StreamingText";
import { useBreakpoint, useHingeSplit } from "@/hooks/useBreakpoint";
import { useLLMChat } from "@/hooks/useLLMChat";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getTierSpec, resolveModelForTier, visionUnsupportedMessage } from "@/ai/model-registry";
import { deleteChatImages, pickChatImage } from "@/utils/chat-images";
import { CHAT_MAX_WIDTH, LIST_PANE_WIDTH } from "@/utils/layout";

/** In tabletop posture the bottom half only needs room for the composer. */
const TABLETOP_MIN_PANE = 120;

export default function ChatScreen() {
  const router = useRouter();
  // Wide: cap and centre the message column. Two-pane: chat list on the left, conversation on the right.
  const { isWide, isTwoPane, hinge } = useBreakpoint();
  const column = isWide ? styles.column : null;
  // Half-opened foldables: book posture puts the chat list and conversation on either side of
  // the fold; tabletop keeps messages on the top half and the composer on the bottom half.
  const {
    ref: bookRef,
    onLayout: onBookLayout,
    split: bookSplit,
  } = useHingeSplit(isTwoPane && hinge?.posture === "book" ? hinge : null);
  const {
    ref: tabletopRef,
    onLayout: onTabletopLayout,
    split: tabletopSplit,
  } = useHingeSplit(hinge?.posture === "tabletop" ? hinge : null, TABLETOP_MIN_PANE);
  const [prompt, setPrompt] = useState("");
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const {
    messages,
    startNewConversation,
    sendMessage,
    stopGeneration,
    streamingResponse,
    streamingThinking,
    streamingHasThinkTag,
    streamingThinkClosed,
    isLoading,
    error,
  } = useLLMChat();
  const errorTier = useChatStore((s) => s.errorTier);
  const selectedTier = useSettingsStore((s) => s.selectedTier);
  const selectedModelId = useSettingsStore((s) => s.tierModelIds[selectedTier] ?? null);
  const tierSpec = getTierSpec(selectedTier);
  const activeModel = resolveModelForTier(selectedTier, selectedModelId);
  const [liveThinkingExpandedOverride, setLiveThinkingExpandedOverride] = useState<boolean | null>(
    null,
  );
  const autoLiveThinkingOpen =
    !isLoading || !streamingHasThinkTag || !streamingThinkClosed;
  const isLiveThinkingOpen = liveThinkingExpandedOverride ?? autoLiveThinkingOpen;

  const resetLiveThinkingOverride = () => setLiveThinkingExpandedOverride(null);

  const canSubmit = useMemo(
    () => (prompt.trim().length > 0 || !!pendingImageUri) && !isLoading,
    [prompt, pendingImageUri, isLoading],
  );

  const openTierSettings = () =>
    // `at` makes every tap a new param value, so Settings reopens the picker each time.
    router.push({
      pathname: "/settings",
      params: { tier: selectedTier, at: String(Date.now()) },
    } as never);

  const handleAttachImage = async () => {
    const visionError = visionUnsupportedMessage(selectedTier, selectedModelId);
    if (visionError) {
      Alert.alert("This model can't see images", visionError, [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: openTierSettings },
      ]);
      return;
    }
    const result = await pickChatImage();
    if (result.status === "picked") {
      // Replacing an unsent image: its copy is no longer needed.
      if (pendingImageUri) void deleteChatImages([pendingImageUri]);
      setPendingImageUri(result.image.uri);
    } else if (result.status === "error") {
      Alert.alert("Image not added", result.message);
    }
  };

  const handleRemoveImage = () => {
    if (pendingImageUri) void deleteChatImages([pendingImageUri]);
    setPendingImageUri(null);
  };
  const handleNewChat = () => {
    resetLiveThinkingOverride();
    startNewConversation("New chat");
  };

  return (
    // The header already covers the status bar; padding the top again left an empty band above the chat.
    <SafeAreaView style={styles.root} edges={isWide ? ["bottom"] : []}>
      <LlmInitDownloadModal />
      <View style={styles.panes} ref={bookRef} onLayout={onBookLayout}>
        {isTwoPane ? (
          <View style={[styles.listPane, bookSplit && { width: bookSplit.leading }]}>
            <ChatListPane onNewChat={handleNewChat} />
          </View>
        ) : null}
        <View
          style={[styles.conversationPane, bookSplit && { marginLeft: bookSplit.gap }]}
          ref={tabletopRef}
          onLayout={onTabletopLayout}
        >
          {isTwoPane ? null : (
            <View style={[styles.conversationBar, column]}>
              <Pressable style={styles.primaryBtn} onPress={handleNewChat}>
                <Text style={styles.primaryBtnText}>+ New chat</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => router.push("/chats" as never)}>
                <Text style={styles.secondaryBtnText}>Open chats</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            style={styles.messages}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.messagesContent, column]}
          >
            <ChatModelBadge modelName={tierSpec.name} modelId={activeModel.id} />
            {error ? (
              <ErrorBanner
                message={error}
                action={
                  errorTier
                    ? {
                        label: `Open ${getTierSpec(errorTier).name} in Settings`,
                        onPress: () =>
                          // `at` makes every tap a new param value, so Settings reopens the picker each time.
                          router.push({
                            pathname: "/settings",
                            params: { tier: errorTier, at: String(Date.now()) },
                          } as never),
                      }
                    : undefined
                }
              />
            ) : null}
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                role={m.role}
                content={m.content}
                thinking={m.thinking}
                tokensPerSecond={m.tokensPerSecond}
                imageUri={m.imageUri}
              />
            ))}
            <LiveThinkingPanel
              visible={isLoading && streamingHasThinkTag}
              lines={streamingThinking}
              expanded={isLiveThinkingOpen}
              onToggleExpanded={() =>
                setLiveThinkingExpandedOverride((value) => !(value ?? autoLiveThinkingOpen))
              }
            />
            {streamingResponse ? <StreamingText text={streamingResponse} /> : null}
          </ScrollView>
          <KeyboardStickyView
            offset={{ closed: 0, opened: 0 }}
            style={[
              isWide ? styles.composerBar : null,
              tabletopSplit && {
                height: tabletopSplit.gap + tabletopSplit.trailing,
                paddingTop: tabletopSplit.gap,
              },
            ]}
          >
            <ChatComposer
              style={isWide ? styles.composerColumn : undefined}
              value={prompt}
              onChangeText={setPrompt}
              onSend={() => {
                if (!canSubmit) return;
                resetLiveThinkingOverride();
                void sendMessage(prompt.trim(), pendingImageUri ? { imageUri: pendingImageUri } : undefined);
                setPrompt("");
                setPendingImageUri(null);
              }}
              onStop={() => {
                resetLiveThinkingOverride();
                stopGeneration();
              }}
              isLoading={isLoading}
              canSubmit={canSubmit}
              attachedImageUri={pendingImageUri}
              onAttachImage={() => void handleAttachImage()}
              onRemoveImage={handleRemoveImage}
              onVoiceTranscript={(text) => {
                setPrompt((prev) => (prev ? `${prev} ${text}` : text));
              }}
            />
          </KeyboardStickyView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020" },
  panes: { flex: 1, flexDirection: "row" },
  listPane: { width: LIST_PANE_WIDTH, borderRightWidth: 1, borderRightColor: "#1f2937" },
  conversationPane: { flex: 1, minWidth: 0 },
  column: { width: "100%", maxWidth: CHAT_MAX_WIDTH, alignSelf: "center" },
  composerBar: { borderTopWidth: 1, borderTopColor: "#1f2937", backgroundColor: "#0b1020" },
  composerColumn: { width: "100%", maxWidth: CHAT_MAX_WIDTH, alignSelf: "center", borderTopWidth: 0 },
  conversationBar: {
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryBtnText: { color: "#e5e7eb", fontWeight: "700", fontSize: 12 },
  secondaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: { color: "#93c5fd", fontWeight: "600", fontSize: 12 },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
});
