import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildKeywordNotesReply,
  noteSearchTerms,
  rankNotesByTerms,
  searchNotesByKeywords,
} from "@/context/keyword-notes";
import { searchNotesTool } from "@/tools/notes-tool";

type Row = { id: string; title: string; content: string };
const db = vi.hoisted(() => ({ rows: [] as Row[], getAllSync: vi.fn() }));

vi.mock("@/db/database", () => ({ getDb: () => ({ getAllSync: db.getAllSync }) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

beforeEach(() => {
  // Newest first, as the SQL orders them.
  db.rows = [
    { id: "3", title: "pick up bread", content: "pick up bread" },
    { id: "2", title: "dentist appointment is Friday at 3pm", content: "dentist appointment is Friday at 3pm" },
    { id: "1", title: "Trip", content: "Passport, dentist floss, charger" },
  ];
  // Like SQLite's instr(lower(...)) for each term the query binds (two params per term).
  db.getAllSync.mockReset().mockImplementation((_sql: string, params: string[]) => {
    const terms = params.filter((_, i) => i % 2 === 0);
    return db.rows.filter((r) => terms.some((t) => `${r.title}\n${r.content}`.toLowerCase().includes(t)));
  });
});

describe("noteSearchTerms", () => {
  it.each([
    ["What did I save about the dentist?", ["dentist"]],
    ["What’s in my trip note?", ["trip"]],
    ["Did I save anything about Ali's passport", ["ali", "passport"]],
    ["What did I save?", []],
  ])("%s → %j", (query, terms) => {
    expect(noteSearchTerms(query)).toEqual(terms);
  });
});

describe("keyword note search", () => {
  it("finds the note from the website example", () => {
    const { terms, notes } = searchNotesByKeywords("What did I save about the dentist?");
    expect(terms).toEqual(["dentist"]);
    expect(notes.map((n) => n.id)).toEqual(["2", "1"]);
  });

  it("puts notes matching more words first", () => {
    const ranked = rankNotesByTerms(db.rows, ["dentist", "friday"]);
    expect(ranked.map((n) => n.id)).toEqual(["2", "1"]);
  });

  it("doesn't query the database when the question has no keywords", () => {
    expect(searchNotesByKeywords("What did I save?")).toEqual({ terms: [], notes: [] });
    expect(db.getAllSync).not.toHaveBeenCalled();
  });
});

describe("buildKeywordNotesReply (Lite)", () => {
  it("lists the matching notes, with the title once when it repeats the content", () => {
    expect(buildKeywordNotesReply(["dentist"], [db.rows[1]!, db.rows[2]!])).toBe(
      '2 saved notes mention "dentist":\n- dentist appointment is Friday at 3pm\n- Trip: Passport, dentist floss, charger',
    );
  });

  it("says nothing was found instead of letting the model guess", () => {
    expect(buildKeywordNotesReply(["dentist"], [])).toBe('I couldn\'t find a saved note that mentions "dentist".');
  });

  it("leaves questions without keywords to the model", () => {
    expect(buildKeywordNotesReply([], [])).toBeNull();
  });
});

describe("notes.search", () => {
  it("searches by keyword instead of the whole sentence", async () => {
    const result = await searchNotesTool.execute({ query: "find my note about the dentist" });
    expect(result.message).toBe("Found 2 notes.");
    expect(result.payload).toEqual({
      rows: [
        { id: "2", title: "dentist appointment is Friday at 3pm" },
        { id: "1", title: "Trip" },
      ],
    });
  });
});
