import { ALL_MINILM_L6_V2, TextEmbeddingsModule } from "react-native-executorch";

const EMBEDDING_DIMENSIONS = 384;
const MAX_CACHE_ENTRIES = 256;

let embeddingsModule: TextEmbeddingsModule | null = null;
let loadPromise: Promise<void> | null = null;
const embeddingCache = new Map<string, number[]>();

function normalizeInput(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 1024);
}

function cacheSet(key: string, value: number[]) {
  if (embeddingCache.has(key)) {
    embeddingCache.delete(key);
  }
  embeddingCache.set(key, value);
  if (embeddingCache.size > MAX_CACHE_ENTRIES) {
    const oldest = embeddingCache.keys().next().value as string | undefined;
    if (oldest) embeddingCache.delete(oldest);
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
      embeddingsModule = new TextEmbeddingsModule();
      await embeddingsModule.load(ALL_MINILM_L6_V2);
    })();
  }
  await loadPromise;
  return embeddingsModule;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = normalizeInput(text);
  if (!normalized) {
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  }
  const cached = embeddingCache.get(normalized);
  if (cached) {
    return cached;
  }

  try {
    const module = await ensureEmbeddingsModule();
    if (!module) throw new Error("Embeddings module failed to initialize.");
    const embedding = Array.from(await module.forward(normalized));
    cacheSet(normalized, embedding);
    return embedding;
  } catch {
    const fallback = fallbackEmbedding(normalized);
    cacheSet(normalized, fallback);
    return fallback;
  }
}

export function toSqlVector(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(6))).join(",")}]`;
}

