import { Platform } from "react-native";
import type { Tool } from "@/tools/tool-registry";
import { parseAlarmTime, extractAlarmMessage, nextAlarmDate } from "@/tools/alarm-parser";
import { describeReminderTime } from "@/tools/reminder-parser";
import { isIosAlarmKitAvailable, requestIosAlarmAuthorization, scheduleIosAlarm } from "@/native/ios-alarms";

/** Expo wraps native errors as "Calling the 'x' function has failed\n→ Caused by: <reason>"; keep the reason. */
function nativeErrorReason(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : "";
  const reason = raw.split(/Caused by:\s*/).pop()?.trim() || fallback;
  return reason.replace(/\.$/, "");
}

const RECURRING_NOTE =
  " (Recurring not yet supported—set as one-time; use \"Remind me every weekday at 9\" for repeating.)";

function reminderFallback(hour: number, minutes: number, message: string): string {
  return ` Try "Remind me at ${hour}:${minutes.toString().padStart(2, "0")} to ${message}" instead.`;
}

export const setAlarmTool: Tool = {
  name: "alarms.set",
  description: "Set a native alarm. Android: system AlarmClock. iOS 26+: AlarmKit.",
  keywords: ["alarm", "set alarm", "set an alarm", "wake me"],
  params: { optional: ["title", "hour", "minutes", "message"] },
  execute: async (params) => {
    const isAndroid = Platform.OS === "android";
    if (!isAndroid && !(Platform.OS === "ios" && isIosAlarmKitAvailable())) {
      return {
        ok: false,
        message:
          Platform.OS === "ios"
            ? "Alarms need iOS 26 or newer. On this iPhone, try \"Remind me at 7am to wake up\" instead."
            : "Native alarms are available on Android. On this device, try \"Remind me at 7am to wake up\" instead.",
        errorCode: "UNKNOWN",
      };
    }
    const sourceText = (params.text || params.query || "").trim();
    const parsed = parseAlarmTime(sourceText);
    const explicitHour = params.hour ? parseInt(params.hour, 10) : NaN;
    const explicitMinutes = params.minutes ? parseInt(params.minutes, 10) : NaN;
    let hour: number;
    let minutes: number;
    // A relative time ("in 2 minutes") comes from the text: the planner can't know the current time.
    if (!parsed?.exact && !Number.isNaN(explicitHour) && !Number.isNaN(explicitMinutes)) {
      hour = Math.max(0, Math.min(23, explicitHour));
      minutes = Math.max(0, Math.min(59, explicitMinutes));
    } else if (parsed) {
      hour = parsed.hour;
      minutes = parsed.minutes;
      // Android: days aren't passed on, expo-alarm has known bug with EXTRA_DAYS causing rejection (gh#6).
      // One-time alarms (hour+minutes only) work reliably across devices.
    } else {
      return {
        ok: false,
        message: "Could not parse alarm time. Try \"7am\", \"tomorrow at 8:30\", or \"every weekday at 9\".",
        errorCode: "PARSE_FAILURE",
      };
    }
    const message =
      params.title?.trim() || params.message?.trim() || extractAlarmMessage(sourceText) || "Alarm";
    // The day comes from the text even when the planner passed explicit hour/minutes ("tomorrow at 9pm").
    // Only "every …"/"daily"/weekday phrases are recurring; "tomorrow at 8" also sets one day, but it's one-time.
    const days = parsed?.days;
    const recurring = Boolean(parsed?.recurring);
    const recurringNote = recurring ? RECURRING_NOTE : "";

    if (!isAndroid) {
      // iOS 26+: AlarmKit takes an exact date, so resolve "7am" / "tomorrow at 8" to the next occurrence.
      // Ask first: shows the system prompt the first time, then returns the saved choice.
      let authorization: Awaited<ReturnType<typeof requestIosAlarmAuthorization>>;
      try {
        authorization = await requestIosAlarmAuthorization();
      } catch (e) {
        // Not a "permission off" case: the toggle may already be on, so don't send the user to Settings.
        console.warn("[OfflineMate] Alarm permission check failed:", e);
        return {
          ok: false,
          message: `Could not check alarm permission: ${nativeErrorReason(e, "unknown error")}.${reminderFallback(hour, minutes, message)}`,
          errorCode: "UNKNOWN",
          retryable: true,
        };
      }
      if (authorization !== "authorized") {
        return {
          ok: false,
          message:
            // "the iPhone Settings app", not "Settings": OfflineMate has its own Settings tab.
            "Alarms are turned off for OfflineMate. To turn them on, open the iPhone Settings app (not the Settings tab in OfflineMate), go to Apps > OfflineMate and switch on Alarms, then ask again." +
            reminderFallback(hour, minutes, message),
          errorCode: "PERMISSION_DENIED",
        };
      }
      const now = new Date();
      // AlarmKit takes seconds, so a relative time rings exactly when asked.
      const when =
        parsed?.exact && parsed.date && parsed.date > now
          ? parsed.date
          : nextAlarmDate({ hour, minutes, days, recurring, date: parsed?.date }, now);
      try {
        await scheduleIosAlarm(when, message);
        const phrase = describeReminderTime((when.getTime() - now.getTime()) / 1000, now);
        const lead = phrase.startsWith("in ") ? `Alarm set to ring ${phrase}` : `Alarm set for ${phrase}`;
        return { ok: true, message: `${lead}: ${message}${recurringNote}` };
      } catch (e) {
        const errMsg = nativeErrorReason(e, "Failed to set alarm");
        return {
          ok: false,
          message: `Could not set alarm: ${errMsg}.${reminderFallback(hour, minutes, message)}`,
          errorCode: "UNKNOWN",
          retryable: true,
        };
      }
    }

    try {
      // expo-alarm is Android-only and calls requireNativeModule("ExpoAlarm") when it is imported,
      // which throws on iOS. A top-level import crashed the iOS app as soon as Chat loaded the
      // tool registry, so load it here, after the Android check.
      const { setAlarm } = await import("expo-alarm");
      await setAlarm({
        hour,
        minutes,
        message,
        vibrate: true,
        // skipUi: false — show Clock UI for reliability; some devices reject skipUi.
        skipUi: false,
      });
      const timeStr = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      return {
        ok: true,
        message: `Alarm set for ${timeStr}: ${message}${recurringNote}`,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to set alarm.";
      return {
        ok: false,
        message: `Could not set alarm: ${errMsg}.${reminderFallback(hour, minutes, message)}`,
        errorCode: "UNKNOWN",
        retryable: true,
      };
    }
  },
};
