import type { ChatMessage, ModelTier } from "@/types/assistant";

export function getSlidingWindow(messages: ChatMessage[], tier: ModelTier) {
  const turns = tier === "full" ? 6 : tier === "standard" ? 4 : 2;
  return messages.slice(-turns * 2);
}

