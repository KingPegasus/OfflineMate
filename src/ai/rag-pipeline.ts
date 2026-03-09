import { searchRelevantContext } from "@/context/vector-store";
import type { ModelTier } from "@/types/assistant";

export async function retrieveContextForQuery(query: string, tier: ModelTier): Promise<string[]> {
  if (tier === "lite") return [];
  const topK = tier === "full" ? 10 : 6;
  const minSimilarity = tier === "full" ? 0.38 : 0.42;
  const raw = await searchRelevantContext(query, topK * 2, minSimilarity);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const snippet of raw) {
    const normalized = snippet.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(snippet);
    if (deduped.length >= topK) break;
  }
  return deduped;
}

