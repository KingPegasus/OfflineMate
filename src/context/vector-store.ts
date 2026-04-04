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
): Promise<string[]> {
  const db = getDb();
  const queryEmbedding = await generateEmbedding(query);

  if (isSqliteVecReady()) {
    try {
      const queryVector = toSqlVector(queryEmbedding);
      const rows = db.getAllSync<{ text_chunk: string; distance: number }>(
        `SELECT text_chunk, distance
         FROM vectors_idx
         WHERE embedding MATCH ?
           AND k = ?
         ORDER BY distance ASC`,
        [queryVector, Math.max(topK * 3, topK)],
      );

      return rows
        .map((row) => ({
          text: row.text_chunk,
          // For cosine distance, score ~ 1 - distance.
          score: 1 - Number(row.distance),
        }))
        .filter((it) => Number.isFinite(it.score) && it.score >= minSimilarity)
        .slice(0, topK)
        .map((it) => it.text);
    } catch {
      // Continue to legacy fallback scan.
    }
  }

  const rows = db.getAllSync<{ text_chunk: string; embedding: string }>(
    "SELECT text_chunk, embedding FROM vectors LIMIT 2000",
  );

  return rows
    .map((row) => ({
      text: row.text_chunk,
      score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding) as number[]),
    }))
    .filter((it) => it.score >= minSimilarity)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((it) => it.text);
}

