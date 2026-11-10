import { vi } from "vitest";

const platform = vi.hoisted(() => ({ OS: "ios" as "ios" | "android" }));
const expoAlarmLoaded = vi.hoisted(() => ({ count: 0 }));
const setAlarm = vi.hoisted(() => vi.fn(async () => undefined));

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

describe("alarm tool on iOS", () => {
  it("can be imported without loading the Android-only expo-alarm module", async () => {
    platform.OS = "ios";
    const { setAlarmTool } = await import("@/tools/alarm-tool");
    expect(expoAlarmLoaded.count).toBe(0);

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Android/);
    expect(expoAlarmLoaded.count).toBe(0);
  });

  it("loads expo-alarm only when an alarm is set on Android", async () => {
    platform.OS = "android";
    const { setAlarmTool } = await import("@/tools/alarm-tool");

    const result = await setAlarmTool.execute({ text: "set an alarm for 7am" });
    expect(result.ok).toBe(true);
    expect(setAlarm).toHaveBeenCalledWith(expect.objectContaining({ hour: 7, minutes: 0 }));
    expect(expoAlarmLoaded.count).toBe(1);
  });
});
