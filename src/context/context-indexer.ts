import { upsertVectorChunk } from "@/context/vector-store";

const CHUNK_SIZE = 420;
const CHUNK_OVERLAP = 80;

function chunkText(input: string) {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const end = Math.min(cursor + CHUNK_SIZE, text.length);
    chunks.push(text.slice(cursor, end));
    if (end >= text.length) break;
    cursor = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}

export function indexNoteForRetrieval(noteId: string, title: string, content: string) {
  // "Title: text", so a passage shown back to the user reads like the note. A title that the text starts
  // with (notes saved without one get their first words) is left out rather than repeated.
  const body = content.trim();
  const head = title.trim().replace(/…$/, "");
  const source = !head || body.toLowerCase().startsWith(head.toLowerCase()) ? body : `${head}: ${body}`;
  const chunks = chunkText(source);
  chunks.forEach((chunk, index) => {
    void upsertVectorChunk("note", noteId, chunk, index).catch(() => {
      // Keep note creation path resilient if background indexing fails.
    });
  });
}

