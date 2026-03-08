import { searchRelevantContext } from "@/context/vector-store";
import type { ModelTier } from "@/types/assistant";

export async function retrieveContextForQuery(query: string, tier: ModelTier): Promise<string[]> {
  if (tier === "lite") return [];
  const topK = tier === "full" ? 8 : 5;
  return searchRelevantContext(query, topK, 0.42);
}

