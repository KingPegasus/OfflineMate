import * as FileSystem from "expo-file-system/legacy";
import { resolveModelForTier } from "@/ai/model-registry";
import type { ModelTier } from "@/types/assistant";
import { ALL_MINILM_L6_V2 } from "react-native-executorch/legacy";

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

export interface AssetToDownload {
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

export function isTokenizerAssetId(id: string) {
  return id.endsWith("-tokenizer") || id.endsWith("-tokenizer-config");
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) return null;
  return value;
}

/** Same layout as onboarding / `downloadTierPrimaryModel` (under `documentDirectory/models/`). */
export function getTierAssets(tier: ModelTier, modelId?: string | null): AssetToDownload[] {
  const primary = resolveModelForTier(tier, modelId);
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
          : isTokenizerAssetId(it.id)
            ? // Every model publishes `tokenizer.json` / `tokenizer_config.json`; key by asset id so
              // alternates (and the embedding model) never reuse another model's tokenizer file.
              sanitizeFilename(`${it.id}.json`)
            : urlToFilename(it.url)
    }`,
  }));
}

export interface TierAssetReadiness {
  ready: boolean;
  missingAssets: AssetToDownload[];
  presentAssets: AssetToDownload[];
}

function isChatCriticalAsset(assetId: string, primaryModelId: string) {
  return (
    assetId === `${primaryModelId}-model` ||
    assetId === `${primaryModelId}-tokenizer` ||
    assetId === `${primaryModelId}-tokenizer-config`
  );
}

/**
 * Assets required for text generation in chat. Voice and other optional assets are excluded.
 */
export function getTierChatAssets(tier: ModelTier, modelId?: string | null): AssetToDownload[] {
  const activeId = resolveModelForTier(tier, modelId).id;
  return getTierAssets(tier, modelId).filter((asset) => isChatCriticalAsset(asset.id, activeId));
}

/**
 * Verifies whether all required assets for a tier already exist on device.
 * Used by chat preflight to avoid confusing "load failed" errors when onboarding was skipped.
 */
export async function getTierAssetReadiness(
  tier: ModelTier,
  modelId?: string | null,
): Promise<TierAssetReadiness> {
  await ensureModelsDirectory();
  const assets = getTierAssets(tier, modelId);
  const checks = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      info: await FileSystem.getInfoAsync(asset.destination),
    })),
  );
  const missingAssets = checks.filter((it) => !it.info.exists).map((it) => it.asset);
  const presentAssets = checks.filter((it) => it.info.exists).map((it) => it.asset);
  return {
    ready: missingAssets.length === 0,
    missingAssets,
    presentAssets,
  };
}

/** Whisper weights used for press-and-hold voice input on this tier (VAD is not used by STT). */
export function getTierVoiceAssets(tier: ModelTier): AssetToDownload[] {
  return getTierAssets(tier).filter((asset) => asset.id === "whisper-model");
}

/** Approximate Whisper download size in MB, for confirmation prompts. */
export function getTierVoiceDownloadMb(tier: ModelTier) {
  return tier === "lite" ? 78 : 148;
}

export async function getTierChatAssetReadiness(
  tier: ModelTier,
  modelId?: string | null,
): Promise<TierAssetReadiness> {
  await ensureModelsDirectory();
  const assets = getTierChatAssets(tier, modelId);
  const checks = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      info: await FileSystem.getInfoAsync(asset.destination),
    })),
  );
  const missingAssets = checks.filter((it) => !it.info.exists).map((it) => it.asset);
  const presentAssets = checks.filter((it) => it.info.exists).map((it) => it.asset);
  return {
    ready: missingAssets.length === 0,
    missingAssets,
    presentAssets,
  };
}

function fileUriForLocalPath(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

/**
 * If onboarding already saved the primary LLM + tokenizer + config under `models/`,
 * return those as `file://` sources so ExecuTorch loads from disk instead of re-downloading
 * into `react-native-executorch/`.
 */
