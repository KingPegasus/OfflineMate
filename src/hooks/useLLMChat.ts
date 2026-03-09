import { useCallback } from "react";
import { llmEngine } from "@/ai/llm-engine";
import { getFallbackTier } from "@/ai/model-registry";
import { routeIntent } from "@/ai/intent-router";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";
import { buildPrompt } from "@/ai/prompt-builder";
import { getToolByName, selectToolFromInput } from "@/tools/tool-registry";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";
import { speak } from "@/voice/tts-engine";
import { isMemoryPressureHigh } from "@/utils/performance";
import { saveImportantMemory } from "@/context/long-term-memory";
import { executePlanSteps, planStepsFromPrompt } from "@/ai/agent-planner";
import { cleanModelOutput } from "@/ai/output-guard";
import { parseThinkTaggedContent, toThinkingLines } from "@/ai/think-parser";
import type { ChatMessage } from "@/types/assistant";

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
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

  const sendMessage = useCallback(
    async (content: string) => {
      const cleaned = content.trim();
      if (!cleaned) return;
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
        try {
          await withTimeout(
            llmEngine.initialize(activeTier),
            45000,
            "Model initialization timed out. Open Onboarding, complete the model download for your tier, then try again.",
          );
        } catch (err) {
          initError = err instanceof Error ? err : new Error(String(err));
          console.error("[OfflineMate] LLM init failed for tier:", tier, initError.message, initError);
          const fallback = getFallbackTier(tier);
          if (fallback) {
            activeTier = fallback;
            setTier(fallback);
            try {
              await withTimeout(
                llmEngine.initialize(activeTier),
                45000,
                "Fallback model initialization timed out. Try the Lite tier from Settings.",
              );
            } catch (fallbackErr) {
              const fb = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
              console.error("[OfflineMate] LLM init failed for fallback tier:", fallback, fb.message, fb);
              throw new Error(
                "Could not load any model. Open Settings → Open Onboarding, finish downloading the model for your tier (Lite is fastest), then try again. If you see this on first launch, ensure you have internet for the initial download.",
              );
            }
          } else {
            console.error("[OfflineMate] LLM init failed (no fallback tier).", initError?.message, initError);
            throw new Error(
              "Could not load the model. Open Settings → Open Onboarding, complete the model download for your tier, then try again. Check logcat for details.",
            );
          }
        }

        if (await isMemoryPressureHigh() && activeTier === "full") {
          activeTier = "standard";
          setTier("standard");
        }
        const intent = routeIntent(cleaned);
        let contextSnippets: string[] = [];
        let toolResult: string | undefined;
        let planSummary: string | undefined;

        if (intent === "context") {
          contextSnippets = await retrieveContextForQuery(cleaned, activeTier);
        } else if (
          intent === "tool" ||
          (activeTier === "full" && /\b(and|then|after)\b/i.test(cleaned))
        ) {
          const plannedSteps = await withTimeout(
            planStepsFromPrompt(
              { prompt: cleaned, maxSteps: activeTier === "full" ? 4 : 2 },
              (plannerMessages) => llmEngine.generate(plannerMessages),
            ),
            20000,
            "Planning timed out. Falling back to direct tool execution.",
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

          const execution = await executePlanSteps(plannedSteps, async (toolName, args) => {
            const tool = getToolByName(toolName);
            if (!tool) return `Tool ${toolName} is not available.`;
            const result = await withTimeout(
              tool.execute({ query: cleaned, text: cleaned, ...args }),
              15000,
              `Tool ${tool.name} timed out. Please try a simpler request.`,
            );
            return result.message;
          });
          planSummary = execution.planSummary;
          toolResult = execution.toolSummary || toolResult;
        }
        if (planSummary) {
          toolResult = [toolResult, `Plan: ${planSummary}`].filter(Boolean).join("\n");
        }

        const promptMessages = buildPrompt({
          tier: activeTier,
          messages: [...messages, userMessage],
          contextSnippets,
          toolResult,
        });

        let rawStreamedSoFar = "";
        const output = await withTimeout(
          llmEngine.generate(promptMessages, (token) => {
            rawStreamedSoFar += token;
            const parsed = parseThinkTaggedContent(rawStreamedSoFar);
            setStreamingHasThinkTag(parsed.hasThinkTag);
            setStreamingThinkClosed(parsed.isClosed);
            setStreamingThinking(toThinkingLines(parsed.thinking));
            setStreamingResponse(parsed.response.trimStart());
          }),
          90000,
          "The model is taking too long to respond. Try Lite tier or ensure model assets are downloaded.",
        );
        const parsedOutput = parseThinkTaggedContent(output);
        const cleanedOutput = cleanModelOutput(parsedOutput.response.trimStart());
        const finalThinking = toThinkingLines(parsedOutput.thinking);
        setStreamingHasThinkTag(parsedOutput.hasThinkTag);
        setStreamingThinkClosed(parsedOutput.isClosed);
        setStreamingResponse(cleanedOutput);
        pushMessage({
          ...createMessage("assistant", cleanedOutput),
          thinking: finalThinking.length > 0 ? finalThinking : undefined,
        });
        if (voiceEnabled) {
          await speak(cleanedOutput);
        }
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "Unknown chat error";
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
    ],
  );

  return {
    messages,
    sendMessage,
    streamingResponse,
    streamingThinking,
    streamingHasThinkTag,
    streamingThinkClosed,
    isLoading,
    error,
  };
}

