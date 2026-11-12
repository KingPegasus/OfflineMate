import { beforeEach, describe, expect, it, vi } from "vitest";

import { describeCreatedEvent, describeDateRange, describeEvent } from "@/tools/calendar-tool";
import { permissionOffMessage } from "@/tools/permission-message";
import { setReminderTool } from "@/tools/reminders-tool";

const notifications = vi.hoisted(() => ({ granted: true }));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  setNotificationChannelAsync: vi.fn(async () => undefined),
  requestPermissionsAsync: async () => ({ granted: notifications.granted, status: notifications.granted ? "granted" : "denied" }),
  scheduleNotificationAsync: vi.fn(async () => "id"),
}));
vi.mock("expo-calendar/legacy", () => ({}));

beforeEach(() => {
  notifications.granted = true;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("reminder confirmation", () => {
  it('says "to go off in 20 minutes", not "for in 20 minutes" (website example)', async () => {
    const result = await setReminderTool.execute({ text: "Remind me in 20 minutes to stretch" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Reminder set to go off in 20 minutes: stretch.");
  });

  it("explains where to turn notifications on", async () => {
    notifications.granted = false;
    const result = await setReminderTool.execute({ text: "Remind me in 20 minutes to stretch" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("PERMISSION_DENIED");
    expect(result.message).toBe(permissionOffMessage("Notifications"));
  });
});

describe("permission message", () => {
  it("points to the phone's Settings app, not OfflineMate's Settings tab", () => {
    expect(permissionOffMessage("Calendar")).toBe(
      "Calendar access is off for OfflineMate. To turn it on, open your phone's Settings app (not the Settings tab in OfflineMate), go to Apps > OfflineMate and allow Calendar, then ask again.",
    );
  });
});

describe("calendar reply wording", () => {
  // Thu 12 Nov 2026, 11:00.
  const now = new Date(2026, 10, 12, 11, 0, 0);
  const day = (d: number, h = 0, m = 0, s = 0, ms = 0) => new Date(2026, 10, d, h, m, s, ms);

  it("names the day instead of repeating the question", () => {
    expect(describeDateRange({ start: day(12), end: day(12, 23, 59, 59, 999) }, now)).toBe("today");
    expect(describeDateRange({ start: day(13), end: day(13, 23, 59, 59, 999) }, now)).toBe("tomorrow");
    expect(describeDateRange({ start: day(20), end: day(20, 23, 59, 59, 999) }, now)).toMatch(/^on .*20/);
    // A week runs to midnight of the 8th day; the reply ends on the 7th.
    expect(describeDateRange({ start: day(16), end: day(23) }, now)).toMatch(/^from .*16 to .*22$/);
  });

  it("shows an event's times, and the day only for multi-day ranges", () => {
    const event = { title: "Dentist appointment", startDate: day(13, 15).toISOString(), endDate: day(13, 16).toISOString() };
    expect(describeEvent(event, true)).toMatch(/^Dentist appointment, 3:00\sPM – 4:00\sPM$/);
    expect(describeEvent(event, false)).toMatch(/^Dentist appointment, .*13 3:00\sPM – 4:00\sPM$/);
    expect(describeEvent({ title: "Holiday", startDate: day(13).toISOString(), allDay: true }, true)).toBe("Holiday, all day");
  });

  it('confirms a new event as \'Added "…" tomorrow, 1:00 PM – 2:00 PM.\', not a raw timestamp', () => {
    expect(describeCreatedEvent("Lunch with Sara", day(13, 13), day(13, 14), now)).toMatch(
      /^Added "Lunch with Sara" tomorrow, 1:00\sPM – 2:00\sPM\.$/,
    );
    expect(describeCreatedEvent("Dentist", day(20, 9, 30), day(20, 10, 30), now)).toMatch(/^Added "Dentist" on .*20, 9:30\sAM – 10:30\sAM\.$/);
  });
});
