import { AppState, type AppStateStatus } from "react-native";

type AppStateLike = {
  currentState?: string | null;
  addEventListener(type: "change", listener: (state: AppStateStatus) => void): { remove(): void };
};

/**
 * Like a timeout, but the clock only runs while the app is in the foreground. A tool that asks for
 * a permission (reminders: notifications, contacts) opens a system dialog, which takes the app out
 * of the foreground; without this, a few seconds deciding made the tool fail with "timed out" even
 * when the user then allowed it. Switching to another app mid-request pauses it the same way.
 */
export function withForegroundTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string,
  appState: AppStateLike = AppState,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let remaining = ms;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const start = () => {
      if (timer || settled) return;
      startedAt = Date.now();
      timer = setTimeout(() => {
        finish();
        reject(new Error(timeoutMessage));
      }, remaining);
    };
    const pause = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    };
    const subscription = appState.addEventListener("change", (state) => {
      if (state === "active") start();
      else pause();
    });
    function finish() {
      settled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      subscription.remove();
    }

    // Unknown state (tests, early start-up) counts as foreground.
    if (appState.currentState === "active" || appState.currentState == null) start();

    promise.then(
      (value) => {
        if (settled) return;
        finish();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        finish();
        reject(error);
      },
    );
  });
}
