import { cleanModelOutput, looksLikeToolEcho } from "@/ai/output-guard";

describe("looksLikeToolEcho", () => {
  it("catches a reply that repeats the tool name or payload", () => {
    expect(looksLikeToolEcho("reminders.set")).toBe(true);
    expect(looksLikeToolEcho('notes.create: Note added\npayload: {"id":"note-1"}')).toBe(true);
    expect(looksLikeToolEcho('Done! Payload: {"id":"x"}')).toBe(true);
  });

  it("leaves normal replies alone", () => {
    expect(looksLikeToolEcho("Reminder set for tomorrow at 9:00 AM: call the bank.")).toBe(false);
    expect(looksLikeToolEcho("I saved your note about the trip.")).toBe(false);
    expect(looksLikeToolEcho("e.g. you can say more")).toBe(false);
  });
});

describe("output guard", () => {
  it("collapses repeated lines", () => {
    const input = [
      "I remember your context.",
      "I remember your context.",
      "I remember your context.",
      "Let's continue.",
    ].join("\n");
    const output = cleanModelOutput(input);
    expect(output).toContain("I remember your context.");
    expect(output).toContain("Let's continue.");
    expect((output.match(/I remember your context\./g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it("trims repeated sentence tails", () => {
    const input =
      "I was trying to respond. I was trying to respond. I was trying to respond. Done.";
    const output = cleanModelOutput(input);
    expect((output.match(/I was trying to respond\./g) ?? []).length).toBeLessThanOrEqual(2);
    expect(output).toContain("Done.");
  });
});

