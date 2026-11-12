import { useCallback, useMemo, useRef } from "react";
import { Alert } from "react-native";
import { llmEngine } from "@/ai/llm-engine";
import {
  getActiveModelDisplayName,
  getActiveModelFileLabel,
  getFallbackTier,
  getTierSpec,
  resolveModelForTier,
} from "@/ai/model-registry";
import { routeIntent } from "@/ai/intent-router";
import { buildLocalDateTimeAnswer } from "@/utils/local-datetime";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";
import { buildKeywordNotesReply, searchNotesByKeywords } from "@/context/keyword-notes";
import { buildPrompt } from "@/ai/prompt-builder";
import { filterArgsForTool, getToolByName, selectToolFromInput, type Tool } from "@/tools/tool-registry";
import { WEB_SEARCH_NO_RESULTS_PREFIX } from "@/tools/search-tool";
import { useChatStore } from "@/stores/chat-store";
import { useModelStore } from "@/stores/model-store";
import { useSettingsStore } from "@/stores/settings-store";
import { noteSuccessfulReply } from "@/stores/review-store";
import {
  downloadTierChatModel,
  getTierChatAssetReadiness,
  isTokenizerAssetId,
  removeTruncatedChatModel,
} from "@/ai/model-manager";
import { speak } from "@/voice/tts-engine";
import { isMemoryPressureHigh } from "@/utils/performance";
import { saveImportantMemory } from "@/context/long-term-memory";
import { executePlanSteps, planStepsFromPrompt } from "@/ai/agent-planner";
import { cleanModelOutput, looksLikeToolEcho } from "@/ai/output-guard";
import { buildDeterministicToolReply, usesDeterministicToolReplies } from "@/ai/tool-reply";
import { ragAnswerOrFallback } from "@/ai/rag-grounding";
import { parseThinkTaggedContent, toThinkingLines } from "@/ai/think-parser";
import { buildSearchSynthesisMessages, runAgenticSearchFlow } from "@/ai/agentic-search-flow";
import { parseToolActionDecision } from "@/ai/tool-action-schema";
import { isEnabled } from "@/config/feature-flags";
import { approximateTokenCount } from "@/utils/tokenizer";
import { stripTokPerSecLines } from "@/utils/tok-per-sec";
import type { ChatMessage, ModelTier, ToolResult } from "@/types/assistant";

/** Cold load from storage + runtime init can take several minutes on mid-range phones; partial downloads also stall until complete. */
const MODEL_INIT_TIMEOUT_MS = 300_000;
/** If the model file reports progress but bytes stop moving for this long, treat as stalled. */
const LLM_DOWNLOAD_STALL_MS = 15 * 60 * 1000;
/** How often we re-check idle deadline vs download state during LLM init. */
const LLM_INIT_POLL_MS = 30_000;

let llmIdleCheckpointMs = Date.now();
let lastLlmDownloadProgressAt = 0;
let llmInitDownloadFileLabel = "";
let llmInitDownloadModelName = "";

function setLlmInitDownloadContext(tier: ModelTier, modelId?: string | null) {
  llmInitDownloadModelName = getActiveModelDisplayName(tier, modelId);
  llmInitDownloadFileLabel = getActiveModelFileLabel(tier, modelId);
}

function isLlmAssetDownloading(): boolean {
  return useModelStore.getState().llmInitDownload !== null;
}

/** ExecuTorch only invokes this while the model binary is fetched from a remote URL. */
function reportLlmInitDownloadProgress(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  if (p < 1) {
    lastLlmDownloadProgressAt = Date.now();
    useModelStore.getState().setLlmInitDownload({
      progress: p,
      modelName: llmInitDownloadModelName || undefined,
      fileLabel: llmInitDownloadFileLabel || undefined,
    });
  } else {
    useModelStore.getState().setLlmInitDownload(null);
    llmIdleCheckpointMs = Date.now();
  }
}

/**
 * Enforces `idleDeadlineMs` only while we are not actively downloading the LLM binary
 * (ExecuTorch progress still below 1). While downloading, the timer does not fire; only stall detection applies.
 * When the model file reaches 100%, `reportLlmInitDownloadProgress` resets the idle checkpoint for tokenizer/configure.
 */
