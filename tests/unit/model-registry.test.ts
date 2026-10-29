import {
  getModelsForTier,
  resolveModelForTier,
} from "@/ai/model-registry";

describe("model registry", () => {
  it("lists standard primary and alternates including Qwen 3.5 2B and Gemma 4 E2B", () => {
    const models = getModelsForTier("standard");
    const ids = models.map((m) => m.id);
    expect(ids).toContain("qwen3-1.7b");
    expect(ids).toContain("qwen3.5-2b");
    expect(ids).toContain("gemma4-e2b");
  });

  it("resolveModelForTier uses primary when modelId is null", () => {
    const spec = resolveModelForTier("standard", null);
    expect(spec.id).toBe("gemma4-e2b");
  });

  it("resolveModelForTier resolves known alternates", () => {
    expect(resolveModelForTier("standard", "qwen3.5-2b").family).toBe("Qwen 3.5");
    expect(resolveModelForTier("standard", "gemma4-e2b").provider).toBe("gemma");
  });

  it("lists react-native-executorch 0.11 additions per tier", () => {
    expect(getModelsForTier("lite").map((m) => m.id)).toContain("lfm2.5-350m");
    expect(getModelsForTier("standard").map((m) => m.id)).toContain("minicpm5-2b");
    expect(getModelsForTier("full").map((m) => m.id)).toContain("lfm2.5-2.6b");
  });

  it("points MiniCPM5 and LFM 2.5 2.6B at v0.11.0 assets", () => {
    for (const [tier, id] of [
      ["standard", "minicpm5-2b"],
      ["full", "lfm2.5-2.6b"],
    ] as const) {
      const { runtime } = resolveModelForTier(tier, id);
      expect(runtime.modelSource).toMatch(/\/resolve\/v0\.11\.0\/.+_xnnpack_8da4w\.pte$/);
      expect(runtime.tokenizerSource).toMatch(/\/resolve\/v0\.11\.0\/.*tokenizer\.json$/);
      expect(runtime.tokenizerConfigSource).toMatch(/\/resolve\/v0\.11\.0\/.*tokenizer_config\.json$/);
    }
  });

  it("resolveModelForTier falls back to primary for unknown ids", () => {
    expect(resolveModelForTier("standard", "not-a-model").id).toBe("gemma4-e2b");
  });
});
