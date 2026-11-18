import fs from "node:fs";
import path from "node:path";
import { getModelsForTier, MODEL_TIERS, modelSupportsVision } from "@/ai/model-registry";

// Normalise line endings: a Windows checkout with core.autocrlf has CRLF files.
const listing = fs
  .readFileSync(path.join(process.cwd(), "assets", "play-store-listing", "listing.md"), "utf8")
  .replace(/\r\n/g, "\n");

function block(name: string): string {
  const match = listing.match(new RegExp(`<!-- listing:${name} -->\\n([\\s\\S]*?)\\n<!-- /listing:${name} -->`));
  if (!match) throw new Error(`listing block ${name} missing`);
  return match[1]!;
}

describe("Play store listing text", () => {
  it.each([
    ["title", 30],
    ["short", 80],
    ["full", 4000],
    ["whatsnew", 500],
  ] as const)("%s fits Play's %i-character limit", (name, max) => {
    expect([...block(name)].length).toBeLessThanOrEqual(max);
  });

  it("names every vision model the app offers", () => {
    const full = block("full");
    for (const tier of MODEL_TIERS) {
      for (const model of getModelsForTier(tier.key).filter(modelSupportsVision)) {
        expect(full, `${model.family} ${model.size}`).toContain(`${model.family} ${model.size}`);
      }
    }
  });

  it("states the largest model download", () => {
    const largestMb = Math.max(...MODEL_TIERS.flatMap((t) => getModelsForTier(t.key).map((m) => m.estimatedSizeMb)));
    // Same rounding as the website (website-content.test.ts) and formatBytes: 1000 MB = 1 GB.
    expect(block("full")).toContain(`${(largestMb / 1000).toFixed(1)} GB`);
  });

  it("uses no competitor app names", () => {
    expect(listing.slice(0, listing.indexOf("## Keyword plan"))).not.toMatch(/ChatGPT|Gemini|Copilot|DeepSeek|Perplexity|Grok/);
  });
});
