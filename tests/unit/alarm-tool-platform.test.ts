import { vi } from "vitest";

const platform = vi.hoisted(() => ({ OS: "ios" as "ios" | "android" }));
const expoAlarmLoaded = vi.hoisted(() => ({ count: 0 }));
const setAlarm = vi.hoisted(() => vi.fn(async () => undefined));
const iosAlarms = vi.hoisted(() => ({
  available: false,
  authorization: "authorized" as "authorized" | "denied" | "notDetermined" | "unavailable",
  requestIosAlarmAuthorization: vi.fn(),
  scheduleIosAlarm: vi.fn(async (_date: Date, _title: string) => "alarm-id"),
}));

vi.mock("react-native", () => ({ Platform: platform }));

// Mirrors expo-alarm on iOS: the package calls requireNativeModule("ExpoAlarm") at import time,
// which throws because the module only exists on Android.
vi.mock("expo-alarm", () => {
  expoAlarmLoaded.count += 1;
  if (platform.OS !== "android") {
    throw new Error("Cannot find native module 'ExpoAlarm'");
  }
  return { setAlarm };
});

vi.mock("@/native/ios-alarms", () => ({
  isIosAlarmKitAvailable: () => iosAlarms.available,
  requestIosAlarmAuthorization: iosAlarms.requestIosAlarmAuthorization,
  scheduleIosAlarm: iosAlarms.scheduleIosAlarm,
}));

beforeEach(() => {
  expoAlarmLoaded.count = 0;
  iosAlarms.available = false;
  iosAlarms.authorization = "authorized";
  iosAlarms.requestIosAlarmAuthorization.mockImplementation(async () => iosAlarms.authorization);
  // Tue 10 Nov 2026, 16:50 local time.
  vi.useFakeTimers({ now: new Date(2026, 10, 10, 16, 50, 0), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("alarm tool on iOS before 26 (no AlarmKit)", () => {
  it("can be imported without loading the Android-only expo-alarm module", async () => {
    platform.OS = "ios";
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    expect(expoAlarmLoaded.count).toBe(0);

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/iOS 26/);
    expect(result.message).toMatch(/Remind me/);
    expect(iosAlarms.scheduleIosAlarm).not.toHaveBeenCalled();
    expect(expoAlarmLoaded.count).toBe(0);
  });
});

describe("alarm tool on iOS 26+ (AlarmKit)", () => {
  it("schedules the next 7am, which is tomorrow after 16:50", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am to go running" });
    expect(result.ok).toBe(true);
    // A one-time alarm for tomorrow, so no "Recurring not yet supported" note.
    expect(result.message).toMatch(/^Alarm set for tomorrow at 7:00\s?AM: go running$/);
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 11, 7, 0, 0), "go running");
    expect(expoAlarmLoaded.count).toBe(0);
  });

  it("schedules a relative alarm later today", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm in 5 minutes to stretch" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Alarm set to ring in 5 minutes: stretch");
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 10, 16, 55, 0), "stretch");
  });

  it("rings a relative alarm exactly when asked, even mid-minute", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    vi.setSystemTime(new Date(2026, 10, 12, 0, 12, 51));
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    // The planner's guessed hour/minutes don't override the relative time in the text.
    const result = await setAlarmTool.execute({ text: "Set an alarm for 2min to stretch", hour: "0", minutes: "14" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Alarm set to ring in 2 minutes: stretch");
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 12, 0, 14, 51), "stretch");
  });

  it("asks for permission before scheduling", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(iosAlarms.requestIosAlarmAuthorization).toHaveBeenCalledTimes(1);
    expect(iosAlarms.requestIosAlarmAuthorization.mock.invocationCallOrder[0]).toBeLessThan(
      iosAlarms.scheduleIosAlarm.mock.invocationCallOrder[0],
    );
  });

  it("points to Settings when alarms are turned off, without trying to schedule", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    iosAlarms.authorization = "denied";
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm in 2 minutes to stretch" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("PERMISSION_DENIED");
    expect(result.message).toBe(
      'Alarms are turned off for OfflineMate. To turn them on, open the iPhone Settings app (not the Settings tab in OfflineMate), go to Apps > OfflineMate and switch on Alarms, then ask again. Try "Remind me at 16:52 to stretch" instead.',
    );
    expect(iosAlarms.scheduleIosAlarm).not.toHaveBeenCalled();
  });

  it("shows only the native reason when scheduling fails", async () => {
    platform.OS = "ios";
    iosAlarms.available = true;
    iosAlarms.scheduleIosAlarm.mockRejectedValueOnce(
      new Error("Calling the 'scheduleAlarm' function has failed\n→ Caused by: The alarm limit was reached."),
    );
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.message).toBe(
      'Could not set alarm: The alarm limit was reached. Try "Remind me at 7:00 to Alarm" instead.',
    );
  });
});

describe("alarm tool on iOS 26+: dates", () => {
  beforeEach(() => {
    platform.OS = "ios";
    iosAlarms.available = true;
  });

  it("schedules a date more than a week ahead on that date", async () => {
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    const result = await setAlarmTool.execute({ text: "set an alarm for November 20 at 7am to fly home" });
    expect(result.ok).toBe(true);
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 20, 7, 0, 0), "fly home");
  });

  it("schedules a weekday alarm set on a Friday evening for Monday", async () => {
    vi.setSystemTime(new Date(2026, 10, 13, 20, 0, 0));
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    const result = await setAlarmTool.execute({ text: "set an alarm every weekday at 9" });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Recurring not yet supported/);
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 16, 9, 0, 0), "Alarm");
  });

  it("keeps the requested day when the planner passes explicit hour and minutes", async () => {
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    // 16:50 now: today 21:00 is still ahead, but the user asked for tomorrow.
    const result = await setAlarmTool.execute({ text: "set an alarm for tomorrow at 9pm", hour: "21", minutes: "0" });
    expect(result.ok).toBe(true);
    expect(iosAlarms.scheduleIosAlarm).toHaveBeenCalledWith(new Date(2026, 10, 11, 21, 0, 0), "Alarm");
  });

  it("reports a failed permission check as an error, not as alarms turned off", async () => {
    iosAlarms.requestIosAlarmAuthorization.mockRejectedValueOnce(
      new Error("Calling the 'requestAuthorization' function has failed\n→ Caused by: Connection interrupted."),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("UNKNOWN");
    expect(result.message).toBe(
      'Could not check alarm permission: Connection interrupted. Try "Remind me at 7:00 to Alarm" instead.',
    );
    expect(result.message).not.toMatch(/Settings app/);
    expect(iosAlarms.scheduleIosAlarm).not.toHaveBeenCalled();
  });
});

describe("alarm tool on Android", () => {
  it("loads expo-alarm only when an alarm is set, and never uses AlarmKit", async () => {
    platform.OS = "android";
    iosAlarms.available = true;
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Alarm set for 07:00: Alarm");
    expect(setAlarm).toHaveBeenCalledWith(expect.objectContaining({ hour: 7, minutes: 0 }));
    expect(expoAlarmLoaded.count).toBe(1);
    expect(iosAlarms.scheduleIosAlarm).not.toHaveBeenCalled();
  });

  it("rounds a relative alarm up to the next minute so it never rings early", async () => {
    platform.OS = "android";
    vi.setSystemTime(new Date(2026, 10, 12, 0, 12, 51));
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "Set an alarm for 2min to stretch" });
    expect(result.message).toBe("Alarm set for 00:15: stretch");
    expect(setAlarm).toHaveBeenCalledWith(expect.objectContaining({ hour: 0, minutes: 15 }));
  });
});
