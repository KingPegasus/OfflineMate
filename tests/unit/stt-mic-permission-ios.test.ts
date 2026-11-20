import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * iOS: the audio stream library never asks for the microphone, so with it denied the app recorded
 * silence and said "No speech detected". The local module (`modules/mic-permission`) asks first.
 */
const mic = vi.hoisted(() => ({
  getStatus: vi.fn((): "granted" | "denied" | "undetermined" | null => "undetermined"),
  request: vi.fn(async (): Promise<boolean | null> => false),
}));
const audio = vi.hoisted(() => ({ initialize: vi.fn(async () => {}), start: vi.fn(async () => {}) }));

vi.mock("@/native/ios-mic-permission", () => ({
  getIosMicStatus: mic.getStatus,
  requestIosMic: mic.request,
}));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///data/app/files/",
  getInfoAsync: vi.fn(async () => ({ exists: true })),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {},
  PermissionsAndroid: {},
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

describe("iOS microphone permission", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    mic.getStatus.mockReset().mockReturnValue("undetermined");
    mic.request.mockReset().mockResolvedValue(false);
    audio.start.mockClear();
  });

  it("doesn't ask while pre-warming a session", async () => {
    await newSession();
    expect(mic.getStatus).not.toHaveBeenCalled();
    expect(mic.request).not.toHaveBeenCalled();
  });

  it("asks once on a press while undecided, and says to hold again after it's allowed", async () => {
    mic.request.mockResolvedValue(true);
    const { stt, session } = await newSession();
    await session.start();
    expect(mic.request).toHaveBeenCalledTimes(1);
    expect(audio.start).not.toHaveBeenCalled();
    expect(stt.isMicJustAllowed(await session.stop())).toBe(true);
  });

  it("points to Settings when the mic is denied, without asking or recording", async () => {
    mic.getStatus.mockReturnValue("denied");
    const { stt, session } = await newSession();
    await session.start();
    expect(mic.request).not.toHaveBeenCalled();
    expect(audio.start).not.toHaveBeenCalled();
    expect(await session.stop()).toBe(stt.MIC_PERMISSION_REQUIRED);
  });

  it("records straight away when the mic is allowed", async () => {
    mic.getStatus.mockReturnValue("granted");
    const { session } = await newSession();
    await session.start();
    expect(mic.request).not.toHaveBeenCalled();
    expect(audio.start).toHaveBeenCalledTimes(1);
  });

  it("records as before when the native module is missing", async () => {
    mic.getStatus.mockReturnValue(null);
    const { session } = await newSession();
    await session.start();
    expect(audio.start).toHaveBeenCalledTimes(1);
  });
});
