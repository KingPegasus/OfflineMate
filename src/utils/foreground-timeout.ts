import { AppState, type AppStateStatus } from "react-native";
import { isWaitingForUser, onUserWaitChange } from "@/utils/user-wait";

type AppStateLike = {
  currentState?: string | null;
  addEventListener(type: "change", listener: (state: AppStateStatus) => void): { remove(): void };
};

/**
 * Like a timeout, but the clock only runs while the app is in the foreground. A tool that asks for
 * a permission (reminders: notifications, contacts) opens a system dialog, which takes the app out
 * of the foreground on Android; without this, a few seconds deciding made the tool fail with "timed
 * out" even when the user then allowed it. Switching to another app mid-request pauses it the same
 * way. iOS permission alerts leave the app "active", so tools also mark their permission requests
 * with waitingForUser() (src/utils/user-wait.ts), which pauses the clock too.
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
    const shouldRun = () =>
      (appState.currentState === "active" || appState.currentState == null) && !isWaitingForUser();
    const update = () => (shouldRun() ? start() : pause());
    const subscription = appState.addEventListener("change", update);
    const stopWatchingWaits = onUserWaitChange(update);
    function finish() {
      settled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      subscription.remove();
      stopWatchingWaits();
    }

    // Unknown state (tests, early start-up) counts as foreground.
    update();

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
