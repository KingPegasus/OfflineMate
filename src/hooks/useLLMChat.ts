import { useCallback } from "react";
import { llmEngine } from "@/ai/llm-engine";
import { getFallbackTier } from "@/ai/model-registry";
import { routeIntent } from "@/ai/intent-router";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";
import { buildPrompt } from "@/ai/prompt-builder";
import { selectToolFromInput } from "@/tools/tool-registry";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";
import { speak } from "@/voice/tts-engine";
import { isMemoryPressureHigh } from "@/utils/performance";
import { saveImportantMemory } from "@/context/long-term-memory";
import { planStepsFromPrompt } from "@/ai/agent-planner";
import type { ChatMessage } from "@/types/assistant";

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
  const setStreamingResponse = useChatStore((s) => s.setStreamingResponse);
  const tier = useSettingsStore((s) => s.selectedTier);
  const setTier = useSettingsStore((s) => s.setSelectedTier);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage = createMessage("user", content);
      pushMessage(userMessage);
      if (content.toLowerCase().startsWith("remember ")) {
        saveImportantMemory(content.replace(/^remember\s+/i, ""));
      }
      setLoading(true);
      setError(null);
      setStreamingResponse("");
      try {
        try {
          await llmEngine.initialize(tier);
        } catch {
          const fallback = getFallbackTier(tier);
          if (fallback) {
            setTier(fallback);
            await llmEngine.initialize(fallback);
          } else {
            throw new Error("Unable to initialize any model tier.");
          }
        }

        if (await isMemoryPressureHigh() && tier === "full") {
          setTier("standard");
        }
        const intent = routeIntent(content);
        let contextSnippets: string[] = [];
        let toolResult: string | undefined;

        if (intent === "context") {
          contextSnippets = await retrieveContextForQuery(content, tier);
        } else if (intent === "tool") {
          const tool = selectToolFromInput(content);
          if (tool) {
            const result = await tool.execute({ query: content, text: content });
            toolResult = result.message;
          }
        }
        if (tier === "full") {
          const steps = planStepsFromPrompt(content);
          toolResult = [toolResult, `Plan: ${steps.map((s) => s.description).join(" -> ")}`]
            .filter(Boolean)
            .join("\n");
        }

        const promptMessages = buildPrompt({
          tier,
          messages: [...messages, userMessage],
          contextSnippets,
          toolResult,
        });

        const output = await llmEngine.generate(promptMessages);
        setStreamingResponse(output);
        pushMessage(createMessage("assistant", output));
        if (voiceEnabled) {
          await speak(output);
        }
      } catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "Unknown chat error";
        setError(message);
      } finally {
        setLoading(false);
        setStreamingResponse("");
      }
    },
    [messages, pushMessage, setLoading, setError, setStreamingResponse, setTier, tier, voiceEnabled],
  );

  return {
    messages,
    sendMessage,
    streamingResponse,
    isLoading,
    error,
  };
}

