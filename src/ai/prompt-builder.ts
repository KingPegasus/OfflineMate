import { getSlidingWindow } from "@/context/memory-manager";
import { getImportantMemories } from "@/context/long-term-memory";
import { approximateTokenCount } from "@/utils/tokenizer";
import type { ChatMessage, ModelTier } from "@/types/assistant";

interface PromptBuildInput {
  tier: ModelTier;
  messages: ChatMessage[];
  contextSnippets?: string[];
  /** User asked a memory/RAG-style question but retrieval returned nothing (Standard/Full). */
  contextLookupEmpty?: boolean;
  toolResult?: string;
}

export function buildPrompt(input: PromptBuildInput): ChatMessage[] {
  const { tier, messages, contextSnippets = [], contextLookupEmpty = false, toolResult } = input;
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
  const contextChars = selectedContext.reduce((n, s) => n + s.length, 0);
  const contextText =
    selectedContext.length > 0
      ? [
          "Retrieved text from the user's indexed notes (semantic search).",
          `There are exactly ${selectedContext.length} passage(s) below (${contextChars} characters total). This is ALL that was retrieved—there are no other hidden passages.`,
          "Answer ONLY from this text: quote it or paraphrase in one or two sentences. If the passage mentions the topic (even briefly), summarize what it says—short notes are valid; do not refuse for 'insufficient context'.",
          "Only say you found nothing relevant if the passage truly does not relate to the user's question.",
          "Do NOT invent extra passages, bullet lists of fake excerpts, or facts that are not in the text below—including inside <redacted_thinking>. If you use <redacted_thinking>, restate only what appears under Context.",
          "",
          "Context:",
          selectedContext.join("\n"),
        ].join("\n")
      : "";
  const emptyContextHint =
    contextLookupEmpty && selectedContext.length === 0
      ? "The user asked about their saved or indexed notes, but no relevant passages were retrieved. Reply briefly that you did not find matching notes—not a generic unrelated answer."
      : "";
  const toolText = toolResult
    ? `Tool output:\n${toolResult}\n\nIMPORTANT: You MUST reply to the user with a brief natural confirmation. Never skip the response or return raw JSON.`
    : "";
  const memories = getImportantMemories(5);
  const memoryText =
    memories.length > 0
      ? `User asked to remember:\n${memories.map((m) => `- ${m.content}`).join("\n")}`
      : "";
  const systemPrompt = [systemBase, memoryText, emptyContextHint, contextText, toolText]
    .filter(Boolean)
    .join("\n\n");

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

