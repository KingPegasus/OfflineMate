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

/** RAM sizes phones are sold with. */
const SOLD_RAM_GB = [1, 2, 3, 4, 6, 8, 12, 16, 18, 24, 32];

/**
 * The RAM a phone is sold with, from the total Android or iOS reports, which is lower because the
 * system reserves some (an 8 GB phone reports about 7.6 GB).
 */
export function soldRamGb(reportedGb: number): number {
  return SOLD_RAM_GB.find((size) => size >= reportedGb) ?? Math.ceil(reportedGb);
}

/** "Your phone has 8 GB of RAM.", so people can match it to the sizes' RAM labels. */
export function describePhoneRam(reportedGb: number | null): string | null {
  if (reportedGb === null || !Number.isFinite(reportedGb) || reportedGb <= 0) return null;
  return `Your phone has ${soldRamGb(reportedGb)} GB of RAM.`;
}
