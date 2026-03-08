import * as FileSystem from "expo-file-system/legacy";
import { getTierSpec } from "@/ai/model-registry";
import type { ModelTier } from "@/types/assistant";
import { ALL_MINILM_L6_V2 } from "react-native-executorch";

const MODELS_DIR = `${FileSystem.documentDirectory}models`;
const WHISPER_TINY_EN_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin";
const WHISPER_BASE_EN_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

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

function getTierAssets(tier: ModelTier): AssetToDownload[] {
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
  ].filter((it) => it.url.length > 0);

  return urls.map((it) => ({
    id: it.id,
    url: it.url,
    destination: `${MODELS_DIR}/${it.id.startsWith("whisper") ? sttFile : urlToFilename(it.url)}`,
  }));
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

  const task = FileSystem.createDownloadResumable(asset.url, asset.destination, {}, (event) => {
    if (!onProgress || event.totalBytesExpectedToWrite === 0) return;
    onProgress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
  });
  await task.downloadAsync();
  return asset.destination;
}

export async function downloadTierPrimaryModel(
  tier: ModelTier,
  onProgress?: (progress: number, label?: string) => void,
) {
  await ensureModelsDirectory();
  const assets = getTierAssets(tier);
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

