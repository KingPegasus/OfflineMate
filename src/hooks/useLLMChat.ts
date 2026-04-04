import { useCallback } from "react";
import { Alert } from "react-native";
import { llmEngine } from "@/ai/llm-engine";
import {
  getFallbackTier,
  getPrimaryModelDisplayName,
  getPrimaryModelFileLabel,
  getTierSpec,
} from "@/ai/model-registry";
import { routeIntent } from "@/ai/intent-router";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";
import { buildPrompt } from "@/ai/prompt-builder";
import { filterArgsForTool, getToolByName, selectToolFromInput } from "@/tools/tool-registry";
import { WEB_SEARCH_NO_RESULTS_PREFIX } from "@/tools/search-tool";
import { useChatStore } from "@/stores/chat-store";
import { useModelStore } from "@/stores/model-store";
import { useSettingsStore } from "@/stores/settings-store";
import { speak } from "@/voice/tts-engine";
import { isMemoryPressureHigh } from "@/utils/performance";
import { saveImportantMemory } from "@/context/long-term-memory";
import { executePlanSteps, planStepsFromPrompt } from "@/ai/agent-planner";
import { cleanModelOutput } from "@/ai/output-guard";
import { ragAnswerOrFallback } from "@/ai/rag-grounding";
import { parseThinkTaggedContent, toThinkingLines } from "@/ai/think-parser";
import { buildSearchSynthesisMessages, runAgenticSearchFlow } from "@/ai/agentic-search-flow";
import { parseToolActionDecision } from "@/ai/tool-action-schema";
import { isEnabled } from "@/config/feature-flags";
import type { ChatMessage, ModelTier } from "@/types/assistant";

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

