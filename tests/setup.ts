import { vi } from "vitest";

const secureStoreMemory = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureStoreMemory.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStoreMemory.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    secureStoreMemory.delete(key);
  }),
}));

vi.mock("react-native-executorch", () => {
  const modelStub = {
    modelSource: "mock-model",
    tokenizerSource: "mock-tokenizer",
    tokenizerConfigSource: "mock-tokenizer-config",
  };
  class MockTextEmbeddingsModule {
    async load() {
      return undefined;
    }
    async forward(input: string) {
      const seed = Array.from(input).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return Array.from({ length: 384 }, (_, i) => ((seed + i) % 97) / 97);
    }
  }
  class MockLLMModule {
    async load() {
      return undefined;
    }
    configure() {
      return undefined;
    }
    async generate() {
      return "mock-llm-output";
    }
    delete() {
      return undefined;
    }
  }
  return {
    LLMModule: MockLLMModule,
    TextEmbeddingsModule: MockTextEmbeddingsModule,
    ALL_MINILM_L6_V2: modelStub,
    SMOLLM2_1_135M_QUANTIZED: modelStub,
    SMOLLM2_1_360M_QUANTIZED: modelStub,
    SMOLLM2_1_1_7B_QUANTIZED: modelStub,
    QWEN3_1_7B_QUANTIZED: modelStub,
    QWEN3_4B_QUANTIZED: modelStub,
    LLAMA3_2_1B_SPINQUANT: modelStub,
    LLAMA3_2_3B_SPINQUANT: modelStub,
  };
});
