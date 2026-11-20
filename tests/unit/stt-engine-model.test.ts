import { beforeEach, vi } from "vitest";

const existing = new Set<string>();
const initWhisper = vi.fn(async () => ({ release: vi.fn(async () => {}) }));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///data/app/files/",
  getInfoAsync: vi.fn(async (path: string) => ({ exists: existing.has(path) })),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: {},
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: "android.permission.RECORD_AUDIO" },
    RESULTS: { GRANTED: "granted" },
    // Deny so start() records nothing and stop() reports it (no native audio needed).
    check: vi.fn(async () => false),
    request: vi.fn(async () => "denied"),
  },
}));

vi.mock("whisper.rn", () => ({ initWhisper, releaseAllWhisper: vi.fn() }));
vi.mock("whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter", () => ({
  AudioPcmStreamAdapter: class {
    onData() {}
    onError() {}
    isRecording() {
      return false;
    }
    async release() {}
  },
}));

const TINY = "file:///data/app/files/models/whisper-tiny.en.bin";
const BASE = "file:///data/app/files/models/whisper-base.en.bin";

async function stopResult(size: "tiny" | "base") {
  const { startListeningSession } = await import("@/voice/stt-engine");
  const session = await startListeningSession(size);
  await session.start();
  return session.stop();
}

describe("STT model resolution", () => {
  beforeEach(() => {
    existing.clear();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("reports a missing model when no Whisper file is on disk", async () => {
    const { isSttModelMissing } = await import("@/voice/stt-engine");
    expect(isSttModelMissing(await stopResult("base"))).toBe(true);
    expect(isSttModelMissing(await stopResult("tiny"))).toBe(true);
  });

  it("falls back to tiny when base is requested but only tiny was downloaded", async () => {
    existing.add(TINY);
    const { isSttModelMissing } = await import("@/voice/stt-engine");
    const result = await stopResult("base");
    expect(isSttModelMissing(result)).toBe(false);
    expect(result).toMatch(/microphone permission is required/i);
  });

  it("uses base when only base exists and tiny is requested", async () => {
    existing.add(BASE);
    const { isSttModelMissing } = await import("@/voice/stt-engine");
    expect(isSttModelMissing(await stopResult("tiny"))).toBe(false);
  });
});