function withIdleDeadlineUnlessDownloading<T>(
  promise: Promise<T>,
  idleDeadlineMs: number,
  timeoutMessage: string,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimer();
      try {
        onTimeout?.();
      } catch (timeoutError) {
        console.warn("[OfflineMate] Timeout handler failed:", timeoutError);
      }
      reject(new Error(message));
    };

    const scheduleNext = () => {
      if (settled) return;
      clearTimer();
      timer = setTimeout(tick, LLM_INIT_POLL_MS);
    };

    const tick = () => {
      if (settled) return;
      if (isLlmAssetDownloading()) {
        if (
          lastLlmDownloadProgressAt > 0 &&
          Date.now() - lastLlmDownloadProgressAt >= LLM_DOWNLOAD_STALL_MS
        ) {
          fail("Model download stalled. Check your connection and try again.");
          return;
        }
        scheduleNext();
        return;
      }
      if (Date.now() - llmIdleCheckpointMs >= idleDeadlineMs) {
        fail(timeoutMessage);
        return;
      }
      scheduleNext();
    };

    timer = setTimeout(tick, 0);
    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimer();
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimer();
        reject(error);
      });
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout?.();
      } catch (timeoutError) {
        console.warn("[OfflineMate] Timeout handler failed:", timeoutError);
      }
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: `${role}-${Date.now()}-${Math.random()}`, role, content, createdAt: Date.now() };
}

