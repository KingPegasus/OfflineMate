import { resolvePrimaryRuntimeForLoad } from "@/ai/model-manager";
import { resolveModelForTier, type ModelSpec } from "@/ai/model-registry";
import { parseToolActionDecision } from "@/ai/tool-action-schema";
import type { ChatMessage, ModelTier } from "@/types/assistant";
import { LLMModule } from "react-native-executorch/legacy";
import type { LLMModelName, Message } from "react-native-executorch/legacy";

export type LLMInitializeOptions = {
  /** When set, loads this registry model instead of the tier primary. */
  modelId?: string | null;
  /** When true, bypasses onboarding local files and uses runtime model URLs/paths directly. */
  forceRuntimeSources?: boolean;
  /** ExecuTorch reports progress while fetching the model binary from a remote URL (0–1). */
  onDownloadProgress?: (progress: number) => void;
};

// The runtime API in react-native-executorch evolves quickly. This adapter keeps
// app code stable and allows swapping runtime implementations later.
type LLMGenerationConfig = {
  temperature?: number;
  topp?: number;
  minP?: number;
  repetitionPenalty?: number;
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

/** Tier defaults with the model card's recommended sampling (e.g. LFM2.5-VL) layered on top. */
function getGenerationConfig(tier: ModelTier, spec: ModelSpec): LLMGenerationConfig {
  return { ...getGenerationConfigForTier(tier), ...spec.generationOverrides };
}

/**
 * How many later questions still get the photo, so "and the cappuccino?" right after a menu photo
 * works. After that the photo is dropped: re-encoding it costs hundreds of visual tokens and most of
 * the reply time on every turn, and unrelated questions would drift toward it.
 */
export const IMAGE_FOLLOW_UP_TURNS = 1;

/**
 * The native runner only sees an image when the message carries `mediaPath`. Only the newest image
 * is sent, and only on its own turn and the next IMAGE_FOLLOW_UP_TURNS questions.
 */
/** Index of the message whose photo goes to the model this turn, or -1 when no photo is sent. */
function imageMessageIndex(messages: ChatMessage[]): number {
  let index = -1;
  const userIndexes = messages.flatMap((m, i) => (m.role === "user" ? [i] : []));
  for (const i of userIndexes.slice(-(IMAGE_FOLLOW_UP_TURNS + 1))) if (messages[i]!.imageUri) index = i;
  return index;
}

/** True when this turn sends a photo to the model (its own question, or the follow-up right after). */
export function turnSendsImage(messages: ChatMessage[]): boolean {
  return imageMessageIndex(messages) !== -1;
}

export function toRuntimeMessages(messages: ChatMessage[], includeImages: boolean): Message[] {
  const lastImageIndex = includeImages ? imageMessageIndex(messages) : -1;
  return messages.map((m, i) =>
    i === lastImageIndex
      ? { role: m.role, content: m.content, mediaPath: m.imageUri }
      : { role: m.role, content: m.content },
  );
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
  private static readonly POST_INTERRUPT_COOLDOWN_MS = 450;
  /**
   * Retries when the native runner still says it's generating (code 104). Its promise can settle a
   * moment before it is free again, and on a slow phone that moment outlasted the old ~2 s of retries
   * ("The model is currently generating…" seen testing 0.14.0). About 16 s in all.
   */
  private static readonly GENERATE_BUSY_RETRY_DELAYS_MS = [150, 300, 600, 1000, 1500, 2500, 4000, 6000];
  private initializedTier: ModelTier | null = null;
  private initializedModelId: string | null = null;
  /** Text-only models would fail on an image, so images are sent only when the loaded model has vision. */
  private loadedSupportsVision = false;
  private llm: LLMModule | null = null;
  private isLoaded = false;
  /** True while `load()` is in progress; native interrupt can cancel in-flight fetch/download before `isLoaded`. */
  private loadInFlight = false;
  /** Bumped on each new load attempt or cancel; stale loads must not configure after await. */
  private loadGeneration = 0;
  /** Set before generate() to receive tokens as they are produced; cleared in finally. */
  private streamCallback: ((token: string) => void) | null = null;
  /** Timestamp of the last interrupt call; used to avoid immediate post-interrupt re-generate races. */
  private lastInterruptAtMs = 0;
  /**
   * The native generate call in progress. interrupt() only asks it to stop, so the model must not be
   * freed until this settles: deleting it mid-generate crashed in Module::~Module (Play crash on a
   * Kyocera URBANO V04, 0.12.0, from a Settings tap while a reply was still being written).
   */
  private generationInFlight: Promise<unknown> | null = null;
  /** A model waiting to be freed once its generation returns; initialize() waits for it. */
  private pendingDispose: Promise<void> | null = null;

  /** Runs the native generate and records it, so unload() can wait for it before freeing the model. */
  private runNativeGenerate(llm: LLMModule, mapped: Message[]): Promise<string> {
    const run = llm.generate(mapped);
    this.generationInFlight = run;
    const clear = () => {
      if (this.generationInFlight === run) this.generationInFlight = null;
    };
    run.then(clear, clear);
    return run;
  }

  /**
   * A run whose caller gave up (a planning or search step timed out) keeps going natively, and the
   * next request then failed with "The model is currently generating" (code 104; seen testing 0.14.0
   * on the emulator). Stop it and wait for it to end before starting another.
   */
  private async waitForPreviousGeneration(): Promise<void> {
    const running = this.generationInFlight;
    if (!running) return;
    this.interrupt();
    await running.then(
      () => undefined,
      () => undefined,
    );
  }

  private deleteModule(m: LLMModule) {
    try {
      m.delete();
    } catch (e) {
      console.warn("[OfflineMate] LLM unload failed (model may still be in use):", e);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForPostInterruptCooldown(): Promise<void> {
    if (this.lastInterruptAtMs <= 0) return;
    const elapsed = Date.now() - this.lastInterruptAtMs;
    const remaining = LLMEngine.POST_INTERRUPT_COOLDOWN_MS - elapsed;
    if (remaining > 0) {
      await this.sleep(remaining);
    }
  }

  private isModelBusyError(error: unknown): boolean {
    const code = (error as { code?: number })?.code;
    const message = error instanceof Error ? error.message : String(error ?? "");
    return code === 104 || /currently generating/i.test(message);
  }

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
      this.initializedModelId = null;
    }
  }

  async initialize(tier: ModelTier, options?: LLMInitializeOptions) {
    const spec = resolveModelForTier(tier, options?.modelId);
    if (
      this.llm &&
      this.isLoaded &&
      this.initializedTier === tier &&
      this.initializedModelId === spec.id
    ) {
      return spec;
    }

    const myGen = ++this.loadGeneration;

    if (this.llm) {
      this.interrupt();
      this.unload();
    }
    // Free the previous model before loading the next, so two never sit in memory at once.
    if (this.pendingDispose) await this.pendingDispose;
    if (myGen !== this.loadGeneration) throw new Error("Model load cancelled");

    const tokenCallback = (token: string) => this.streamCallback?.(token);

    const onDownloadProgress = options?.onDownloadProgress;
    this.loadInFlight = true;
    try {
      const runtime = await resolvePrimaryRuntimeForLoad(
        tier,
        options?.modelId,
        !options?.forceRuntimeSources,
      );
      // fromModelName (rather than fromCustomModel) so vision models load with their image encoder enabled.
      const moduleForInit = await LLMModule.fromModelName(
        {
          modelName: "custom" as LLMModelName,
          modelSource: runtime.modelSource,
          tokenizerSource: runtime.tokenizerSource,
          tokenizerConfigSource: runtime.tokenizerConfigSource,
          capabilities: spec.capabilities,
          audioConfig: spec.audioConfig,
        },
        onDownloadProgress ?? (() => {}),
        tokenCallback,
      );
      if (myGen !== this.loadGeneration) {
        this.disposeOrphanInitModule(moduleForInit);
        throw new Error("Model load cancelled");
      }
      this.llm = moduleForInit;
      moduleForInit.configure({
        chatConfig: {
          initialMessageHistory: [],
          systemPrompt: "You are OfflineMate, a local private assistant.",
        },
        generationConfig: getGenerationConfig(tier, spec),
      });
      this.isLoaded = true;
      this.initializedTier = tier;
      this.initializedModelId = spec.id;
      this.loadedSupportsVision = spec.capabilities?.includes("vision") ?? false;
      return spec;
    } catch (error) {
      if (myGen === this.loadGeneration && this.llm) {
        this.unload();
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
    const mapped = toRuntimeMessages(messages, this.loadedSupportsVision);
    await this.waitForPostInterruptCooldown();
    let retries = 0;
    let buffer = "";
    while (true) {
      const previousBufferLength = buffer.length;
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
      await this.waitForPreviousGeneration();
      // unload() may run between retries; never call into a freed model.
      const llm = this.llm;
      if (!llm) throw new Error("Model unloaded");
      try {
        return await this.runNativeGenerate(llm, mapped);
      } catch (e) {
        if (buffer.length > previousBufferLength) return buffer;
        if (this.isModelBusyError(e) && retries < LLMEngine.GENERATE_BUSY_RETRY_DELAYS_MS.length) {
          const delayMs = LLMEngine.GENERATE_BUSY_RETRY_DELAYS_MS[retries]!;
          retries += 1;
          console.warn("[OfflineMate] LLM generate busy after interrupt; retrying in", delayMs, "ms");
          this.interrupt();
          await this.sleep(delayMs);
          continue;
        }
        throw e;
      } finally {
        this.streamCallback = null;
      }
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

    const mapped = toRuntimeMessages(messages, this.loadedSupportsVision);
    await this.waitForPostInterruptCooldown();
    let retries = 0;
    while (true) {
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
      await this.waitForPreviousGeneration();
      // unload() may run between retries; never call into a freed model.
      const llm = this.llm;
      if (!llm) throw new Error("Model unloaded");
      try {
        return await this.runNativeGenerate(llm, mapped);
      } catch (error) {
        if (this.isModelBusyError(error) && retries < LLMEngine.GENERATE_BUSY_RETRY_DELAYS_MS.length) {
          const delayMs = LLMEngine.GENERATE_BUSY_RETRY_DELAYS_MS[retries]!;
          retries += 1;
          console.warn("[OfflineMate] LLM generate busy after interrupt; retrying in", delayMs, "ms");
          this.interrupt();
          await this.sleep(delayMs);
          continue;
        }
        throw error;
      } finally {
        this.streamCallback = null;
      }
    }
  }

  interrupt() {
    if (!this.llm || (!this.isLoaded && !this.loadInFlight)) {
      return;
    }
    this.lastInterruptAtMs = Date.now();
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
    const m = this.llm;
    this.llm = null;
    this.isLoaded = false;
    this.initializedTier = null;
    this.initializedModelId = null;
    if (!m) return;
    if (typeof (m as { interrupt?: () => void }).interrupt === "function") {
      try {
        (m as { interrupt: () => void }).interrupt();
      } catch (e) {
        const code = (e as { code?: number })?.code;
        const msg = e instanceof Error ? e.message : String(e);
        if (code !== 102 && !/not loaded/i.test(msg)) {
          console.warn("[OfflineMate] LLM interrupt before unload failed:", e);
        }
      }
    }
    const running = this.generationInFlight;
    if (!running) {
      this.deleteModule(m);
      return;
    }
    // A reply is still being written: free the model only once the interrupted generate returns.
    const dispose = running
      .then(
        () => undefined,
        () => undefined,
      )
      .then(() => this.deleteModule(m));
    this.pendingDispose = dispose;
    void dispose.then(() => {
      if (this.pendingDispose === dispose) this.pendingDispose = null;
    });
  }
}

export const llmEngine = new LLMEngine();

