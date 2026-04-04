import * as FileSystem from "expo-file-system/legacy";
import { getTierSpec } from "@/ai/model-registry";
import type { ModelTier } from "@/types/assistant";
import { ALL_MINILM_L6_V2 } from "react-native-executorch";

const MODELS_DIR = `${FileSystem.documentDirectory}models`;
const WHISPER_TINY_EN_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin";
const WHISPER_BASE_EN_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
const SILERO_VAD_URL =
  "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin";

export async function ensureModelsDirectory() {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

export function getModelPath(modelId: string) {
  return `${MODELS_DIR}/${modelId}.pte`;
}

interface AssetToDownload {
  id: string;
  url: string;
  destination: string;
}

function sanitizeFilename(raw: string) {
  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function urlToFilename(url: string) {
  const clean = url.split("?")[0];
  const basename = clean.substring(clean.lastIndexOf("/") + 1);
  return sanitizeFilename(basename || `asset-${Date.now()}.bin`);
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) return null;
  return value;
}

/** Same layout as onboarding / `downloadTierPrimaryModel` (under `documentDirectory/models/`). */
export function getTierAssets(tier: ModelTier): AssetToDownload[] {
  const primary = getTierSpec(tier).primary;
  const modelSource = asHttpUrl(primary.runtime.modelSource);
  const tokenizerSource = asHttpUrl(primary.runtime.tokenizerSource);
  const tokenizerConfigSource = asHttpUrl(primary.runtime.tokenizerConfigSource);
  const embeddingModel = asHttpUrl(ALL_MINILM_L6_V2.modelSource);
  const embeddingTokenizer = asHttpUrl(ALL_MINILM_L6_V2.tokenizerSource);
  const sttUrl = tier === "lite" ? WHISPER_TINY_EN_URL : WHISPER_BASE_EN_URL;
  const sttFile = tier === "lite" ? "whisper-tiny.en.bin" : "whisper-base.en.bin";

  const urls: { id: string; url: string }[] = [
    { id: `${primary.id}-model`, url: modelSource ?? "" },
    { id: `${primary.id}-tokenizer`, url: tokenizerSource ?? "" },
    { id: `${primary.id}-tokenizer-config`, url: tokenizerConfigSource ?? "" },
    { id: "embedding-model", url: embeddingModel ?? "" },
    { id: "embedding-tokenizer", url: embeddingTokenizer ?? "" },
    { id: "whisper-model", url: sttUrl },
    { id: "whisper-vad-model", url: SILERO_VAD_URL },
  ].filter((it) => it.url.length > 0);

  return urls.map((it) => ({
    id: it.id,
    url: it.url,
    destination: `${MODELS_DIR}/${
      it.id === "whisper-model"
        ? sttFile
        : it.id === "whisper-vad-model"
          ? "ggml-silero-v6.2.0.bin"
          : urlToFilename(it.url)
    }`,
  }));
}

function fileUriForLocalPath(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/**
 * If onboarding already saved the primary LLM + tokenizer + config under `models/`,
 * return those as `file://` sources so ExecuTorch loads from disk instead of re-downloading
 * into `react-native-executorch/`.
 */
export async function resolvePrimaryRuntimeForLoad(tier: ModelTier) {
  const primary = getTierSpec(tier).primary;
  const assets = getTierAssets(tier);
  const modelAsset = assets.find((a) => a.id === `${primary.id}-model`);
  const tokAsset = assets.find((a) => a.id === `${primary.id}-tokenizer`);
  const cfgAsset = assets.find((a) => a.id === `${primary.id}-tokenizer-config`);
  if (!modelAsset || !tokAsset || !cfgAsset) {
    return primary.runtime;
  }
  const [m, t, c] = await Promise.all([
    FileSystem.getInfoAsync(modelAsset.destination),
    FileSystem.getInfoAsync(tokAsset.destination),
    FileSystem.getInfoAsync(cfgAsset.destination),
  ]);
  if (!m.exists || !t.exists || !c.exists) {
    return primary.runtime;
  }
  console.log("[OfflineMate] LLM load using onboarding model files (same copy, no second download)", {
    tier,
  });
  return {
    modelSource: fileUriForLocalPath(modelAsset.destination),
    tokenizerSource: fileUriForLocalPath(tokAsset.destination),
    tokenizerConfigSource: fileUriForLocalPath(cfgAsset.destination),
  };
}

const DOWNLOAD_ASSET_RETRIES = 3;
const DOWNLOAD_RETRY_DELAYS_MS = [800, 2200, 4500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** HF often redirects to xethub; DNS can fail transiently on some networks / emulators. */
function isTransientDownloadFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("resolve") ||
    lower.includes("hostname") ||
    lower.includes("network") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("connection") ||
    lower.includes("unreachable") ||
    lower.includes("failed to connect") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound")
  );
}

async function downloadAsset(
  asset: AssetToDownload,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const info = await FileSystem.getInfoAsync(asset.destination);
  if (info.exists) {
    onProgress?.(1);
    return asset.destination;
  }

  console.log("[OfflineMate] Onboarding: starting asset download", { id: asset.id });

  let lastErr: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_ASSET_RETRIES; attempt++) {
    try {
      const task = FileSystem.createDownloadResumable(asset.url, asset.destination, {}, (event) => {
        if (!onProgress || event.totalBytesExpectedToWrite === 0) return;
        onProgress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
      });
      await task.downloadAsync();
      return asset.destination;
    } catch (e) {
      lastErr = e;
      const retry = attempt < DOWNLOAD_ASSET_RETRIES && isTransientDownloadFailure(e);
      console.warn(
        `[OfflineMate] Onboarding: asset download failed (attempt ${attempt}/${DOWNLOAD_ASSET_RETRIES})`,
        { id: asset.id, retry },
        e,
      );
      if (!retry) break;
      await sleep(DOWNLOAD_RETRY_DELAYS_MS[attempt - 1] ?? 2000);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(String(lastErr ?? "Download failed"));
}

export async function downloadTierPrimaryModel(
  tier: ModelTier,
  onProgress?: (progress: number, label?: string) => void,
) {
  await ensureModelsDirectory();
  const assets = getTierAssets(tier);
  console.log("[OfflineMate] Onboarding: downloadTierPrimaryModel", {
    tier,
    assetCount: assets.length,
    assetIds: assets.map((a) => a.id),
  });
  const results: Record<string, string> = {};
  const total = assets.length;
  let completed = 0;

  for (const asset of assets) {
    // Weighted aggregate progress across all assets.
    await downloadAsset(asset, (assetProgress) => {
      onProgress?.((completed + assetProgress) / total, asset.id);
    });
    completed += 1;
    onProgress?.(completed / total, asset.id);
    results[asset.id] = asset.destination;
  }

  return results;
}

export async function modelExists(modelId: string) {
  const info = await FileSystem.getInfoAsync(getModelPath(modelId));
  return info.exists;
}

