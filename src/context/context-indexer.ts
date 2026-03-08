import { upsertVectorChunk } from "@/context/vector-store";

export function indexNoteForRetrieval(noteId: string, title: string, content: string) {
  const chunks = [`${title}\n${content}`];
  chunks.forEach((chunk) => upsertVectorChunk("note", noteId, chunk));
}