export async function resolvePrimaryRuntimeForLoad(
  tier: ModelTier,
  modelId?: string | null,
  preferOnDeviceFiles = true,
) {
  const active = resolveModelForTier(tier, modelId);
  if (!preferOnDeviceFiles) {
    return active.runtime;
  }
  const assets = getTierAssets(tier, modelId);
  const modelAsset = assets.find((a) => a.id === `${active.id}-model`);
  const tokAsset = assets.find((a) => a.id === `${active.id}-tokenizer`);
  const cfgAsset = assets.find((a) => a.id === `${active.id}-tokenizer-config`);
  if (!modelAsset || !tokAsset || !cfgAsset) {
    return active.runtime;
  }
  const [m, t, c] = await Promise.all([
    FileSystem.getInfoAsync(modelAsset.destination),
    FileSystem.getInfoAsync(tokAsset.destination),
    FileSystem.getInfoAsync(cfgAsset.destination),
  ]);
  if (!m.exists || !t.exists || !c.exists) {
    return active.runtime;
  }
  console.log("[OfflineMate] LLM load using onboarding model files (same copy, no second download)", {
    tier,
    modelId: active.id,
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

/** Non-2xx response while downloading a model asset. */
export class DownloadHttpError extends Error {
  constructor(
    readonly assetId: string,
    readonly status: number | null,
  ) {
    super(`Download failed for ${assetId} (HTTP ${status ?? "no response"})`);
    this.name = "DownloadHttpError";
  }
}

/** HF often redirects to xethub; DNS can fail transiently on some networks / emulators. */
function isTransientDownloadFailure(err: unknown): boolean {
  if (err instanceof DownloadHttpError) {
    // Rate limits, request timeouts and server/CDN errors usually clear on retry; 4xx like 404 do not.
    return err.status === null || err.status === 408 || err.status === 429 || err.status >= 500;
  }
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

const PART_SUFFIX = ".part";

interface InFlightDownload {
  promise: Promise<string>;
  listeners: Set<(progress: number) => void>;
}

// One download per destination at a time; Settings, onboarding and voice can request the same file.
// Every caller waiting on it receives progress, not only the one that started it.
const inFlightDownloads = new Map<string, InFlightDownload>();

function downloadAsset(asset: AssetToDownload, onProgress?: (progress: number) => void): Promise<string> {
  const existing = inFlightDownloads.get(asset.destination);
  if (existing) {
    if (onProgress) existing.listeners.add(onProgress);
    return existing.promise;
  }
  const listeners = new Set<(progress: number) => void>();
  if (onProgress) listeners.add(onProgress);
  const promise = downloadAssetOnce(asset, (progress) => {
    listeners.forEach((listener) => listener(progress));
  }).finally(() => {
    inFlightDownloads.delete(asset.destination);
  });
  inFlightDownloads.set(asset.destination, { promise, listeners });
  return promise;
}

async function downloadAssetOnce(
  asset: AssetToDownload,
  onProgress: (progress: number) => void,
): Promise<string> {
  const info = await FileSystem.getInfoAsync(asset.destination);
  if (info.exists) {
    onProgress(1);
    return asset.destination;
  }

  console.log("[OfflineMate] Onboarding: starting asset download", { id: asset.id });

  // Write to a temp file and move it into place only when complete, so an interrupted or still
  // running download never looks "present" (ExecuTorch then fails with "File size is too small").
  const partPath = `${asset.destination}${PART_SUFFIX}`;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_ASSET_RETRIES; attempt++) {
    try {
      await FileSystem.deleteAsync(partPath, { idempotent: true });
      const task = FileSystem.createDownloadResumable(asset.url, partPath, {}, (event) => {
        if (event.totalBytesExpectedToWrite === 0) return;
        onProgress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
      });
      const result = await task.downloadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        throw new DownloadHttpError(asset.id, result?.status ?? null);
      }
      await FileSystem.moveAsync({ from: partPath, to: asset.destination });
      return asset.destination;
    } catch (e) {
      await FileSystem.deleteAsync(partPath, { idempotent: true }).catch(() => undefined);
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

/**
 * Deletes `.part` files left by downloads that were interrupted (app killed, model abandoned) and are
 * not running now. Call once at app start; partial models can be hundreds of MB.
 */
export async function cleanupStalePartFiles(): Promise<number> {
  const dir = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!dir.exists) return 0;
  const names = await FileSystem.readDirectoryAsync(MODELS_DIR);
  const stale = names
    .filter((name) => name.endsWith(PART_SUFFIX))
    .map((name) => `${MODELS_DIR}/${name}`)
    .filter((path) => !inFlightDownloads.has(path.slice(0, -PART_SUFFIX.length)));
  await Promise.all(stale.map((path) => FileSystem.deleteAsync(path, { idempotent: true })));
  if (stale.length > 0) console.log("[OfflineMate] Removed stale partial downloads:", stale.length);
  return stale.length;
}

const REMOTE_SIZE_TIMEOUT_MS = 8000;

async function fetchRemoteSize(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_SIZE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (!res.ok) return null;
    // Hugging Face sends the real file size as x-linked-size when it redirects to its CDN.
    const length = Number(res.headers.get("x-linked-size") ?? res.headers.get("content-length"));
    return Number.isFinite(length) && length > 0 ? length : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * After a model fails to load, compares the on-disk weights with the server's size. A shorter local
 * file (e.g. truncated by builds before 0.7.0, which wrote downloads in place) is deleted so Settings
 * shows "Not downloaded" and offers Download now. Returns true only when a truncated file was removed;
 * false when the file looks complete, is missing, or the size can't be checked (offline).
 */
export async function removeTruncatedChatModel(tier: ModelTier, modelId?: string | null): Promise<boolean> {
  const active = resolveModelForTier(tier, modelId);
  const modelAsset = getTierChatAssets(tier, modelId).find((a) => a.id === `${active.id}-model`);
  if (!modelAsset) return false;
  const local = await FileSystem.getInfoAsync(modelAsset.destination);
  if (!local.exists || typeof local.size !== "number") return false;
  const remoteSize = await fetchRemoteSize(modelAsset.url);
  if (remoteSize === null || local.size >= remoteSize) return false;
  console.warn("[OfflineMate] Removing truncated model file", {
    id: modelAsset.id,
    localSize: local.size,
    remoteSize,
  });
  await FileSystem.deleteAsync(modelAsset.destination, { idempotent: true });
  return true;
}

/** Full onboarding download for a tier: chat model (the tier's selected one), embeddings and speech. */
export async function downloadTierPrimaryModel(
  tier: ModelTier,
  onProgress?: (progress: number, label?: string) => void,
  modelId?: string | null,
) {
  await ensureModelsDirectory();
  const assets = getTierAssets(tier, modelId);
  console.log("[OfflineMate] Onboarding: downloadTierPrimaryModel", {
    tier,
    modelId: resolveModelForTier(tier, modelId).id,
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

async function downloadAssetList(
  assets: AssetToDownload[],
  onProgress?: (progress: number, label?: string) => void,
) {
  const results: Record<string, string> = {};
  const total = Math.max(assets.length, 1);
  let completed = 0;

  for (const asset of assets) {
    await downloadAsset(asset, (assetProgress) => {
      onProgress?.((completed + assetProgress) / total, asset.id);
    });
    completed += 1;
    onProgress?.(completed / total, asset.id);
    results[asset.id] = asset.destination;
  }

  return results;
}

/**
 * Downloads only chat-critical files (model + tokenizer + tokenizer config) for a selected model.
 * Useful for pre-downloading non-primary tier variants from Settings.
 */
export async function downloadTierChatModel(
  tier: ModelTier,
  modelId?: string | null,
  onProgress?: (progress: number, label?: string) => void,
) {
  await ensureModelsDirectory();
  const assets = getTierChatAssets(tier, modelId);
  const active = resolveModelForTier(tier, modelId);
  console.log("[OfflineMate] Settings: downloadTierChatModel", {
    tier,
    modelId: active.id,
    assetCount: assets.length,
    assetIds: assets.map((a) => a.id),
  });
  return downloadAssetList(assets, onProgress);
}

/**
 * Downloads the tier's Whisper model. Switching tiers in Settings only fetches chat files, so voice
 * input calls this when the tier's STT model is missing (no-op when already on disk).
 */
export async function downloadTierVoiceModel(
  tier: ModelTier,
  onProgress?: (progress: number, label?: string) => void,
) {
  await ensureModelsDirectory();
  const assets = getTierVoiceAssets(tier);
  console.log("[OfflineMate] Voice: downloadTierVoiceModel", { tier, assetIds: assets.map((a) => a.id) });
  return downloadAssetList(assets, onProgress);
}

/**
 * Deletes and re-fetches the chat files for a model. Repairs a damaged copy (e.g. a truncated file
 * left by builds before 0.7.0, which wrote downloads in place) that still passes the exists check.
 */
export async function redownloadTierChatModel(
  tier: ModelTier,
  modelId?: string | null,
  onProgress?: (progress: number, label?: string) => void,
) {
  const assets = getTierChatAssets(tier, modelId);
  await Promise.all(assets.map((asset) => FileSystem.deleteAsync(asset.destination, { idempotent: true })));
  return downloadTierChatModel(tier, modelId, onProgress);
}

export async function modelExists(modelId: string) {
  const info = await FileSystem.getInfoAsync(getModelPath(modelId));
  return info.exists;
}

