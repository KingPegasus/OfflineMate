import { beforeEach, vi } from "vitest";
import {
  cleanupStalePartFiles,
  downloadTierVoiceModel,
  getTierChatAssets,
  removeTruncatedChatModel,
} from "@/ai/model-manager";

const fs = vi.hoisted(() => ({
  documentDirectory: "file:///data/app/files/",
  getInfoAsync: vi.fn(async (_path: string): Promise<{ exists: boolean; size?: number }> => ({ exists: false })),
  makeDirectoryAsync: vi.fn(async () => undefined),
  deleteAsync: vi.fn(async () => undefined),
  moveAsync: vi.fn(async (_args: { from: string; to: string }) => undefined),
  createDownloadResumable: vi.fn(),
  readDirectoryAsync: vi.fn(async (_path: string): Promise<string[]> => []),
}));

vi.mock("expo-file-system/legacy", () => fs);

const WHISPER_TINY = "file:///data/app/files/models/whisper-tiny.en.bin";

function mockDownload(status: number) {
  fs.createDownloadResumable.mockImplementation((_url: string, uri: string) => ({
    downloadAsync: vi.fn(async () => ({ uri, status })),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  fs.getInfoAsync.mockImplementation(async (path: string) => ({ exists: path.endsWith("/models") }));
});

describe("model asset download", () => {
  it("writes to a .part file and moves it into place only after it completes", async () => {
    mockDownload(200);
    await downloadTierVoiceModel("lite");

    expect(fs.createDownloadResumable).toHaveBeenCalledWith(
      expect.any(String),
      `${WHISPER_TINY}.part`,
      {},
      expect.any(Function),
    );
    expect(fs.moveAsync).toHaveBeenCalledWith({ from: `${WHISPER_TINY}.part`, to: WHISPER_TINY });
  });

  it("never moves a failed download into place", async () => {
    mockDownload(404);
    await expect(downloadTierVoiceModel("lite")).rejects.toThrow(/HTTP 404/);
    expect(fs.moveAsync).not.toHaveBeenCalled();
    expect(fs.deleteAsync).toHaveBeenCalledWith(`${WHISPER_TINY}.part`, { idempotent: true });
  });

  it("shares one download when the same file is requested twice at once", async () => {
    mockDownload(200);
    await Promise.all([downloadTierVoiceModel("lite"), downloadTierVoiceModel("lite")]);
    expect(fs.createDownloadResumable).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 and succeeds on the next attempt", async () => {
    const statuses = [503, 200];
    fs.createDownloadResumable.mockImplementation((_url: string, uri: string) => ({
      downloadAsync: vi.fn(async () => ({ uri, status: statuses.shift() })),
    }));
    await downloadTierVoiceModel("lite");
    expect(fs.createDownloadResumable).toHaveBeenCalledTimes(2);
    expect(fs.moveAsync).toHaveBeenCalledTimes(1);
  });

  it("sends progress to every caller waiting on a shared download", async () => {
    let release: () => void = () => undefined;
    fs.createDownloadResumable.mockImplementation(
      (_url: string, uri: string, _opts: unknown, onEvent: (e: object) => void) => ({
        downloadAsync: vi.fn(
          () =>
            new Promise((resolve) => {
              release = () => {
                onEvent({ totalBytesWritten: 50, totalBytesExpectedToWrite: 100 });
                resolve({ uri, status: 200 });
              };
            }),
        ),
      }),
    );
    const first = vi.fn();
    const second = vi.fn();
    const a = downloadTierVoiceModel("lite", first);
    await vi.waitFor(() => expect(fs.createDownloadResumable).toHaveBeenCalled());
    const b = downloadTierVoiceModel("lite", second);
    // Let the second caller get past ensureModelsDirectory and join the running download.
    await new Promise((r) => setTimeout(r, 0));
    release();
    await Promise.all([a, b]);
    expect(first).toHaveBeenCalledWith(0.5, "whisper-model");
    expect(second).toHaveBeenCalledWith(0.5, "whisper-model");
  });
});

describe("stale partial downloads", () => {
  it("deletes .part files and keeps finished models", async () => {
    fs.readDirectoryAsync.mockResolvedValue(["model.pte.part", "whisper-tiny.en.bin"]);
    await expect(cleanupStalePartFiles()).resolves.toBe(1);
    expect(fs.deleteAsync).toHaveBeenCalledWith("file:///data/app/files/models/model.pte.part", {
      idempotent: true,
    });
    expect(fs.deleteAsync).toHaveBeenCalledTimes(1);
  });
});

describe("truncated model check", () => {
  // MiniCPM5 has real asset URLs; the executorch constants used by Lite are stubs in tests.
  const modelPath = () =>
    getTierChatAssets("standard", "minicpm5-2b").find((a) => a.id === "minicpm5-2b-model")!.destination;

  function mockRemoteSize(size: number | null) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        size === null
          ? Promise.reject(new Error("offline"))
          : { ok: true, headers: new Headers({ "content-length": String(size) }) },
      ),
    );
  }

  beforeEach(() => {
    fs.getInfoAsync.mockImplementation(async (path: string) =>
      path === modelPath() ? { exists: true, size: 555 } : { exists: path.endsWith("/models") },
    );
  });

  it("deletes a model file shorter than the server's copy", async () => {
    mockRemoteSize(560);
    await expect(removeTruncatedChatModel("standard", "minicpm5-2b")).resolves.toBe(true);
    expect(fs.deleteAsync).toHaveBeenCalledWith(modelPath(), { idempotent: true });
  });

  it("keeps a complete file", async () => {
    mockRemoteSize(555);
    await expect(removeTruncatedChatModel("standard", "minicpm5-2b")).resolves.toBe(false);
    expect(fs.deleteAsync).not.toHaveBeenCalled();
  });

  it("keeps the file when the size can't be checked offline", async () => {
    mockRemoteSize(null);
    await expect(removeTruncatedChatModel("standard", "minicpm5-2b")).resolves.toBe(false);
    expect(fs.deleteAsync).not.toHaveBeenCalled();
  });
});
