import { vi } from "vitest";
import { indexNoteForRetrieval } from "@/context/context-indexer";

const upsertSpy = vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);

vi.mock("@/context/vector-store", () => ({
  upsertVectorChunk: (...args: unknown[]) => upsertSpy(args[0], args[1], args[2], args[3]),
}));

describe("context indexer integration", () => {
  it("chunks long notes and enqueues multiple upserts", () => {
    const content = "x".repeat(1200);
    indexNoteForRetrieval("note-1", "Long title", content);
    expect(upsertSpy).toHaveBeenCalled();
    expect(upsertSpy.mock.calls.length).toBeGreaterThan(1);
  });
});
