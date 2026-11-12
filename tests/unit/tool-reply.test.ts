import { buildDeterministicToolReply, usesDeterministicToolReplies } from "@/ai/tool-reply";

describe("deterministic tool replies (Lite)", () => {
  it("is used on Lite for every tool", () => {
    expect(usesDeterministicToolReplies("lite")).toBe(true);
    expect(usesDeterministicToolReplies("lite", "search.web: - Weather: London")).toBe(true);
  });

  it("is used on every tier for on-device tools, so facts like phone numbers aren't dropped", () => {
    const contacts = 'contacts.search: Found 1 contact for "Ali".\nPayload: {"contacts":[]}\nPlan: Execute contacts.search';
    expect(usesDeterministicToolReplies("standard", contacts)).toBe(true);
    expect(usesDeterministicToolReplies("full", "alarms.set: Alarm set for 6:30 AM\nnotes.create: Note saved: x")).toBe(true);
  });

  it("leaves web search results, and replies without tool output, to the model on Standard and Full", () => {
    expect(usesDeterministicToolReplies("standard", "search.web: - Weather in London: ...")).toBe(false);
    expect(usesDeterministicToolReplies("full", "notes.create: Note saved: x\nsearch.web: - ...")).toBe(false);
    expect(usesDeterministicToolReplies("standard")).toBe(false);
    expect(usesDeterministicToolReplies("full", "")).toBe(false);
  });

  it("shows the reminder confirmation without the tool name or plan", () => {
    const toolResult =
      "reminders.set: Reminder set for tomorrow at 9:00 AM: call the bank.\nPlan: Execute reminders.set";
    expect(buildDeterministicToolReply(toolResult)).toBe("Reminder set for tomorrow at 9:00 AM: call the bank.");
  });

  it("drops payload JSON", () => {
    const toolResult = 'notes.create: Note saved: pack passport\nPayload: {"id":"abc123"}\nPlan: Execute notes.create';
    expect(buildDeterministicToolReply(toolResult)).toBe("Note saved: pack passport");
  });

  it("lists names and titles from search payloads", () => {
    const notes = 'notes.search: Found 2 notes.\nPayload: {"rows":[{"id":"1","title":"Trip"},{"id":"2","title":"Bank"}]}';
    expect(buildDeterministicToolReply(notes)).toBe("Found 2 notes.\n- Trip\n- Bank");
    const contacts = 'contacts.search: Found 1 contacts.\nPayload: {"contacts":[{"id":"9","name":"Sam Lee"}]}';
    expect(buildDeterministicToolReply(contacts)).toBe("Found 1 contacts.\n- Sam Lee");
  });

  it("lists each contact's phone numbers", () => {
    const contacts =
      'contacts.search: Found 2 contacts for "Ali".\nPayload: {"contacts":[{"id":"1","name":"Ali Khan","phones":["+92 300 1234567","042 1234567"]},{"id":"2","name":"Ali Raza","phones":[]}]}';
    expect(buildDeterministicToolReply(contacts)).toBe(
      'Found 2 contacts for "Ali".\n- Ali Khan: +92 300 1234567, 042 1234567\n- Ali Raza: no phone number saved',
    );
  });

  it("keeps multi-line tool messages such as web search results", () => {
    const toolResult =
      'search.web: Pharmacies in Lahore\n- City Pharmacy: Open 24 hours\n- Care Chemist: Main Blvd\nPayload: {"query":"pharmacy near Lahore","resultCount":2}';
    expect(buildDeterministicToolReply(toolResult)).toBe(
      "Pharmacies in Lahore\n- City Pharmacy: Open 24 hours\n- Care Chemist: Main Blvd",
    );
  });

  it("joins the results of several tools", () => {
    const toolResult = "notes.create: Note saved: milk\nreminders.set: Reminder set to go off in 10 minutes: buy milk.";
    expect(buildDeterministicToolReply(toolResult)).toBe(
      "Note saved: milk\n\nReminder set to go off in 10 minutes: buy milk.",
    );
  });

  it("passes tool errors through", () => {
    expect(buildDeterministicToolReply("reminders.set: Notification permission denied.")).toBe(
      "Notification permission denied.",
    );
  });

  it("returns null when there is nothing to show", () => {
    expect(buildDeterministicToolReply(undefined)).toBeNull();
    expect(buildDeterministicToolReply("Plan: Execute reminders.set")).toBeNull();
    expect(buildDeterministicToolReply('reminders.set:\nPayload: {"id":"x"}')).toBeNull();
  });
});
