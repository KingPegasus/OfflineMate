import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync } from "expo-image-manipulator";
import { toRuntimeMessages } from "@/ai/llm-engine";
import {
  getModelsForTier,
  getVisionModelsForTier,
  modelSupportsVision,
  resolveModelForTier,
  visionUnsupportedMessage,
} from "@/ai/model-registry";
import { deleteChatImages, pickChatImage, pruneUnreferencedChatImages, resizeForVision } from "@/utils/chat-images";
import type { ChatMessage } from "@/types/assistant";

const msg = (role: ChatMessage["role"], content: string, imageUri?: string): ChatMessage => ({
  id: `${role}-${content}`,
  role,
  content,
  createdAt: 0,
  ...(imageUri ? { imageUri } : {}),
});

describe("vision models in the registry", () => {
  it("offers a vision model on every tier", () => {
    expect(getVisionModelsForTier("lite").map((m) => m.id)).toEqual(["lfm2.5-vl-450m"]);
    expect(getVisionModelsForTier("standard").map((m) => m.id)).toEqual(["lfm2.5-vl-1.6b"]);
    expect(getVisionModelsForTier("full").map((m) => m.id)).toEqual(["lfm2.5-vl-1.6b", "gemma4-e2b-multimodal"]);
  });

  it("loads Gemma 4 multimodal with the audio settings its export needs", () => {
    const spec = resolveModelForTier("full", "gemma4-e2b-multimodal");
    expect(spec.capabilities).toEqual(["vision", "audio"]);
    expect(spec.audioConfig).toEqual({ samplesPerBlock: 7680, tokensPerBlock: 12 });
    expect(visionUnsupportedMessage("full", null)).toContain("LFM 2.5 VL 1.6B or Gemma 4 E2B multimodal for Smartest");
  });

  it("keeps text-only tier defaults unchanged", () => {
    for (const tier of ["lite", "standard", "full"] as const) {
      expect(modelSupportsVision(resolveModelForTier(tier, null))).toBe(false);
    }
    expect(getModelsForTier("standard").filter(modelSupportsVision)).toHaveLength(1);
  });

  it("explains which model to pick when the active one is text-only", () => {
    expect(visionUnsupportedMessage("standard", "lfm2.5-vl-1.6b")).toBeNull();
    const message = visionUnsupportedMessage("standard", null);
    expect(message).toContain("Gemma 4 E2B can only read text");
    expect(message).toContain("LFM 2.5 VL 1.6B for Balanced in Settings");
  });

  it("carries the model card sampling overrides", () => {
    expect(resolveModelForTier("lite", "lfm2.5-vl-450m").generationOverrides).toEqual({ temperature: 0.1 });
  });
});

describe("toRuntimeMessages", () => {
  const history = [
    msg("system", "sys"),
    msg("user", "old photo", "file:///docs/chat-images/a.jpg"),
    msg("assistant", "a cat"),
    msg("user", "new photo", "file:///docs/chat-images/b.jpg"),
  ];

  it("sends only the newest image as mediaPath", () => {
    const out = toRuntimeMessages(history, true);
    expect(out.filter((m) => m.mediaPath)).toEqual([
      { role: "user", content: "new photo", mediaPath: "file:///docs/chat-images/b.jpg" },
    ]);
  });

  it("keeps the photo for one follow-up question, then drops it", () => {
    const followUp = [...history, msg("assistant", "a dog"), msg("user", "what colour is it?")];
    expect(toRuntimeMessages(followUp, true).filter((m) => m.mediaPath)).toHaveLength(1);
    const later = [...followUp, msg("assistant", "brown"), msg("user", "write a haiku about autumn")];
    expect(toRuntimeMessages(later, true).some((m) => m.mediaPath)).toBe(false);
  });

  it("sends no images to a text-only model", () => {
    expect(toRuntimeMessages(history, false).some((m) => m.mediaPath)).toBe(false);
  });
});

describe("chat images", () => {
  it("caps the longest side at 1024 px", () => {
    expect(resizeForVision(4000, 3000)).toEqual({ width: 1024 });
    expect(resizeForVision(3000, 4000)).toEqual({ height: 1024 });
    expect(resizeForVision(800, 600)).toBeUndefined();
  });

  it("returns cancelled when the picker is dismissed", async () => {
    await expect(pickChatImage()).resolves.toEqual({ status: "cancelled" });
  });

  it("re-encodes the picked photo as JPEG into app storage", async () => {
    vi.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "content://picker/1", width: 4032, height: 3024 }],
    } as never);
    const result = await pickChatImage();
    expect(manipulateAsync).toHaveBeenCalledWith("content://picker/1", [{ resize: { width: 1024 } }], {
      compress: 0.85,
      format: "jpeg",
    });
    expect(result.status).toBe("picked");
    if (result.status === "picked") {
      expect(result.image.uri).toMatch(/^file:\/\/\/docs\/chat-images\/img-.+\.jpg$/);
    }
  });

  it("deletes only files inside the chat-images folder", async () => {
    await deleteChatImages(["file:///docs/chat-images/a.jpg", "file:///docs/models/x.pte", undefined]);
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("file:///docs/chat-images/a.jpg", { idempotent: true });
  });

  it("prunes copies no saved message points to", async () => {
    vi.mocked(FileSystem.readDirectoryAsync).mockResolvedValueOnce(["kept.jpg", "unsent.jpg"]);
    const removed = await pruneUnreferencedChatImages(["file:///docs/chat-images/kept.jpg", undefined]);
    expect(removed).toBe(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("file:///docs/chat-images/unsent.jpg", { idempotent: true });
  });
});
