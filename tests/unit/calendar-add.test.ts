import { routeIntent, wantsCalendarAddIntent } from "@/ai/intent-router";
import { extractEventTitle, titleFromCommand } from "@/tools/calendar-tool";
import { dropRepeatedWriteSteps, selectToolFromInput } from "@/tools/tool-registry";

// The registry imports every tool; stub their native modules (these tests only need routing and parsing).
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-notifications", () => ({}));
vi.mock("expo-calendar/legacy", () => ({}));
vi.mock("expo-contacts/legacy", () => ({}));
vi.mock("expo-alarm", () => ({}));
vi.mock("@/native/ios-alarms", () => ({}));
vi.mock("@/db/database", () => ({ getDb: () => ({}) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

describe("adding a calendar event in everyday words", () => {
  // Found testing 0.11.0 on iOS: "Add dentist appointment tomorrow at 3pm" went to the model, which echoed it.
  it.each([
    "Add dentist appointment tomorrow at 3pm",
    "Schedule lunch with Sara on Friday at 1pm",
    "Book a meeting with the bank next Monday at 10am",
    "Put my interview in the calendar tomorrow at 9:30",
  ])("%s → calendar.createEvent", (text) => {
    expect(routeIntent(text)).toBe("tool");
    expect(selectToolFromInput(text)?.name).toBe("calendar.createEvent");
  });

  it("needs a day or time, so coding and how-to questions stay direct", () => {
    expect(wantsCalendarAddIntent("how do i add an event listener in javascript")).toBe(false);
    // The add verb has to start the request.
    expect(wantsCalendarAddIntent("what should i make for dinner tonight?")).toBe(false);
    expect(wantsCalendarAddIntent("can you book a meeting with the bank tomorrow at 10am")).toBe(true);
    expect(routeIntent("How do I make a meeting agenda?")).not.toBe("tool");
    expect(selectToolFromInput("Do I have a dentist appointment tomorrow?")?.name).not.toBe("calendar.createEvent");
  });

  it("titles the event without the command words", () => {
    expect(extractEventTitle("Add dentist appointment tomorrow at 3pm")).toBe("Dentist appointment");
    expect(extractEventTitle("Schedule lunch with Sara on Friday at 1pm")).toBe("Lunch with Sara");
    expect(extractEventTitle("Add a call with Ali to my calendar tomorrow at 5pm")).toBe("Call with Ali");
    expect(extractEventTitle("Schedule a meeting with John tomorrow at 2pm")).toBe("With John");
  });
});

describe("calendar.createEvent from a plan", () => {
  it("takes the title from the user's words over the planner's", () => {
    expect(titleFromCommand("Book a meeting with the bank on Friday at 10am")).toBe("meeting with the bank");
    expect(titleFromCommand("Put my interview in the calendar tomorrow at 9:30")).toBe("interview");
    expect(titleFromCommand("What's on my calendar tomorrow?")).toBeNull();
  });

  it("keeps write steps that carry their own text (two different reminders)", () => {
    const steps = [
      { id: "1", description: "first", toolName: "reminders.set", args: { text: "at 9 to call mom" } },
      { id: "2", description: "second", toolName: "reminders.set", args: { text: "at 5 to buy milk" } },
    ];
    expect(dropRepeatedWriteSteps(steps).map((s) => s.id)).toEqual(["1", "2"]);
  });

  it("drops a repeated write step for the same message, so one request adds one event", () => {
    const steps = [
      { id: "1", description: "add", toolName: "calendar.createEvent", args: { title: "The bank" } },
      { id: "2", description: "add again", toolName: "calendar.createEvent", args: { title: "Meeting with the bank" } },
      { id: "3", description: "look", toolName: "calendar.getEvents" },
      { id: "4", description: "reply" },
    ];
    expect(dropRepeatedWriteSteps(steps).map((s) => s.id)).toEqual(["1", "3", "4"]);
  });
});
