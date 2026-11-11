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
});
