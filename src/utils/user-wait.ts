/**
 * Tracks system prompts a tool is waiting on (permission requests). Tool timeouts pause while one
 * is open: on iOS 27 a permission alert doesn't take the app out of the "active" AppState, so
 * withForegroundTimeout can't tell from AppState alone. No react-native import, so tools can use it
 * in tests that mock only part of react-native.
 */
let openWaits = 0;
const listeners = new Set<() => void>();

export function isWaitingForUser(): boolean {
  return openWaits > 0;
}

export function onUserWaitChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Marks `promise` (e.g. a permission request) as time spent waiting for the user. */
export async function waitingForUser<T>(promise: Promise<T>): Promise<T> {
  openWaits += 1;
  listeners.forEach((l) => l());
  try {
    return await promise;
  } finally {
    openWaits -= 1;
    listeners.forEach((l) => l());
  }
}
