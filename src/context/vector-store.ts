import { getDb } from "@/db/database";
import { generateEmbedding } from "@/context/embeddings";

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

export function upsertVectorChunk(sourceType: string, sourceId: string, textChunk: string) {
  const db = getDb();
  const embedding = JSON.stringify(generateEmbedding(textChunk));
  const id = `${sourceType}:${sourceId}:${textChunk.slice(0, 24)}`;
  db.runSync(
    `INSERT OR REPLACE INTO vectors (id, source_type, source_id, text_chunk, embedding)
     VALUES (?, ?, ?, ?, ?)`,
    [id, sourceType, sourceId, textChunk, embedding],
  );
}

export async function searchRelevantContext(
  query: string,
  topK = 5,
  minSimilarity = 0.45,
): Promise<string[]> {
  const db = getDb();
  const queryEmbedding = generateEmbedding(query);
  const rows = db.getAllSync<{ text_chunk: string; embedding: string }>(
    "SELECT text_chunk, embedding FROM vectors LIMIT 500",
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

