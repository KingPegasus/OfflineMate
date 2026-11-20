import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The microphone is asked for only from a mic press, never while a session is pre-warmed.
 * Asking opens the system permission screen, which pauses the app; with the mic denied, the old
 * pre-warm request restarted itself dozens of times a second, hiding the keyboard each time.
 */
const permissions = vi.hoisted(() => ({
  check: vi.fn(async () => false),
  request: vi.fn(async () => "denied"),
}));
const audio = vi.hoisted(() => ({ initialize: vi.fn(async () => {}), start: vi.fn(async () => {}) }));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///data/app/files/",
  getInfoAsync: vi.fn(async () => ({ exists: true })),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {},
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    RESULTS: { GRANTED: "granted" },
    check: permissions.check,
    request: permissions.request,
  },
}));

vi.mock("whisper.rn", () => ({
  initWhisper: vi.fn(async () => ({ release: vi.fn(async () => {}) })),
  releaseAllWhisper: vi.fn(async () => {}),
}));

vi.mock("whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter", () => ({
  AudioPcmStreamAdapter: class {
    initialize = audio.initialize;
    start = audio.start;
    onData() {}
    onError() {}
    isRecording() {
      return false;
    }
    async stop() {}
    async release() {}
  },
}));

async function newSession() {
  const stt = await import("@/voice/stt-engine");
  return { stt, session: await stt.startListeningSession("tiny") };
}

describe("microphone permission", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    permissions.check.mockReset().mockResolvedValue(false);
    permissions.request.mockReset().mockResolvedValue("denied");
    audio.initialize.mockClear();
    audio.start.mockClear();
  });

  it("doesn't ask while pre-warming a session", async () => {
    await newSession();
    expect(permissions.check).not.toHaveBeenCalled();
    expect(permissions.request).not.toHaveBeenCalled();
  });

  it("asks on a press when the mic isn't allowed, and records nothing if denied", async () => {
    const { stt, session } = await newSession();
    await session.start();
    expect(permissions.request).toHaveBeenCalledTimes(1);
    expect(audio.start).not.toHaveBeenCalled();
    expect(await session.stop()).toBe(stt.MIC_PERMISSION_REQUIRED);
  });

  it("says to hold again after the mic is allowed, since the dialog ended that press", async () => {
    permissions.request.mockResolvedValue("granted");
    const { stt, session } = await newSession();
    await session.start();
    expect(audio.start).not.toHaveBeenCalled();
    expect(stt.isMicJustAllowed(await session.stop())).toBe(true);
  });

  it("records straight away when the mic is already allowed, without asking", async () => {
    permissions.check.mockResolvedValue(true);
    const { session } = await newSession();
    await session.start();
    expect(permissions.request).not.toHaveBeenCalled();
    expect(audio.start).toHaveBeenCalledTimes(1);
  });

  it("waits for the permission answer when the press ends first", async () => {
    let answer: (value: string) => void = () => {};
    permissions.request.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { stt, session } = await newSession();
    void session.start();
    const stopped = session.stop();
    answer("never_ask_again");
    expect(await stopped).toBe(stt.MIC_PERMISSION_REQUIRED);
    expect(audio.start).not.toHaveBeenCalled();
  });
});