function buildGemmaFallbackMessages(messages: ChatMessage[]): ChatMessage[] {
  const mergedSystem = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join("\n\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userPrompt = lastUser?.content?.trim() || "Answer briefly and clearly.";
  return [
    createMessage("system", mergedSystem || "You are OfflineMate, a local private assistant."),
    createMessage("user", userPrompt),
  ];
}

function estimateTokensPerSecond(text: string, elapsedMs: number): number | null {
  if (!text.trim() || elapsedMs <= 0) return null;
  const tokenCount = approximateTokenCount(text);
  if (tokenCount <= 0) return null;
  return tokenCount / Math.max(elapsedMs / 1000, 0.001);
}

/** The speed is kept on the message (ChatBubble shows it) so it never enters the reply text or the prompt. */
function createAssistantMessage(content: string, tokensPerSecond: number | null): ChatMessage {
  return { ...createMessage("assistant", content), tokensPerSecond };
}

/** Model load/download failure the user fixes from the tier's model picker in Settings. */
export class ModelSetupError extends Error {
  constructor(
    readonly tier: ModelTier,
    message: string,
  ) {
    super(message);
    this.name = "ModelSetupError";
  }
}

function settingsFixSteps(tier: ModelTier, filesMayBeDamaged = true): string {
  const tierName = getTierSpec(tier).name;
  const action = filesMayBeDamaged
    ? "tap Download now (or Re-download if it already shows Downloaded)"
    : "tap Download now";
  return `Tap "Open ${tierName} in Settings" below (or Settings → ${tierName}), pick a model, ${action}, then send your message again.`;
}

async function assertChatAssetsReady(tier: ModelTier, modelId?: string | null): Promise<void> {
  const active = resolveModelForTier(tier, modelId);
  const primary = getTierSpec(tier).primary;
  if (active.id !== primary.id) {
    // Tier alternates can download via ExecuTorch on first chat load.
    return;
  }
  const readiness = await getTierChatAssetReadiness(tier, modelId);
  if (readiness.ready) return;
  if (readiness.missingAssets.every((asset) => isTokenizerAssetId(asset.id))) {
    // Weights are on disk but tokenizer files are not (e.g. installs from before tokenizers were
    // stored per model). Fetch the small JSON files instead of sending the user back to onboarding.
    await downloadTierChatModel(tier, modelId);
    return;
  }
  const missing = readiness.missingAssets
    .map((asset) => asset.id)
    .slice(0, 4)
    .join(", ");
  const tierName = getTierSpec(tier).name;
  console.warn("[OfflineMate] Chat assets missing:", tierName, missing);
  throw new ModelSetupError(tier, `The ${tierName} model is not downloaded yet. ${settingsFixSteps(tier, false)}`);
}

/** Ask before switching to a smaller tier after primary model init fails. */
function confirmModelFallback(failedTier: "full" | "standard", fallbackTier: "standard" | "lite"): Promise<boolean> {
  const failedName = getTierSpec(failedTier).name;
  const fallbackName = getTierSpec(fallbackTier).name;
  return new Promise((resolve) => {
    Alert.alert(
      "Model could not load",
      `The ${failedName} model did not start (timeout, missing files, or not enough memory). Switch to ${fallbackName}? Your choice is saved in Settings.`,
      [
        { text: "Not now", style: "cancel", onPress: () => resolve(false) },
        { text: `Use ${fallbackName}`, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

function extractPlannerPayload(raw: string): { steps: unknown[] } | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const payload = fenced?.[1] ?? raw;
  const firstCurly = payload.indexOf("{");
  const lastCurly = payload.lastIndexOf("}");
  if (firstCurly === -1 || lastCurly === -1 || lastCurly <= firstCurly) return null;
  try {
    const parsed = JSON.parse(payload.slice(firstCurly, lastCurly + 1)) as { steps?: unknown };
    if (Array.isArray(parsed.steps)) return { steps: parsed.steps };
  } catch {
    // ignore parse error
  }
  return null;
}

function isPlannerLeak(text: string): boolean {
  return extractPlannerPayload(text) !== null;
}

/** Model echoed agentic search decision (JSON or key:value) instead of natural language. */
function looksLikeAgenticDecisionLeak(text: string): boolean {
  const t = text.trim();
  if (parseToolActionDecision(t) !== null) return true;
  if (/\bdecision\s*:\s*["']?(use_tool|answer_direct)/i.test(text) && /\btoolname\s*:/i.test(text)) return true;
  if (/\bdecision\s*:\s*["']?(use_tool|answer_direct)/i.test(text) && /\bquery\s*:/i.test(text)) return true;
  return false;
}

function summarizeToolResult(toolResult?: string): string | null {
  if (!toolResult) return null;
  const firstNonPlan = toolResult
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.toLowerCase().startsWith("plan:"));
  if (!firstNonPlan) return null;
  const colonIndex = firstNonPlan.indexOf(":");
  if (colonIndex !== -1 && colonIndex < firstNonPlan.length - 1) {
    return firstNonPlan.slice(colonIndex + 1).trim();
  }
  return firstNonPlan;
}

export function useLLMChat() {
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const allMessages = useChatStore((s) => s.messages);
  const createConversation = useChatStore((s) => s.createConversation);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const pushMessage = useChatStore((s) => s.pushMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const setError = useChatStore((s) => s.setError);
  const error = useChatStore((s) => s.error);
  const isLoading = useChatStore((s) => s.isLoading);
  const streamingResponse = useChatStore((s) => s.streamingResponse);
  const streamingThinking = useChatStore((s) => s.streamingThinking);
  const streamingHasThinkTag = useChatStore((s) => s.streamingHasThinkTag);
  const streamingThinkClosed = useChatStore((s) => s.streamingThinkClosed);
  const setStreamingResponse = useChatStore((s) => s.setStreamingResponse);
  const setStreamingThinking = useChatStore((s) => s.setStreamingThinking);
  const setStreamingHasThinkTag = useChatStore((s) => s.setStreamingHasThinkTag);
  const setStreamingThinkClosed = useChatStore((s) => s.setStreamingThinkClosed);
  const tier = useSettingsStore((s) => s.selectedTier);
  const tierModelIds = useSettingsStore((s) => s.tierModelIds);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const messages = useMemo(
    () => (activeConversationId ? allMessages.filter((m) => m.conversationId === activeConversationId) : []),
    [activeConversationId, allMessages],
  );

  const startNewConversation = useCallback((seedTitle?: string) => {
    createConversation(seedTitle);
  }, [createConversation]);

  /** Set when the user taps Stop, so a cut-off reply doesn't count toward the review prompt. */
  const stoppedByUserRef = useRef(false);
  const stopGeneration = useCallback(() => {
    stoppedByUserRef.current = true;
    llmEngine.interrupt();
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const cleaned = content.trim();
      if (!cleaned) return;
      if (isLoading) {
        setError("The model is currently generating. Please wait for the current response to finish.");
        return;
      }
      const requestConversationId = activeConversationId ?? createConversation(cleaned);
      const userMessage = createMessage("user", cleaned);
      pushMessage(userMessage, requestConversationId);
      if (cleaned.toLowerCase().startsWith("remember ")) {
        saveImportantMemory(cleaned.replace(/^remember\s+/i, ""));
      }
      setLoading(true);
      setError(null);
      setStreamingResponse("");
      setStreamingThinking([]);
      setStreamingHasThinkTag(false);
      setStreamingThinkClosed(false);
      // Only clean replies count toward the review prompt: no error, failed tool, tier fallback or canned fallback copy.
      let replyWasClean = true;
      stoppedByUserRef.current = false;
      /** Every tool call goes through here, so a failed or timed-out tool always marks the reply as not clean. */
      const runTool = async (tool: Tool, args: Record<string, string>, timeoutMessage: string): Promise<ToolResult> => {
        try {
          const result = await withTimeout(tool.execute(args), 15000, timeoutMessage);
          if (!result.ok) replyWasClean = false;
          return result;
        } catch (err) {
          replyWasClean = false;
          throw err;
        }
      };
      try {
        let activeTier = tier;
        const activeModelId = tierModelIds[activeTier] ?? null;
        let initError: Error | null = null;
        const llmInitOpts = {
          modelId: activeModelId,
          onDownloadProgress: reportLlmInitDownloadProgress,
        };
        try {
          try {
            await assertChatAssetsReady(activeTier, activeModelId);
            llmIdleCheckpointMs = Date.now();
            lastLlmDownloadProgressAt = 0;
            setLlmInitDownloadContext(activeTier, activeModelId);
            await withIdleDeadlineUnlessDownloading(
              llmEngine.initialize(activeTier, llmInitOpts),
              MODEL_INIT_TIMEOUT_MS,
              "Model initialization timed out. Make sure the model shows Downloaded in Settings, then try again. On slow devices the first load can take up to several minutes.",
              () => llmEngine.cancelPendingLoad(),
            );
          } catch (err) {
            initError = err instanceof Error ? err : new Error(String(err));
            console.error("[OfflineMate] LLM init failed for tier:", tier, initError.message, initError);
            const fallback = getFallbackTier(tier);
            const tierName = getTierSpec(tier).name;
            if (!(initError instanceof ModelSetupError) && (await removeTruncatedChatModel(tier, activeModelId))) {
              // Files were present but short (interrupted download): the fix is downloading, not switching tier.
              throw new ModelSetupError(
                tier,
                `The ${tierName} model file was incomplete and has been removed. ${settingsFixSteps(tier, false)}`,
              );
            }
            if (initError instanceof ModelSetupError && !fallback) {
              // "Not downloaded yet" from assertChatAssetsReady: show it as is.
              throw initError;
            }
            if (fallback) {
              replyWasClean = false;
              const proceed = await confirmModelFallback(tier as "full" | "standard", fallback);
              if (!proceed) {
                throw initError instanceof ModelSetupError
                  ? initError
                  : new ModelSetupError(
                      tier,
                      `Could not load the ${tierName} model. ${settingsFixSteps(tier)} You can also pick a smaller tier there.`,
                    );
              }
              activeTier = fallback;
              setTier(fallback);
              const fallbackModelId = tierModelIds[activeTier] ?? null;
              await assertChatAssetsReady(activeTier, fallbackModelId);
              // Let native download/load settle so Lite init does not hit "Already downloading this file" (ExecuTorch 181).
              await new Promise((r) => setTimeout(r, 1500));
              try {
                llmIdleCheckpointMs = Date.now();
                lastLlmDownloadProgressAt = 0;
                setLlmInitDownloadContext(activeTier, fallbackModelId);
                await withIdleDeadlineUnlessDownloading(
                  llmEngine.initialize(activeTier, {
                    modelId: fallbackModelId,
                    onDownloadProgress: reportLlmInitDownloadProgress,
                  }),
                  MODEL_INIT_TIMEOUT_MS,
                  "Fallback model initialization timed out. Make sure the Lite model shows Downloaded in Settings, or retry after a few minutes.",
                  () => llmEngine.cancelPendingLoad(),
                );
              } catch (fallbackErr) {
                const fb = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
                console.error("[OfflineMate] LLM init failed for fallback tier:", fallback, fb.message, fb);
                throw new ModelSetupError(
                  fallback,
                  `Could not load any model. ${settingsFixSteps(fallback)} Use a stable connection; the first load after install can take several minutes on some devices.`,
                );
              }
            } else {
              console.error("[OfflineMate] LLM init failed (no fallback tier).", initError?.message, initError);
              throw new ModelSetupError(tier, `Could not load the ${tierName} model. ${settingsFixSteps(tier)}`);
            }
          }
        } finally {
          useModelStore.getState().setLlmInitDownload(null);
        }

        if (await isMemoryPressureHigh() && activeTier === "full") {
          activeTier = "standard";
          setTier("standard");
        }
        const intent = routeIntent(cleaned);
        console.log("[OfflineMate] User:", JSON.stringify(cleaned));
        console.log("[OfflineMate] Intent:", intent, "prompt length:", cleaned.length);
        let contextSnippets: string[] = [];
        let toolResult: string | undefined;
        let planSummary: string | undefined;
        let agenticDirectAnswer: string | undefined;
        let needsPostInterruptDelay = false;

        if (intent === "datetime") {
          const localDateTime = buildLocalDateTimeAnswer(cleaned);
          if (localDateTime) {
            const spokenOutput = cleanModelOutput(localDateTime);
            const finalOutput = spokenOutput;
            setStreamingHasThinkTag(false);
            setStreamingThinkClosed(true);
            setStreamingThinking([]);
            setStreamingResponse(finalOutput);
            pushMessage(createAssistantMessage(finalOutput, null), requestConversationId);
            if (voiceEnabled) {
              console.log("[OfflineMate] Chat: voice on, speaking local datetime response");
              await speak(spokenOutput);
            }
            console.log(
              `[OfflineMate] Assistant delivered: intent=${intent} finalLen=${finalOutput.length} text=${JSON.stringify(finalOutput)}`,
            );
            return;
          }
        }

        if (intent === "context" && activeTier === "lite") {
          // Lite has no semantic search, and the 135M model given no notes made an answer up (it copied
          // the previous reply). Search the notes by keyword and reply with what was found instead.
          let notesReply: string | null = null;
          try {
            const { terms, notes } = searchNotesByKeywords(cleaned);
            notesReply = buildKeywordNotesReply(terms, notes);
            if (notesReply && notes.length === 0) replyWasClean = false;
          } catch (err) {
            console.warn("[OfflineMate] Lite keyword note search failed:", err);
          }
          if (notesReply) {
            console.log("[OfflineMate] Lite notes reply (keyword search):", JSON.stringify(notesReply.slice(0, 120)));
            setStreamingHasThinkTag(false);
            setStreamingThinkClosed(true);
            setStreamingThinking([]);
            setStreamingResponse(notesReply);
            pushMessage(createAssistantMessage(notesReply, null), requestConversationId);
            if (voiceEnabled) await speak(notesReply);
            return;
          }
        }

        if (intent === "context") {
          contextSnippets = await retrieveContextForQuery(cleaned, activeTier);
          console.log(
            "[OfflineMate] RAG done:",
            "snippets=",
            contextSnippets.length,
            "chars=",
            contextSnippets.reduce((n, s) => n + s.length, 0),
          );
        } else if (
          intent === "tool" ||
          (activeTier === "full" && /\b(and|then|after)\b/i.test(cleaned))
        ) {
          let handledByAgenticSearch = false;
          const selectedTool = selectToolFromInput(cleaned);
          const canTryAgenticSearch =
            isEnabled("agenticSearchEnabled") &&
            activeTier !== "lite" &&
            selectedTool?.name === "search.web";
          console.log(
            "[OfflineMate] Agentic search gate:",
            "enabled=",
            isEnabled("agenticSearchEnabled"),
            "tier=",
            activeTier,
            "selectedTool=",
            selectedTool?.name ?? "(none)",
            "canTry=",
            canTryAgenticSearch,
          );
          if (canTryAgenticSearch) {
            const searchTool = getToolByName("search.web");
            if (searchTool) {
              const correlationId = `agentic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              console.log("[OfflineMate] Agentic search start:", correlationId, "user:", JSON.stringify(cleaned));
              setStreamingHasThinkTag(true);
              setStreamingThinkClosed(false);
              setStreamingThinking(["Planning search..."]);
              setStreamingResponse("Planning search...");
              const agentic = await withTimeout(
                runAgenticSearchFlow({
                  prompt: cleaned,
                  generate: (m) => llmEngine.generateWithMaxTokens(m, 150),
                  executeWebSearch: async (query) => {
                    setStreamingThinking(["Planning search...", "Searching web..."]);
                    setStreamingResponse("Searching web...");
                    const filtered = filterArgsForTool(searchTool, { query, text: query });
                    const result = await runTool(searchTool, filtered, "Web search timed out. Please try a shorter query.");
                    const payloadText =
                      result.payload && Object.keys(result.payload).length > 0
                        ? `\nPayload: ${JSON.stringify(result.payload)}`
                        : "";
                    return result.message + payloadText;
                  },
                }),
                20000,
                "Agentic search decision timed out.",
                () => llmEngine.interrupt(),
              ).catch((err) => {
                const reason = err instanceof Error ? err.message : "unknown";
                console.warn("[OfflineMate] Agentic search fallback:", correlationId, reason);
                return { status: "fallback" as const, fallbackReason: reason };
              });
              console.log("[OfflineMate] Agentic flow returned:", agentic.status, "directAnswerLen:", "directAnswer" in agentic ? (agentic.directAnswer?.length ?? 0) : 0, "toolResultLen:", "toolResult" in agentic ? (agentic.toolResult?.length ?? 0) : 0, "fallback:", agentic.fallbackReason ?? "");
              if (agentic.status === "direct" && agentic.directAnswer) {
                const parsed = parseThinkTaggedContent(agentic.directAnswer);
                const content = (parsed.response.trim() || parsed.thinking.trim()).trim();
                console.log("[OfflineMate] Agentic parsed content:", JSON.stringify(content.slice(0, 150)));
                const trivial = /^(okay|ok|yes|sure|no|nope|alright|uh|umm?|no\s+idea|i\s+don'?t\s+know|\.\.\.?)$/i.test(content) || content.length < 3;
                if (!trivial) {
                  agenticDirectAnswer = content;
                  handledByAgenticSearch = true;
                  setStreamingThinking(["Planning search...", "Finalizing answer..."]);
                  console.log("[OfflineMate] Agentic direct answer accepted, len:", content.length);
                } else {
                  console.log("[OfflineMate] Agentic direct answer rejected (trivial):", JSON.stringify(content));
                }
              } else if (agentic.status === "tool" && agentic.toolResult) {
                setStreamingThinking(["Planning search...", "Searching web...", "Summarizing..."]);
                setStreamingResponse("Summarizing...");
                toolResult = `search.web: ${agentic.toolResult}`;
                handledByAgenticSearch = true;
                console.log(
                  "[OfflineMate] Agentic search tool result:",
                  correlationId,
                  "query:",
                  agentic.extractedQuery ?? "(none)",
                );
              } else {
                const reason = agentic.fallbackReason ?? "fallback";
                const canDirectSearchFallback =
                  reason.toLowerCase().includes("timed out") || reason.toLowerCase().includes("failed to generate");
                if (canDirectSearchFallback) {
                  try {
                    setStreamingThinking(["Planning search...", "Searching web..."]);
                    setStreamingResponse("Searching web...");
                    const filtered = filterArgsForTool(searchTool, { query: cleaned, text: cleaned });
                    const result = await runTool(searchTool, filtered, "Web search timed out. Please try a shorter query.");
                    const payloadText =
                      result.payload && Object.keys(result.payload).length > 0
                        ? `\nPayload: ${JSON.stringify(result.payload)}`
                        : "";
                    toolResult = `search.web: ${result.message}${payloadText}`;
                    handledByAgenticSearch = true;
                    needsPostInterruptDelay = true;
                    console.log("[OfflineMate] Agentic direct-search fallback used:", correlationId, reason);
                  } catch (fallbackSearchError) {
                    const fallbackMsg =
                      fallbackSearchError instanceof Error ? fallbackSearchError.message : "web search failed";
                    console.warn("[OfflineMate] Agentic direct-search fallback failed:", correlationId, fallbackMsg);
                  }
                }
                if (!handledByAgenticSearch) {
                  console.log("[OfflineMate] Agentic search not used:", correlationId, reason);
                  setStreamingHasThinkTag(false);
                  setStreamingThinkClosed(false);
                  setStreamingThinking([]);
                  setStreamingResponse("");
                }
              }
            }
          }

          if (!handledByAgenticSearch && !agenticDirectAnswer) {
            const plannedSteps = await withTimeout(
              planStepsFromPrompt(
                { prompt: cleaned, maxSteps: activeTier === "full" ? 4 : 2 },
                (plannerMessages) => llmEngine.generate(plannerMessages),
              ),
              20000,
              "Planning timed out. Falling back to direct tool execution.",
              () => llmEngine.interrupt(),
            ).catch(async () => {
              replyWasClean = false;
              const fallbackTool = selectToolFromInput(cleaned);
              if (!fallbackTool) return [];
              return [
                {
                  id: "1",
                  description: `Execute ${fallbackTool.name}`,
                  toolName: fallbackTool.name,
                  args: { query: cleaned, text: cleaned },
                },
              ];
            });

            const correlationId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            console.log("[OfflineMate] Executing plan steps:", correlationId, plannedSteps.length, plannedSteps.map((s) => s.toolName ?? s.description));
            const execution = await executePlanSteps(plannedSteps, async (toolName, args) => {
              const tool = getToolByName(toolName);
              if (!tool) {
                replyWasClean = false;
                return `Tool ${toolName} is not available.`;
              }
              const filtered = filterArgsForTool(tool, { query: cleaned, text: cleaned, ...args });
              console.log("[OfflineMate] Tool execute:", correlationId, toolName);
              let result;
              try {
                result = await runTool(tool, filtered, `Tool ${tool.name} timed out. Please try a simpler request.`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Tool execution failed.";
                console.warn("[OfflineMate] Tool failed:", correlationId, toolName, msg);
                return msg;
              }
              const payloadText =
                result.payload && Object.keys(result.payload).length > 0
                  ? `\nPayload: ${JSON.stringify(result.payload)}`
                  : "";
              return result.message + payloadText;
            });
            planSummary = execution.planSummary;
            toolResult = execution.toolSummary || toolResult;
            console.log(
              "[OfflineMate] Plan done. Summary:",
              planSummary ?? "(none)",
              "toolResult len:",
              (toolResult ?? "").length,
              "preview:",
              (toolResult ?? "").slice(0, 100),
            );
          }
        }
        if (planSummary) {
          toolResult = [toolResult, `Plan: ${planSummary}`].filter(Boolean).join("\n");
        }

        if (agenticDirectAnswer) {
          const spokenOutput = cleanModelOutput(agenticDirectAnswer);
          const finalOutput = spokenOutput;
          console.log("[OfflineMate] Agentic cleaned output:", JSON.stringify(spokenOutput.slice(0, 120)));
          pushMessage(createAssistantMessage(finalOutput, null), requestConversationId);
          console.log("[OfflineMate] Agentic direct answer delivered");
          if (voiceEnabled) {
            console.log("[OfflineMate] Chat: voice on, speaking direct answer");
            await speak(spokenOutput);
          }
          return;
        }

        // Models garble or drop facts from on-device tool output (all of it on Lite), so show the tool's own sentences.
        const liteToolReply =
          intent === "tool" && usesDeterministicToolReplies(activeTier, toolResult)
            ? buildDeterministicToolReply(toolResult)
            : null;
        if (liteToolReply) {
          const replyText = cleanModelOutput(liteToolReply);
          setStreamingHasThinkTag(false);
          setStreamingThinkClosed(true);
          setStreamingThinking([]);
          setStreamingResponse(replyText);
          pushMessage(createAssistantMessage(replyText, null), requestConversationId);
          console.log(`[OfflineMate] Tool reply (deterministic): ${JSON.stringify(replyText.slice(0, 200))}`);
          if (voiceEnabled) {
            await speak(replyText);
          }
          return;
        }

        if (needsPostInterruptDelay || (intent === "tool" && toolResult)) {
          await new Promise((r) => setTimeout(r, needsPostInterruptDelay ? 500 : 400));
        }

        // Deterministic empty-SERP copy is already a full UX message; synthesis often collapses it to an example fragment.
        const searchToolBody = summarizeToolResult(toolResult ?? "");
        if (
          intent === "tool" &&
          toolResult?.startsWith("search.web:") &&
          searchToolBody &&
          searchToolBody.startsWith(WEB_SEARCH_NO_RESULTS_PREFIX)
        ) {
          replyWasClean = false;
          const spokenOutput = cleanModelOutput(searchToolBody);
          const directNoResults = spokenOutput;
          setStreamingHasThinkTag(false);
          setStreamingThinkClosed(true);
          setStreamingThinking([]);
          setStreamingResponse(directNoResults);
          pushMessage(createAssistantMessage(directNoResults, null), requestConversationId);
          if (voiceEnabled) {
            await speak(spokenOutput);
          }
          return;
        }

        const promptMessages =
          intent === "tool" && toolResult?.startsWith("search.web:")
            ? buildSearchSynthesisMessages(cleaned, toolResult)
            : buildPrompt({
                tier: activeTier,
                messages: [...messages, userMessage],
                contextSnippets,
                contextLookupEmpty: intent === "context" && contextSnippets.length === 0,
                toolResult,
              });

        console.log("[OfflineMate] LLM generate start:", "intent=", intent, "promptMessages=", promptMessages.length);

        let output: string;
        let parsedOutput: { response: string; thinking: string; hasThinkTag: boolean; isClosed: boolean };
        let llmElapsedMsTotal = 0;
        try {
          const runGenerate = async (messagesForGenerate: ChatMessage[]) => {
            let rawStreamedSoFar = "";
            const startedAt = Date.now();
            const result = await withTimeout(
              llmEngine.generate(messagesForGenerate, (token) => {
                rawStreamedSoFar += token;
                const parsed = parseThinkTaggedContent(rawStreamedSoFar);
                setStreamingHasThinkTag(parsed.hasThinkTag);
                setStreamingThinkClosed(parsed.isClosed);
                setStreamingThinking(toThinkingLines(parsed.thinking));
                // When model uses <think>, only show response after </think> so thinking appears first.
                if (!parsed.hasThinkTag || parsed.isClosed) {
                  setStreamingResponse(parsed.response.trimStart());
                }
              }),
              90000,
              "The model is taking too long to respond. Try Lite tier or ensure model assets are downloaded.",
              () => llmEngine.interrupt(),
            );
            llmElapsedMsTotal += Date.now() - startedAt;
            return result;
          };

          output = await runGenerate(promptMessages);
          const activeModelSpec = resolveModelForTier(activeTier, activeModelId);
          if (!output.trim() && activeModelSpec.provider === "gemma") {
            console.warn("[OfflineMate] Gemma returned empty output; retrying with fallback prompt shape");
            const gemmaFallbackMessages = buildGemmaFallbackMessages(promptMessages);
            output = await runGenerate(gemmaFallbackMessages);
            if (!output.trim()) {
              try {
                console.warn("[OfflineMate] Gemma still empty; reloading model from runtime sources and retrying");
                llmEngine.cancelPendingLoad();
                await llmEngine.initialize(activeTier, {
                  modelId: activeModelId,
                  forceRuntimeSources: true,
                  onDownloadProgress: reportLlmInitDownloadProgress,
                });
                output = await runGenerate(gemmaFallbackMessages);
              } catch (reloadErr) {
                console.warn(
                  "[OfflineMate] Gemma runtime-source reload failed:",
                  reloadErr instanceof Error ? reloadErr.message : String(reloadErr),
                );
              }
            }
          }

          parsedOutput = parseThinkTaggedContent(output);
          console.log(
            "[OfflineMate] LLM generate done:",
            "rawLen=",
            output.length,
            "intent=",
            intent,
            "thinkClosed=",
            parsedOutput.isClosed,
          );
        } catch (genErr) {
          if (intent === "tool" && toolResult) {
            const fallback = summarizeToolResult(toolResult) ?? toolResult.split("\n")[0]?.replace(/^[^:]+:\s*/, "").trim();
            if (fallback) {
              output = "";
              parsedOutput = { response: fallback, thinking: "", hasThinkTag: false, isClosed: true };
              console.log("[OfflineMate] Synthesis failed, using tool result:", (genErr as Error)?.message ?? "unknown");
            } else {
              throw genErr;
            }
          } else {
            throw genErr;
          }
        }
        const cleanedOutput = cleanModelOutput(parsedOutput.response.trimStart());
        const finalThinking = toThinkingLines(parsedOutput.thinking);
        const clipForLog = (s: string, max = 2000) =>
          s.length > max ? `${s.slice(0, max)}…` : s;
        // One string so adb/logcat shows the full line (multi-arg console.log can fragment).
        console.log(
          `[OfflineMate] LLM response (no think): len=${cleanedOutput.length} text=${JSON.stringify(clipForLog(cleanedOutput))}`,
        );
        if (intent === "tool" && toolResult) {
          console.log(
            "[OfflineMate] Tool reply: rawLen=",
            output.length,
            "cleanedLen=",
            cleanedOutput.length,
            "cleanedPreview=",
            cleanedOutput.slice(0, 60),
          );
        }
        let finalOutput = cleanedOutput;
        if (intent === "tool") {
          if (
            isPlannerLeak(cleanedOutput) ||
            parseToolActionDecision(cleanedOutput) !== null ||
            looksLikeAgenticDecisionLeak(cleanedOutput) ||
            looksLikeToolEcho(cleanedOutput)
          ) {
            // Tool messages are full sentences ("Reminder set for tomorrow at 9:00 AM: call the bank."), so show that.
            finalOutput =
              summarizeToolResult(toolResult) ??
              "Done. I executed your request, but the model returned planner JSON instead of a natural response.";
          } else if (!cleanedOutput || cleanedOutput.trim().length < 3) {
            const fallback = summarizeToolResult(toolResult);
            finalOutput =
              (fallback ?? (toolResult ? toolResult.split("\n")[0]?.replace(/^[^:]+:\s*/, "").trim() : "")) || "Done.";
            console.log("[OfflineMate] Tool: empty model output, using fallback:", (finalOutput ?? "").slice(0, 80));
          }
        } else if (looksLikeAgenticDecisionLeak(cleanedOutput)) {
          finalOutput =
            "That reply was internal routing text, not an answer. For a reminder in about a minute, try: \"Remind me in 1 minute to get up.\"";
          console.log("[OfflineMate] Direct/context: stripped agentic decision leak from model output");
        }
        if (intent === "context" && contextSnippets.length > 0) {
          finalOutput = ragAnswerOrFallback(finalOutput, contextSnippets);
        }
        if (!finalOutput.trim()) {
          replyWasClean = false;
          finalOutput =
            "I could not generate a reply from this model just now. Please try again, or switch to Qwen 3 1.7B in Settings.";
          console.warn("[OfflineMate] Empty direct/context output; using deterministic fallback copy");
        }
        const tokensPerSecond = estimateTokensPerSecond(output, llmElapsedMsTotal);
        // Drop any speed line the model copied from older history; the real speed is stored on the message.
        const replyText = stripTokPerSecLines(finalOutput);
        setStreamingHasThinkTag(parsedOutput.hasThinkTag);
        setStreamingThinkClosed(parsedOutput.isClosed);
        setStreamingResponse(replyText);
        pushMessage(
          {
            ...createAssistantMessage(replyText, tokensPerSecond),
            thinking: finalThinking.length > 0 ? finalThinking : undefined,
          },
          requestConversationId,
        );
        if (voiceEnabled) {
          console.log("[OfflineMate] Chat: voice on, speaking response");
          await speak(replyText);
        }
        console.log(
          `[OfflineMate] Assistant delivered: intent=${intent} finalLen=${replyText.length} tokPerSec=${tokensPerSecond?.toFixed(1) ?? "n/a"} text=${JSON.stringify(clipForLog(replyText))}`,
        );
      } catch (errorValue) {
        replyWasClean = false;
        const message = errorValue instanceof Error ? errorValue.message : "Unknown chat error";
        console.error("[OfflineMate] Chat error:", message, errorValue);
        setError(message, errorValue instanceof ModelSetupError ? errorValue.tier : null);
      } finally {
        setLoading(false);
        setStreamingResponse("");
        setStreamingThinking([]);
        setStreamingHasThinkTag(false);
        setStreamingThinkClosed(false);
        if (replyWasClean && !stoppedByUserRef.current) noteSuccessfulReply(() => useChatStore.getState().isLoading);
      }
    },
    [
      messages,
      activeConversationId,
      createConversation,
      pushMessage,
      setLoading,
      setError,
      setStreamingResponse,
      setStreamingThinking,
      setStreamingHasThinkTag,
      setStreamingThinkClosed,
      setTier,
      tier,
      tierModelIds,
      voiceEnabled,
      isLoading,
    ],
  );

  return {
    conversations,
    activeConversationId,
    messages,
    startNewConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearMessages,
    sendMessage,
    stopGeneration,
    streamingResponse,
    streamingThinking,
    streamingHasThinkTag,
    streamingThinkClosed,
    isLoading,
    error,
  };
}

