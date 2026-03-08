import * as Notifications from "expo-notifications";
import type { Tool } from "@/tools/tool-registry";

export const setReminderTool: Tool = {
  name: "reminders.set",
  description: "Set a local reminder notification",
  keywords: ["remind", "reminder"],
  execute: async (params) => {
    const text = params.text ?? "Reminder";
    const seconds = Number(params.seconds ?? "60");
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return { ok: false, message: "Notification permission denied." };
    await Notifications.scheduleNotificationAsync({
      content: { title: "OfflineMate Reminder", body: text },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
    return { ok: true, message: "Reminder scheduled." };
  },
};

