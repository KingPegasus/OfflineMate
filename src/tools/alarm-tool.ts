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
    let days: number[] | undefined;
    let hasRecurring = false;
    if (!Number.isNaN(explicitHour) && !Number.isNaN(explicitMinutes)) {
      hour = Math.max(0, Math.min(23, explicitHour));
      minutes = Math.max(0, Math.min(59, explicitMinutes));
      hasRecurring = false;
    } else if (parsed) {
      hour = parsed.hour;
      minutes = parsed.minutes;
      days = parsed.days;
      // Only "every …"/"daily"/weekday phrases. "tomorrow at 8" also sets one day in `days`, but it's one-time.
      hasRecurring = Boolean(parsed.recurring);
      // Android: omit days, expo-alarm has known bug with EXTRA_DAYS causing rejection (gh#6).
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
    const recurringNote = hasRecurring ? RECURRING_NOTE : "";

    if (!isAndroid) {
      // iOS 26+: AlarmKit takes an exact date, so resolve "7am" / "tomorrow at 8" to the next occurrence.
      // Ask first: shows the system prompt the first time, then returns the saved choice.
      const authorization = await requestIosAlarmAuthorization().catch(() => "denied" as const);
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
      const when = nextAlarmDate({ hour, minutes, days }, now);
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
