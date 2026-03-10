import { getTierSpec } from "@/ai/model-registry";
import type { ChatMessage, ModelTier } from "@/types/assistant";
import { LLMModule } from "react-native-executorch";
import type { Message } from "react-native-executorch";

// The runtime API in react-native-executorch evolves quickly. This adapter keeps
// app code stable and allows swapping runtime implementations later.
// Optional constructor options for streaming; not all type definitions expose this.
type LLMModuleOptions = { tokenCallback?: (token: string) => void };
type LLMGenerationConfig = {
  temperature?: number;
  topp?: number;
  outputTokenBatchSize?: number;
  batchTimeInterval?: number;
};

function getGenerationConfigForTier(tier: ModelTier): LLMGenerationConfig {
  if (tier === "lite") {
    return {
      // Lower randomness helps tiny models avoid drift and repetition loops.
      temperature: 0.25,
      topp: 0.8,
      outputTokenBatchSize: 8,
      batchTimeInterval: 35,
    };
  }
  if (tier === "standard") {
    return {
      temperature: 0.35,
      topp: 0.85,
      outputTokenBatchSize: 10,
      batchTimeInterval: 30,
    };
  }
  return {
    temperature: 0.45,
    topp: 0.9,
    outputTokenBatchSize: 12,
    batchTimeInterval: 25,
  };
}

function shouldInterruptForRepetition(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length < 120) {
    return false;
  }

  // Detect repeated sentence blocks such as "I was trying... I was trying...".
  const sentences = normalized
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 18);
  const tail = sentences.slice(-8);
  if (tail.length >= 4) {
    const counts = new Map<string, number>();
    for (const sentence of tail) {
      const next = (counts.get(sentence) ?? 0) + 1;
      counts.set(sentence, next);
      if (next >= 3) {
        return true;
      }
    }
  }

  // Detect repeated ngram patterns in the recent tail.
  const recent = normalized.slice(-420);
  const words = recent.split(" ").filter(Boolean);
  if (words.length < 24) {
    return false;
  }
  for (let n = 6; n >= 4; n -= 1) {
    const chunk = words.slice(words.length - n).join(" ");
    if (chunk.length < 20) continue;
    let repeats = 0;
    let idx = recent.indexOf(chunk);
    while (idx !== -1) {
      repeats += 1;
      idx = recent.indexOf(chunk, idx + chunk.length);
      if (repeats >= 4) {
        return true;
      }
    }
  }
  return false;
}

export class LLMEngine {
  private initializedTier: ModelTier | null = null;
  private llm: LLMModule | null = null;
  private isLoaded = false;
  /** Set before generate() to receive tokens as they are produced; cleared in finally. */
  private streamCallback: ((token: string) => void) | null = null;

  async initialize(tier: ModelTier) {
    const previousTier = this.initializedTier;

    // If caller switches tiers, force a fresh module load/config so runtime
    // settings (context window, generation config) always match the active tier.
    if (this.llm && this.isLoaded && previousTier && previousTier !== tier) {
      this.unload();
    }

    if (!this.llm) {
      const opts: LLMModuleOptions = {
        tokenCallback: (token: string) => this.streamCallback?.(token),
      };
      // Library supports tokenCallback in constructor for streaming; types may not expose it.
      this.llm = new LLMModule(opts as never);
    }

    if (!this.isLoaded) {
      const spec = getTierSpec(tier).primary;
      try {
        await this.llm.load(spec.runtime);
        this.llm.configure({
          chatConfig: {
            contextWindowLength: tier === "full" ? 8192 : tier === "standard" ? 4096 : 2048,
            initialMessageHistory: [],
            systemPrompt: "You are OfflineMate, a local private assistant.",
          },
          generationConfig: getGenerationConfigForTier(tier),
        });
        this.isLoaded = true;
        this.initializedTier = tier;
        return spec;
      } catch (error) {
        // Prevent partially loaded state from leaking into fallback initialization.
        this.unload();
        throw error;
      }
    }

    this.initializedTier = tier;
    return getTierSpec(tier).primary;
  }

  async generate(
    messages: ChatMessage[],
    onToken?: (token: string) => void,
  ): Promise<string> {
    if (!this.llm || !this.isLoaded) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      return `OfflineMate fallback response: ${lastUser?.content ?? "hello"}`;
    }

    const mapped: Message[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    let streamText = "";
    let interruptedForLoop = false;
    this.streamCallback = (token: string) => {
      streamText += token;
      onToken?.(token);
      if (!interruptedForLoop && shouldInterruptForRepetition(streamText)) {
        interruptedForLoop = true;
        try {
          this.llm?.interrupt();
        } catch (error) {
          console.warn("[OfflineMate] Failed to interrupt repetitive generation:", error);
        }
      }
    };
    try {
      return await this.llm.generate(mapped);
    } finally {
      this.streamCallback = null;
    }
  }

  interrupt() {
    try {
      if (this.llm && typeof (this.llm as { interrupt?: () => void }).interrupt === "function") {
        (this.llm as { interrupt: () => void }).interrupt();
      }
    } catch (error) {
      console.warn("[OfflineMate] LLM interrupt failed:", error);
    }
  }

  unload() {
    if (!this.llm) {
      this.isLoaded = false;
      this.initializedTier = null;
      return;
    }
    try {
      if (typeof (this.llm as { interrupt?: () => void }).interrupt === "function") {
        (this.llm as { interrupt: () => void }).interrupt();
      }
      this.llm.delete();
    } catch (e) {
      console.warn("[OfflineMate] LLM unload failed (model may still be in use):", e);
    } finally {
      this.llm = null;
      this.isLoaded = false;
      this.initializedTier = null;
    }
  }
}

export const llmEngine = new LLMEngine();

