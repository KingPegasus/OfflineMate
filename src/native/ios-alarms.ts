import { requireOptionalNativeModule } from "expo";

export type AlarmAuthorization = "authorized" | "denied" | "notDetermined" | "unavailable";

interface OfflineMateAlarmKit {
  isAvailable(): boolean;
  requestAuthorization(): Promise<AlarmAuthorization>;
  scheduleAlarm(epochSeconds: number, title: string, stopLabel: string): Promise<string>;
}

/**
 * The local AlarmKit module (`modules/alarmkit`). It's only compiled into iOS builds, and
 * `requireOptionalNativeModule` returns null instead of throwing where it's missing (Android,
 * tests), so importing this file is always safe — unlike `expo-alarm` on iOS.
 */
const native = requireOptionalNativeModule<OfflineMateAlarmKit>("OfflineMateAlarmKit");

/** True on iOS 26+ (AlarmKit). False on older iOS and on Android. */
export function isIosAlarmKitAvailable(): boolean {
  return native?.isAvailable() ?? false;
}

/**
 * Asks for alarm permission the first time; later calls return the saved choice.
 * Note: the iOS 27 simulator returns "denied" without showing the prompt (Apple forums thread
 * 849449); turning Alarms on in the simulator's Settings works. Real devices show the prompt.
 */
export async function requestIosAlarmAuthorization(): Promise<AlarmAuthorization> {
  return native ? native.requestAuthorization() : "unavailable";
}

/** Schedules a one-time system alarm and returns its id. Rejects if unavailable or not allowed. */
export async function scheduleIosAlarm(date: Date, title: string, stopLabel = "Stop"): Promise<string> {
  if (!native) throw new Error("Alarms need iOS 26 or newer");
  return native.scheduleAlarm(Math.floor(date.getTime() / 1000), title, stopLabel);
}