function setLlmInitDownloadContext(tier: ModelTier) {
  llmInitDownloadModelName = getPrimaryModelDisplayName(tier);
  llmInitDownloadFileLabel = getPrimaryModelFileLabel(tier);
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
  const messages = useChatStore((s) => s.messages);
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
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);

  const stopGeneration = useCallback(() => {
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
      const userMessage = createMessage("user", cleaned);
      pushMessage(userMessage);
      if (cleaned.toLowerCase().startsWith("remember ")) {
        saveImportantMemory(cleaned.replace(/^remember\s+/i, ""));
      }
      setLoading(true);
      setError(null);
      setStreamingResponse("");
      setStreamingThinking([]);
      setStreamingHasThinkTag(false);
      setStreamingThinkClosed(false);
      try {
        let activeTier = tier;
        let initError: Error | null = null;
        const llmInitOpts = { onDownloadProgress: reportLlmInitDownloadProgress };
        try {
          try {
            llmIdleCheckpointMs = Date.now();
            lastLlmDownloadProgressAt = 0;
            setLlmInitDownloadContext(activeTier);
            await withIdleDeadlineUnlessDownloading(
              llmEngine.initialize(activeTier, llmInitOpts),
              MODEL_INIT_TIMEOUT_MS,
              "Model initialization timed out. Ensure the model finished downloading (Onboarding), then try again. On slow devices the first load can take up to several minutes.",
              () => llmEngine.cancelPendingLoad(),
            );
          } catch (err) {
            initError = err instanceof Error ? err : new Error(String(err));
            console.error("[OfflineMate] LLM init failed for tier:", tier, initError.message, initError);
            const fallback = getFallbackTier(tier);
            if (fallback) {
              const proceed = await confirmModelFallback(tier as "full" | "standard", fallback);
              if (!proceed) {
                throw new Error(
                  `Could not load the ${getTierSpec(tier).name} model. Fix downloads in Onboarding or pick another tier in Settings, then send your message again.`,
                );
              }
              activeTier = fallback;
              setTier(fallback);
              // Let native download/load settle so Lite init does not hit "Already downloading this file" (ExecuTorch 181).
              await new Promise((r) => setTimeout(r, 1500));
              try {
                llmIdleCheckpointMs = Date.now();
                lastLlmDownloadProgressAt = 0;
                setLlmInitDownloadContext(activeTier);
                await withIdleDeadlineUnlessDownloading(
                  llmEngine.initialize(activeTier, llmInitOpts),
                  MODEL_INIT_TIMEOUT_MS,
                  "Fallback model initialization timed out. Open Onboarding and confirm the Lite model downloaded, or retry after a few minutes.",
                  () => llmEngine.cancelPendingLoad(),
                );
              } catch (fallbackErr) {
                const fb = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
                console.error("[OfflineMate] LLM init failed for fallback tier:", fallback, fb.message, fb);
                throw new Error(
                  "Could not load any model. Open Settings → Onboarding: wait until each download shows complete. If downloads were interrupted, use a stable connection and retry. Standard/Full are large—Lite is smallest. First load after install can take several minutes on some devices.",
                );
              }
            } else {
              console.error("[OfflineMate] LLM init failed (no fallback tier).", initError?.message, initError);
              throw new Error(
                "Could not load the model. Open Settings → Open Onboarding, complete the model download for your tier, then try again. Check logcat for details.",
              );
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
                    const result = await withTimeout(
                      searchTool.execute(filtered),
                      15000,
                      "Web search timed out. Please try a shorter query.",
                    );
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
                    const result = await withTimeout(
                      searchTool.execute(filtered),
                      15000,
                      "Web search timed out. Please try a shorter query.",
                    );
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
              if (!tool) return `Tool ${toolName} is not available.`;
              const filtered = filterArgsForTool(tool, { query: cleaned, text: cleaned, ...args });
              console.log("[OfflineMate] Tool execute:", correlationId, toolName);
              let result;
              try {
                result = await withTimeout(
                  tool.execute(filtered),
                  15000,
                  `Tool ${tool.name} timed out. Please try a simpler request.`,
                );
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
          const direct = cleanModelOutput(agenticDirectAnswer);
          console.log("[OfflineMate] Agentic cleaned output:", JSON.stringify(direct.slice(0, 120)));
          pushMessage(createMessage("assistant", direct));
          console.log("[OfflineMate] Agentic direct answer delivered");
          if (voiceEnabled) {
            console.log("[OfflineMate] Chat: voice on, speaking direct answer");
            await speak(direct);
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
          const directNoResults = cleanModelOutput(searchToolBody);
          setStreamingHasThinkTag(false);
          setStreamingThinkClosed(true);
          setStreamingThinking([]);
          setStreamingResponse(directNoResults);
          pushMessage(createMessage("assistant", directNoResults));
          if (voiceEnabled) {
            await speak(directNoResults);
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
        try {
          let rawStreamedSoFar = "";
          output = await withTimeout(
            llmEngine.generate(promptMessages, (token) => {
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
            looksLikeAgenticDecisionLeak(cleanedOutput)
          ) {
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
        setStreamingHasThinkTag(parsedOutput.hasThinkTag);
        setStreamingThinkClosed(parsedOutput.isClosed);
        setStreamingResponse(finalOutput);
        pushMessage({
          ...createMessage("assistant", finalOutput),
          thinking: finalThinking.length > 0 ? finalThinking : undefined,
        });
        if (voiceEnabled) {
          console.log("[OfflineMate] Chat: voice on, speaking response");
          await speak(finalOutput);
        }
        console.log(
          `[OfflineMate] Assistant delivered: intent=${intent} finalLen=${finalOutput.length} text=${JSON.stringify(clipForLog(finalOutput))}`,
        );
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "Unknown chat error";
        console.error("[OfflineMate] Chat error:", message, errorValue);
        setError(message);
      } finally {
        setLoading(false);
        setStreamingResponse("");
        setStreamingThinking([]);
        setStreamingHasThinkTag(false);
        setStreamingThinkClosed(false);
      }
    },
    [
      messages,
      pushMessage,
      setLoading,
      setError,
      setStreamingResponse,
      setStreamingThinking,
      setStreamingHasThinkTag,
      setStreamingThinkClosed,
      setTier,
      tier,
      voiceEnabled,
      isLoading,
    ],
  );

  return {
    messages,
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

