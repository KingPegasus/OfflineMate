import { routeIntent } from "@/ai/intent-router";

describe("routeIntent", () => {
  it("routes tool-related text to tool intent", () => {
    expect(routeIntent("Please remind me to send the report at 5")).toBe("tool");
  });

  it("routes context-related text to context intent", () => {
    expect(routeIntent("What did I say in meeting notes yesterday?")).toBe("context");
  });

  it("routes mixed tool+context text to tool intent", () => {
    expect(routeIntent("Remind me about the meeting")).toBe("tool");
  });

  it("routes regular prompts to direct intent", () => {
    expect(routeIntent("Explain photosynthesis simply")).toBe("direct");
  });
});
