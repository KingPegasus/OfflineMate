import type { ModelTier } from "@/types/assistant";

export const QWEN35_MIGRATION_FLAG = false;

export function getQwen35TargetForTier(tier: ModelTier) {
  if (tier === "lite") return "qwen3.5-0.8b";
  if (tier === "standard") return "qwen3.5-2b";
  return "qwen3.5-4b";
}

export function canUseQwen35() {
  return QWEN35_MIGRATION_FLAG;
}

