import { ALL_MINILM_L6_V2, TextEmbeddingsModule } from "react-native-executorch";

const EMBEDDING_DIMENSIONS = 384;
const MAX_CACHE_ENTRIES = 256;

type EmbeddingMode = "native" | "fallback";

let embeddingsModule: TextEmbeddingsModule | null = null;
let loadPromise: Promise<void> | null = null;
const embeddingCache = new Map<string, { vector: number[]; mode: EmbeddingMode }>();
let fallbackCallsSinceReset = 0;
let nativeCallsSinceReset = 0;
let lastEmbeddingMode: EmbeddingMode = "native";

function normalizeInput(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 1024);
}

function cacheSet(key: string, value: number[], mode: EmbeddingMode) {
  if (embeddingCache.has(key)) {
    embeddingCache.delete(key);
  }
  embeddingCache.set(key, { vector: value, mode });
  if (embeddingCache.size > MAX_CACHE_ENTRIES) {
    const oldest = embeddingCache.keys().next().value as string | undefined;
    if (oldest) embeddingCache.delete(oldest);
  }
}

function recordEmbeddingMode(mode: EmbeddingMode) {
  lastEmbeddingMode = mode;
  if (mode === "fallback") {
    fallbackCallsSinceReset += 1;
  } else {
    nativeCallsSinceReset += 1;
  }
}

function fallbackEmbedding(text: string): number[] {
  // Deterministic fallback keeps retrieval operational if the runtime model cannot load.
  const seed = Array.from(text).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1000003, 7);
  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => ((seed + i * 17) % 1000) / 1000);
}

async function ensureEmbeddingsModule() {
  if (embeddingsModule) return embeddingsModule;
  if (!loadPromise) {
    loadPromise = (async () => {
      embeddingsModule = await TextEmbeddingsModule.fromModelName(ALL_MINILM_L6_V2);
    })();
  }
  await loadPromise;
  return embeddingsModule;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = normalizeInput(text);
  if (!normalized) {
    recordEmbeddingMode("native");
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  }
  const cached = embeddingCache.get(normalized);
  if (cached) {
    recordEmbeddingMode(cached.mode);
    return cached.vector;
  }

  try {
    const module = await ensureEmbeddingsModule();
    if (!module) throw new Error("Embeddings module failed to initialize.");
    const embedding = Array.from(await module.forward(normalized));
    cacheSet(normalized, embedding, "native");
    recordEmbeddingMode("native");
    return embedding;
  } catch {
    const fallback = fallbackEmbedding(normalized);
    cacheSet(normalized, fallback, "fallback");
    recordEmbeddingMode("fallback");
    return fallback;
  }
}

export function toSqlVector(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(6))).join(",")}]`;
}

export function resetEmbeddingHealthWindow() {
  fallbackCallsSinceReset = 0;
  nativeCallsSinceReset = 0;
}

export function getEmbeddingHealthWindow() {
  return {
    lastEmbeddingMode,
    fallbackCallsSinceReset,
    nativeCallsSinceReset,
  };
}

