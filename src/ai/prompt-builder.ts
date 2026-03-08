import { getSlidingWindow } from "@/context/memory-manager";
import { approximateTokenCount } from "@/utils/tokenizer";
import type { ChatMessage, ModelTier } from "@/types/assistant";

interface PromptBuildInput {
  tier: ModelTier;
  messages: ChatMessage[];
  contextSnippets?: string[];
  toolResult?: string;
}

export function buildPrompt(input: PromptBuildInput): ChatMessage[] {
  const { tier, messages, contextSnippets = [], toolResult } = input;
  const systemBase =
    tier === "lite"
      ? "You are OfflineMate. Keep answers short and practical."
      : "You are OfflineMate, a private on-device assistant. Be concise and accurate.";
  const contextBudget = tier === "full" ? 500 : tier === "standard" ? 250 : 0;
  const selectedContext: string[] = [];
  let usedBudget = 0;
  for (const snippet of contextSnippets) {
    const tokens = approximateTokenCount(snippet);
    if (usedBudget + tokens > contextBudget) break;
    selectedContext.push(snippet);
    usedBudget += tokens;
  }
  const contextText = selectedContext.length > 0 ? `Context:\n${selectedContext.join("\n")}` : "";
  const toolText = toolResult ? `Tool output:\n${toolResult}` : "";
  const systemPrompt = [systemBase, contextText, toolText].filter(Boolean).join("\n\n");

  return [
    {
      id: "system",
      role: "system",
      content: systemPrompt,
      createdAt: Date.now(),
    },
    ...getSlidingWindow(messages, tier),
  ];
}

