/**
 * Feature flags for staged rollout. Toggle here or replace with remote config.
 */
export const FEATURE_FLAGS = {
  reminderSoundV2: true,
  calendarReadWriteV1: true,
  androidAlarmV1: true,
  webSearchV1: true,
} as const;

export function isEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
