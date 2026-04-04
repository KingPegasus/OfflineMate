import { resolvePrimaryRuntimeForLoad } from "@/ai/model-manager";
import { getTierSpec } from "@/ai/model-registry";
import { parseToolActionDecision } from "@/ai/tool-action-schema";
import type { ChatMessage, ModelTier } from "@/types/assistant";
import { LLMModule } from "react-native-executorch";
import type { Message } from "react-native-executorch";

export type LLMInitializeOptions = {
  /** ExecuTorch reports progress while fetching the model binary from a remote URL (0–1). */
  onDownloadProgress?: (progress: number) => void;
};

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
  /** True while `load()` is in progress; native interrupt can cancel in-flight fetch/download before `isLoaded`. */
  private loadInFlight = false;
  /** Bumped on each new load attempt or cancel; stale loads must not configure after await. */
  private loadGeneration = 0;
  /** Set before generate() to receive tokens as they are produced; cleared in finally. */
  private streamCallback: ((token: string) => void) | null = null;

  /**
   * Call when init times out or user switches tier mid-load. Stops overlapping native downloads
   * (ExecuTorch error 181 "Already downloading this file") when fallback init runs immediately after.
   */
  cancelPendingLoad() {
    this.loadGeneration += 1;
    this.interrupt();
    this.unload();
    /** Cancel ends any in-flight load; stale `initialize` finally must not leave this stuck true. */
    this.loadInFlight = false;
  }

  /**
   * Tear down a specific `LLMModule` from a superseded init without touching the singleton when
   * a newer `initialize()` already replaced `this.llm` (timeout → fallback race).
   */
  private disposeOrphanInitModule(m: LLMModule) {
    try {
      if (typeof (m as { interrupt?: () => void }).interrupt === "function") {
        try {
          (m as { interrupt: () => void }).interrupt();
        } catch (e) {
          const code = (e as { code?: number })?.code;
          const msg = e instanceof Error ? e.message : String(e);
          if (code !== 102 && !/not loaded/i.test(msg)) {
            console.warn("[OfflineMate] LLM interrupt failed (orphan init):", e);
          }
        }
      }
      m.delete();
    } catch (e) {
      console.warn("[OfflineMate] LLM orphan init dispose failed:", e);
    }
    if (this.llm === m) {
      this.llm = null;
      this.isLoaded = false;
      this.initializedTier = null;
    }
  }

  async initialize(tier: ModelTier, options?: LLMInitializeOptions) {
    if (this.llm && this.isLoaded && this.initializedTier === tier) {
      return getTierSpec(tier).primary;
    }

    const myGen = ++this.loadGeneration;

    if (this.llm) {
      this.interrupt();
      this.unload();
    }

    const opts: LLMModuleOptions = {
      tokenCallback: (token: string) => this.streamCallback?.(token),
    };
    this.llm = new LLMModule(opts as never);
    const moduleForInit = this.llm;

    const spec = getTierSpec(tier).primary;
    const onDownloadProgress = options?.onDownloadProgress;
    this.loadInFlight = true;
    try {
      const runtime = await resolvePrimaryRuntimeForLoad(tier);
      await moduleForInit.load(runtime, onDownloadProgress ?? (() => {}));
      if (myGen !== this.loadGeneration) {
        this.disposeOrphanInitModule(moduleForInit);
        throw new Error("Model load cancelled");
      }
      moduleForInit.configure({
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
      if (myGen === this.loadGeneration) {
        this.unload();
      } else {
        this.disposeOrphanInitModule(moduleForInit);
      }
      throw error;
    } finally {
      if (myGen === this.loadGeneration) {
        this.loadInFlight = false;
      }
    }
  }

  /**
   * Generate with a soft token cap. Uses onToken to accumulate output and interrupts
   * when we hit maxNewTokens (approximate) or when we have parseable JSON.
   * If the run is interrupted, returns the accumulated buffer so the caller can parse it.
   */
  async generateWithMaxTokens(
    messages: ChatMessage[],
    maxNewTokens: number,
    onToken?: (token: string) => void,
  ): Promise<string> {
    if (!this.llm || !this.isLoaded) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      return `OfflineMate fallback response: ${lastUser?.content ?? "hello"}`;
    }
    const mapped: Message[] = messages.map((m) => ({ role: m.role, content: m.content }));
    let buffer = "";
    const charLimit = Math.max(maxNewTokens * 3, 100);
    let interruptedForCap = false;
    this.streamCallback = (token: string) => {
      buffer += token;
      onToken?.(token);
      if (interruptedForCap) return;
      // Only strict JSON parse for early-stop; lenient parser is for complete output in agentic-search-flow
      const decision = parseToolActionDecision(buffer);
      if (decision || buffer.length >= charLimit) {
        interruptedForCap = true;
        try {
          this.interrupt();
        } catch (e) {
          console.warn("[OfflineMate] generateWithMaxTokens interrupt failed:", e);
        }
      }
    };
    try {
      return await this.llm.generate(mapped);
    } catch (e) {
      if (buffer.length > 0) return buffer;
      throw e;
    } finally {
      this.streamCallback = null;
    }
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
    if (!this.llm || (!this.isLoaded && !this.loadInFlight)) {
      return;
    }
    try {
      if (typeof (this.llm as { interrupt?: () => void }).interrupt === "function") {
        (this.llm as { interrupt: () => void }).interrupt();
      }
    } catch (error) {
      const code = (error as { code?: number })?.code;
      const msg = error instanceof Error ? error.message : String(error);
      if (code === 102 || /not loaded/i.test(msg)) {
        return;
      }
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
      if (
        (this.isLoaded || this.loadInFlight) &&
        typeof (this.llm as { interrupt?: () => void }).interrupt === "function"
      ) {
        try {
          (this.llm as { interrupt: () => void }).interrupt();
        } catch (e) {
          const code = (e as { code?: number })?.code;
          const msg = e instanceof Error ? e.message : String(e);
          if (code !== 102 && !/not loaded/i.test(msg)) {
            console.warn("[OfflineMate] LLM interrupt before unload failed:", e);
          }
        }
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

