import type { ModelTier } from "@/types/assistant";

/**
 * Which size to suggest for a phone, from the RAM it reports (GB). Pure so it can be unit-tested;
 * device-profiler reads the real value.
 *
 * RAM alone decides, because the model has to fit beside Android and other apps (about 2–3.5 GB on a
 * typical phone): Balanced peaks around 2.5–3 GB with a photo, so it needs a 6 GB phone (reports about
 * 5.5 GB). Until 0.14.0 a 2021+ device year class also counted, which suggested Balanced to 4 GB phones
 * where it doesn't fit; on Android that year class is partly derived from RAM anyway.
 */
export function recommendTierForDevice(ramGb: number): ModelTier {
  if (ramGb >= 10) return "full";
  if (ramGb >= 5) return "standard";
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
