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

vi.mock("react-native-executorch/legacy", () => {
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
    static async fromModelName() {
      return new MockLLMModule();
    }
    static async fromCustomModel() {
      return new MockLLMModule();
    }
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
    QWEN3_5_2B_QUANTIZED: modelStub,
    LLAMA3_2_1B_SPINQUANT: modelStub,
    LLAMA3_2_3B_SPINQUANT: modelStub,
    LFM2_5_350M_QUANTIZED: modelStub,
    LFM2_5_VL_450M_QUANTIZED: { ...modelStub, capabilities: ["vision"], generationConfig: { temperature: 0.1 } },
    LFM2_5_VL_1_6B_QUANTIZED: { ...modelStub, capabilities: ["vision"], generationConfig: { temperature: 0.1 } },
    models: {
      llm: {
        gemma4_e2b: () => modelStub,
        gemma4_e2b_multimodal: () => ({
          ...modelStub,
          capabilities: ["vision", "audio"],
          audioConfig: { samplesPerBlock: 7680, tokensPerBlock: 12 },
        }),
      },
    },
  };
});

// Gallery images (src/utils/chat-images.ts): native pickers and file I/O are stubbed in Node.
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: vi.fn(async () => ({ canceled: true, assets: null })),
}));
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
  manipulateAsync: vi.fn(async () => ({ uri: "file:///cache/out.jpg", width: 1024, height: 768 })),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  getInfoAsync: vi.fn(async () => ({ exists: true })),
  makeDirectoryAsync: vi.fn(async () => undefined),
  moveAsync: vi.fn(async () => undefined),
  deleteAsync: vi.fn(async () => undefined),
  readDirectoryAsync: vi.fn(async () => [] as string[]),
}));
vi.mock("expo-network", () => ({
  NetworkStateType: { CELLULAR: "CELLULAR", WIFI: "WIFI", NONE: "NONE", UNKNOWN: "UNKNOWN" },
  getNetworkStateAsync: vi.fn(async () => ({ type: "WIFI", isConnected: true, isInternetReachable: true })),
}));
