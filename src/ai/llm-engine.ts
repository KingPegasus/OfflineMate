import { getTierSpec } from "@/ai/model-registry";
import type { ChatMessage, ModelTier } from "@/types/assistant";
import { LLMModule } from "react-native-executorch";
import type { Message } from "react-native-executorch";

// The runtime API in react-native-executorch evolves quickly. This adapter keeps
// app code stable and allows swapping runtime implementations later.
export class LLMEngine {
  private initializedTier: ModelTier | null = null;
  private llm: LLMModule | null = null;
  private isLoaded = false;

  async initialize(tier: ModelTier) {
    this.initializedTier = tier;
    if (!this.llm) {
      this.llm = new LLMModule();
    }

    if (!this.isLoaded) {
      const spec = getTierSpec(tier).primary;
      await this.llm.load(spec.runtime);
      this.llm.configure({
        chatConfig: {
          contextWindowLength: tier === "full" ? 8192 : tier === "standard" ? 4096 : 2048,
          initialMessageHistory: [],
          systemPrompt: "You are OfflineMate, a local private assistant.",
        },
      });
      this.isLoaded = true;
      return spec;
    }

    return getTierSpec(tier).primary;
  }

  async generate(messages: ChatMessage[]) {
    if (!this.llm || !this.isLoaded) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      return `OfflineMate fallback response: ${lastUser?.content ?? "hello"}`;
    }

    const mapped: Message[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    return this.llm.generate(mapped);
  }

  unload() {
    this.llm?.delete();
    this.llm = null;
    this.isLoaded = false;
    this.initializedTier = null;
  }
}

export const llmEngine = new LLMEngine();

