import { vi } from "vitest";
import { retrieveContextForQuery } from "@/ai/rag-pipeline";

vi.mock("@/context/vector-store", () => ({
  searchRelevantContext: vi.fn(async () => [
    "Same snippet",
    "Same   snippet",
    "Unique snippet",
    "Another one",
  ]),
}));

describe("rag pipeline integration", () => {
  it("skips retrieval for lite tier", async () => {
    const result = await retrieveContextForQuery("q", "lite");
    expect(result).toEqual([]);
  });

  it("deduplicates retrieved snippets for standard/full tiers", async () => {
    const result = await retrieveContextForQuery("q", "standard");
    expect(result.length).toBeGreaterThan(1);
    expect(result.filter((x) => x.toLowerCase().includes("same")).length).toBe(1);
  });
});
