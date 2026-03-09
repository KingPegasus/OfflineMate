import { cleanModelOutput } from "@/ai/output-guard";

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

