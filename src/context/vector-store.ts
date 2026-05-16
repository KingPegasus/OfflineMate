import { getDb, isSqliteVecReady } from "@/db/database";
import { generateEmbedding, toSqlVector } from "@/context/embeddings";

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

export async function upsertVectorChunk(
  sourceType: string,
  sourceId: string,
  textChunk: string,
  chunkOrder = 0,
) {
  const db = getDb();
  const embedding = await generateEmbedding(textChunk);
  const embeddingJson = JSON.stringify(embedding);
  const embeddingSqlVec = toSqlVector(embedding);
  const id = `${sourceType}:${sourceId}:${chunkOrder}:${textChunk.slice(0, 24)}`;
  db.runSync(
    `INSERT OR REPLACE INTO vectors (id, source_type, source_id, chunk_order, text_chunk, embedding)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, sourceType, sourceId, chunkOrder, textChunk, embeddingJson],
  );

  if (isSqliteVecReady()) {
    try {
      db.runSync("DELETE FROM vectors_idx WHERE chunk_id = ?", [id]);
      db.runSync(
        `INSERT INTO vectors_idx (chunk_id, source_type, source_id, chunk_order, embedding, text_chunk)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, sourceType, sourceId, chunkOrder, embeddingSqlVec, textChunk],
      );
    } catch {
      // Fall back to legacy vectors table if vec0 write fails.
    }
  }
}

/** Remove all indexed chunks for a source (e.g. when a note is deleted). */
export function deleteVectorChunksBySource(sourceType: string, sourceId: string) {
  const db = getDb();
  db.runSync("DELETE FROM vectors WHERE source_type = ? AND source_id = ?", [sourceType, sourceId]);
  if (isSqliteVecReady()) {
    try {
      db.runSync("DELETE FROM vectors_idx WHERE source_type = ? AND source_id = ?", [sourceType, sourceId]);
    } catch {
      // vec0 optional
    }
  }
}

export async function searchRelevantContext(
  query: string,
  topK = 5,
  minSimilarity = 0.45,
  options?: {
    sourceType?: string;
    sourceId?: string;
    diversifyBySource?: boolean;
    perSourceLimit?: number;
  },
): Promise<string[]> {
  const db = getDb();
  const queryEmbedding = await generateEmbedding(query);
  const perSourceLimit = options?.diversifyBySource ? Math.max(1, options.perSourceLimit ?? 2) : Number.MAX_SAFE_INTEGER;

  const pickTopTexts = (
    rows: { text: string; score: number; sourceType?: string; sourceId?: string }[],
  ): string[] => {
    const sourceCounts = new Map<string, number>();
    return rows
      .filter((it) => Number.isFinite(it.score) && it.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .filter((it) => {
        const sourceKey = `${it.sourceType ?? "unknown"}:${it.sourceId ?? "unknown"}`;
        const current = sourceCounts.get(sourceKey) ?? 0;
        if (current >= perSourceLimit) return false;
        sourceCounts.set(sourceKey, current + 1);
        return true;
      })
      .slice(0, topK)
      .map((it) => it.text);
  };

  if (isSqliteVecReady()) {
    try {
      const queryVector = toSqlVector(queryEmbedding);
      const whereClauses = ["embedding MATCH ?", "k = ?"];
      const params: (string | number)[] = [queryVector, Math.max(topK * 4, topK)];
      if (options?.sourceType) {
        whereClauses.push("source_type = ?");
        params.push(options.sourceType);
      }
      if (options?.sourceId) {
        whereClauses.push("source_id = ?");
        params.push(options.sourceId);
      }
      const rows = db.getAllSync<{ text_chunk: string; source_type?: string; source_id?: string; distance: number }>(
        `SELECT text_chunk, source_type, source_id, distance
         FROM vectors_idx
         WHERE ${whereClauses.join(" AND ")}
         ORDER BY distance ASC`,
        params,
      );

      const ranked = rows
        .map((row) => ({
          text: row.text_chunk,
          sourceType: row.source_type,
          sourceId: row.source_id,
          // For cosine distance, score ~ 1 - distance.
          score: 1 - Number(row.distance),
        }));
      return pickTopTexts(ranked);
    } catch {
      // Continue to legacy fallback scan.
    }
  }

  const whereClauses: string[] = [];
  const params: string[] = [];
  if (options?.sourceType) {
    whereClauses.push("source_type = ?");
    params.push(options.sourceType);
  }
  if (options?.sourceId) {
    whereClauses.push("source_id = ?");
    params.push(options.sourceId);
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const rows = db.getAllSync<{ text_chunk: string; source_type?: string; source_id?: string; embedding: string }>(
    `SELECT text_chunk, source_type, source_id, embedding FROM vectors ${whereSql} LIMIT 2000`,
    params,
  );

  const ranked = rows
    .map((row) => ({
      text: row.text_chunk,
      sourceType: row.source_type,
      sourceId: row.source_id,
      score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding) as number[]),
    }));
  return pickTopTexts(ranked);
}

