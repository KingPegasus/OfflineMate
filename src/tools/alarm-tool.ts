import { Platform } from "react-native";
import { setAlarm } from "expo-alarm";
import type { Tool } from "@/tools/tool-registry";
import { parseAlarmTime, extractAlarmMessage } from "@/tools/alarm-parser";

export const setAlarmTool: Tool = {
  name: "alarms.set",
  description: "Set a native alarm (Android only). Uses system AlarmClock.",
  keywords: ["alarm", "set alarm", "set an alarm", "wake me"],
  params: { optional: ["title", "hour", "minutes", "message"] },
  execute: async (params) => {
    if (Platform.OS !== "android") {
      return {
        ok: false,
        message: "Native alarms are available on Android. On this device, try \"Remind me at 7am to wake up\" instead.",
        errorCode: "UNKNOWN",
      };
    }
    const sourceText = (params.text || params.query || "").trim();
    const parsed = parseAlarmTime(sourceText);
    const explicitHour = params.hour ? parseInt(params.hour, 10) : NaN;
    const explicitMinutes = params.minutes ? parseInt(params.minutes, 10) : NaN;
    let hour: number;
    let minutes: number;
    let hasRecurring = false;
    if (!Number.isNaN(explicitHour) && !Number.isNaN(explicitMinutes)) {
      hour = Math.max(0, Math.min(23, explicitHour));
      minutes = Math.max(0, Math.min(59, explicitMinutes));
      hasRecurring = false;
    } else if (parsed) {
      hour = parsed.hour;
      minutes = parsed.minutes;
      hasRecurring = Boolean(parsed.days && parsed.days.length > 0);
      // Omit days: expo-alarm has known bug with EXTRA_DAYS causing rejection (gh#6).
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

    try {
      await setAlarm({
        hour,
        minutes,
        message,
        vibrate: true,
        // skipUi: false — show Clock UI for reliability; some devices reject skipUi.
        skipUi: false,
      });
      const timeStr = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      const recurringNote = hasRecurring
        ? " (Recurring not yet supported—set as one-time; use \"Remind me every weekday at 9\" for repeating.)"
        : "";
      return {
        ok: true,
        message: `Alarm set for ${timeStr}: ${message}${recurringNote}`,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to set alarm.";
      const fallback =
        " Try \"Remind me at " +
        `${hour}:${minutes.toString().padStart(2, "0")} to ${message}\" instead.`;
      return {
        ok: false,
        message: `Could not set alarm: ${errMsg}.${fallback}`,
        errorCode: "UNKNOWN",
        retryable: true,
      };
    }
  },
};
