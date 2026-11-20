import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppStateStatus } from "react-native";
import { withForegroundTimeout } from "@/utils/foreground-timeout";
import { waitingForUser } from "@/utils/user-wait";

vi.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: vi.fn() } }));

function fakeAppState(initial: AppStateStatus = "active") {
  const listeners = new Set<(s: AppStateStatus) => void>();
  return {
    currentState: initial as string | null,
    addEventListener: (_type: "change", l: (s: AppStateStatus) => void) => {
      listeners.add(l);
      return { remove: () => listeners.delete(l) };
    },
    set(state: AppStateStatus) {
      this.currentState = state;
      listeners.forEach((l) => l(state));
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

const never = () => new Promise<string>(() => {});

describe("withForegroundTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("times out after the given foreground time", async () => {
    const app = fakeAppState();
    const result = withForegroundTimeout(never(), 15000, "timed out", app);
    const check = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15000);
    await check;
    expect(app.listenerCount).toBe(0);
  });

  it("doesn't count time spent in a permission dialog (app in the background)", async () => {
    const app = fakeAppState();
    let resolveTool: (v: string) => void = () => {};
    const tool = new Promise<string>((r) => (resolveTool = r));
    const result = withForegroundTimeout(tool, 15000, "timed out", app);

    await vi.advanceTimersByTimeAsync(5000);
    app.set("background"); // the dialog opens
    await vi.advanceTimersByTimeAsync(60000); // the user takes a minute
    app.set("active"); // allowed
    await vi.advanceTimersByTimeAsync(9000); // still inside the remaining 10 s
    resolveTool("reminder set");
    await expect(result).resolves.toBe("reminder set");
  });

  it("keeps counting the remaining time after coming back", async () => {
    const app = fakeAppState();
    const result = withForegroundTimeout(never(), 15000, "timed out", app);
    const check = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10000);
    app.set("inactive"); // iOS permission alert
    await vi.advanceTimersByTimeAsync(30000);
    app.set("active");
    await vi.advanceTimersByTimeAsync(5000);
    await check;
  });

  // Found in the iOS smoke test: an iOS 27 permission alert leaves AppState "active".
  it("pauses while a tool waits on a permission prompt, even with the app still active", async () => {
    const app = fakeAppState();
    let answer: (v: boolean) => void = () => {};
    const tool = (async () => {
      const allowed = await waitingForUser(new Promise<boolean>((r) => (answer = r)));
      return allowed ? "reminder set" : "denied";
    })();
    const result = withForegroundTimeout(tool, 15000, "timed out", app);
    await vi.advanceTimersByTimeAsync(60000); // the alert sits there for a minute
    answer(true);
    await expect(result).resolves.toBe("reminder set");
  });

  it("starts counting again once the prompt is answered", async () => {
    const app = fakeAppState();
    const tool = (async () => {
      await waitingForUser(Promise.resolve(true));
      return never();
    })();
    const result = withForegroundTimeout(tool, 15000, "timed out", app);
    const check = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(15000);
    await check;
  });

  it("passes through results and errors, and stops listening", async () => {
    const app = fakeAppState();
    await expect(withForegroundTimeout(Promise.resolve(1), 100, "t", app)).resolves.toBe(1);
    await expect(withForegroundTimeout(Promise.reject(new Error("boom")), 100, "t", app)).rejects.toThrow("boom");
    expect(app.listenerCount).toBe(0);
  });
});
