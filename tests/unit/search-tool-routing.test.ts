import { routeIntent } from "@/ai/intent-router";
import { selectToolFromInput } from "@/tools/tool-registry";

// The registry imports every tool; stub their native modules (these tests only need routing).
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({}));
vi.mock("expo-calendar/legacy", () => ({}));
vi.mock("expo-contacts/legacy", () => ({}));
vi.mock("expo-alarm", () => ({}));
vi.mock("@/native/ios-alarms", () => ({}));
vi.mock("@/db/database", () => ({ getDb: () => ({}) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

// Found testing 0.12.0 on Android: these went to the model, which said it had no such tool,
// and once routed, "find my note" matched the bare "note" keyword and saved a new note.
describe("searching notes and contacts in everyday words", () => {
  it.each([
    ["Find my note about milk", "notes.search"],
    ["Search my notes for the wifi password", "notes.search"],
    ["Show me the note about rent", "notes.search"],
    ["Find Sara in my contacts", "contacts.search"],
    ["Search my contacts for Ali", "contacts.search"],
  ])("%s → %s", (text, tool) => {
    expect(routeIntent(text)).toBe("tool");
    expect(selectToolFromInput(text)?.name).toBe(tool);
  });

  // Found in the 0.13.0 smoke test: "called" matched the contacts tool's "call" keyword.
  it.each([
    "Save a note called Groceries: milk, eggs and bread.",
    "Make a note called packing list",
    "Create a note titled ideas",
  ])("%s → notes.create", (text) => {
    expect(selectToolFromInput(text)?.name).toBe("notes.create");
  });

  it("still finds a contact to call", () => {
    expect(selectToolFromInput("Call Ali")?.name).toBe("contacts.search");
  });

  // A first attempt at the fix above ("call " as a keyword) outscored reminders here.
  it.each(["Remind me in 15 minutes to call the bank.", "remind me to call mom at 5"])(
    "%s → reminders.set",
    (text) => {
      expect(selectToolFromInput(text)?.name).toBe("reminders.set");
    },
  );

  it("still saves notes", () => {
    expect(selectToolFromInput("Take a note: buy oat milk and eggs")?.name).toBe("notes.create");
    expect(selectToolFromInput("Add a note to find my keys")?.name).toBe("notes.create");
  });
});
