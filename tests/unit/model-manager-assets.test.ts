import { vi } from "vitest";
import { getTierAssets, getTierChatAssets, getTierVoiceAssets } from "@/ai/model-manager";

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///data/app/files/",
  getInfoAsync: vi.fn(async () => ({ exists: false })),
}));

function destinationOf(tier: "standard" | "full", modelId: string, assetId: string) {
  return getTierAssets(tier, modelId).find((a) => a.id === assetId)?.destination;
}

describe("model asset destinations", () => {
  it("stores tokenizer files per model so alternates never share tokenizer.json", () => {
    const minicpmTok = destinationOf("standard", "minicpm5-2b", "minicpm5-2b-tokenizer");
    const lfmTok = destinationOf("full", "lfm2.5-2.6b", "lfm2.5-2.6b-tokenizer");

    expect(minicpmTok).toBe("file:///data/app/files/models/minicpm5-2b-tokenizer.json");
    expect(lfmTok).toBe("file:///data/app/files/models/lfm2.5-2.6b-tokenizer.json");
    expect(destinationOf("standard", "minicpm5-2b", "minicpm5-2b-tokenizer-config")).toBe(
      "file:///data/app/files/models/minicpm5-2b-tokenizer-config.json",
    );
  });

  it("keeps the published .pte filename for model weights", () => {
    expect(destinationOf("standard", "minicpm5-2b", "minicpm5-2b-model")).toBe(
      "file:///data/app/files/models/minicpm_5_2b_xnnpack_8da4w.pte",
    );
  });
});

describe("voice model assets", () => {
  it("downloads only the tier's Whisper model for voice input", () => {
    expect(getTierVoiceAssets("lite")).toEqual([
      expect.objectContaining({
        id: "whisper-model",
        destination: "file:///data/app/files/models/whisper-tiny.en.bin",
      }),
    ]);
    expect(getTierVoiceAssets("standard").map((a) => a.destination)).toEqual([
      "file:///data/app/files/models/whisper-base.en.bin",
    ]);
    expect(getTierVoiceAssets("full").map((a) => a.id)).toEqual(["whisper-model"]);
  });

  it("is never part of the chat-only download used when switching tiers", () => {
    expect(getTierChatAssets("standard").some((a) => a.id.startsWith("whisper"))).toBe(false);
  });
});
