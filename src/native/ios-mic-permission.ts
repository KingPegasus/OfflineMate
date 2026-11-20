import { requireOptionalNativeModule } from "expo";

export type IosMicStatus = "granted" | "denied" | "undetermined";

interface OfflineMateMicPermission {
  getStatus(): IosMicStatus;
  request(): Promise<boolean>;
}

/**
 * The local record-permission module (`modules/mic-permission`). It's only compiled into iOS
 * builds; `requireOptionalNativeModule` returns null where it's missing (Android, tests).
 */
const native = requireOptionalNativeModule<OfflineMateMicPermission>("OfflineMateMicPermission");

/** The saved microphone answer, without prompting. Null when the module isn't there. */
export function getIosMicStatus(): IosMicStatus | null {
  return native?.getStatus() ?? null;
}

/** Asks for the microphone (the prompt shows only while undecided). Null when the module isn't there. */
export async function requestIosMic(): Promise<boolean | null> {
  return native ? native.request() : null;
}
