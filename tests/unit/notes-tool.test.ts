import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNoteTool } from "@/tools/notes-tool";

const { runSync } = vi.hoisted(() => ({ runSync: vi.fn() }));

vi.mock("@/db/database", () => ({
  getDb: () => ({ runSync }),
}));

vi.mock("@/context/context-indexer", () => ({
  indexNoteForRetrieval: vi.fn(),
}));

describe("notes.create", () => {
  beforeEach(() => {
    runSync.mockClear();
  });

  it("fills content from text when planner only passes query/text", async () => {
    await createNoteTool.execute({
      query: "add a note to pick up bread.",
      text: "add a note to pick up bread.",
    });
    const insert = runSync.mock.calls.find((c) => String(c[0]).includes("INSERT INTO notes"));
    expect(insert).toBeDefined();
    const title = insert![1][1] as string;
    const content = insert![1][2] as string;
    expect(content).toMatch(/pick up bread/i);
    expect(content.toLowerCase()).not.toContain("add a note");
    expect(title.toLowerCase()).toContain("pick up");
  });

  // Found in the 0.13.0 smoke test: the whole sentence became the note's title.
  it.each([
    ["Save a note called Groceries: milk, eggs and bread.", "Groceries", "milk, eggs and bread."],
    ["Make a note called packing list", "packing list", "packing list"],
    ["create a new note titled Ideas: a bike rack for the balcony", "Ideas", "a bike rack for the balcony"],
  ])("names the note from %s", async (text, title, content) => {
    await createNoteTool.execute({ query: text, text });
    const insert = runSync.mock.calls.find((c) => String(c[0]).includes("INSERT INTO notes"));
    expect(insert![1][1]).toBe(title);
    expect(insert![1][2]).toBe(content);
  });

  it("uses explicit title and content when provided", async () => {
    await createNoteTool.execute({
      title: "Groceries",
      content: "bread and milk",
      text: "add a note to pick up bread",
    });
    const insert = runSync.mock.calls.find((c) => String(c[0]).includes("INSERT INTO notes"));
    expect(insert![1][1]).toBe("Groceries");
    expect(insert![1][2]).toBe("bread and milk");
  });
});
