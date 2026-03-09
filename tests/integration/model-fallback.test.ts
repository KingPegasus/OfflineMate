import { getFallbackTier } from "@/ai/model-registry";

describe("model fallback chain", () => {
  it("falls back full -> standard -> lite", () => {
    expect(getFallbackTier("full")).toBe("standard");
    expect(getFallbackTier("standard")).toBe("lite");
    expect(getFallbackTier("lite")).toBeNull();
  });
});
