import type { ModelTier } from "@/types/assistant";

/**
 * Which size to suggest for a phone, from its memory (GB) and Expo's device year class.
 * Pure so it can be unit-tested; device-profiler reads the real values.
 */
export function recommendTierForDevice(ramGb: number, yearClass: number | null | undefined): ModelTier {
  const year = yearClass ?? 0;
  if (ramGb >= 10 || year >= 2024) return "full";
  if (ramGb >= 5 || year >= 2021) return "standard";
  return "lite";
}

/** "Balanced · 2.6 GB download", the headline on the onboarding card. */
export function describeRecommendation(tierLabel: string, downloadSize: string | null): string {
  return downloadSize ? `${tierLabel} · ${downloadSize} download` : tierLabel;
}
