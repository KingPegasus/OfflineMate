import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { Tool } from "@/tools/tool-registry";
import { resolveReminderSeconds, resolveReminderText } from "@/tools/reminder-parser";

const REMINDER_CHANNEL_ID = "offlinemate-reminders-v2";
const REMINDER_CHANNEL_LEGACY = "offlinemate-reminders";

async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    try {
      await Notifications.deleteNotificationChannelAsync(REMINDER_CHANNEL_LEGACY);
    } catch {
      // Old channel may not exist; ignore.
    }
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
      sound: "reminder-tone.wav",
    });
    console.log("[OfflineMate] Reminder channel ready:", REMINDER_CHANNEL_ID);
  } catch (e) {
    console.warn("[OfflineMate] Could not create reminder channel:", e);
  }
}

export const setReminderTool: Tool = {
  name: "reminders.set",
  description: "Set a local reminder notification",
  keywords: ["remind", "reminder"],
  params: { optional: ["text", "seconds"] },
  execute: async (params) => {
    const sourceText = (params.text || params.query || "").trim();
    const text = resolveReminderText(params.text, params.query);
    const seconds = resolveReminderSeconds(params.seconds, sourceText);
    console.log("[OfflineMate] Reminder request:", { text, seconds, sourceText: sourceText.slice(0, 80) });

    if (seconds <= 0) {
      return {
        ok: false,
        message: "I couldn't figure out when. Please say something like \"in 10 minutes\" or \"tomorrow\".",
      };
    }

    await ensureReminderChannel();
    const perm = await Notifications.requestPermissionsAsync();
    console.log("[OfflineMate] Notification permission:", perm.status, perm.granted);
    if (!perm.granted) {
      return {
        ok: false,
        message: "Notification permission denied.",
        errorCode: "PERMISSION_DENIED",
        retryable: true,
      };
    }
    const content: Notifications.NotificationContentInput = {
      title: "OfflineMate Reminder",
      body: text,
      ...(Platform.OS === "android" && { channelId: REMINDER_CHANNEL_ID }),
    };
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
    console.log("[OfflineMate] Reminder scheduled in", seconds, "seconds:", text);
    return { ok: true, message: "Reminder scheduled." };
  },
};

