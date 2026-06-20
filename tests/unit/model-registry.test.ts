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

  it("resolveModelForTier falls back to primary for unknown ids", () => {
    expect(resolveModelForTier("standard", "not-a-model").id).toBe("gemma4-e2b");
  });
});
