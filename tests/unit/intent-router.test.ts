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

  it('routes "set a reminder ..." text to tool intent', () => {
    expect(routeIntent("set a reminder in 2 minutes to drink water")).toBe("tool");
  });

  it("routes regular prompts to direct intent", () => {
    expect(routeIntent("Explain photosynthesis simply")).toBe("direct");
  });

  it("routes set alarm to tool intent", () => {
    expect(routeIntent("set alarm for 7am")).toBe("tool");
  });

  it("routes search queries to tool intent", () => {
    expect(routeIntent("search for population of Tokyo")).toBe("tool");
    expect(routeIntent("what is the capital of France")).toBe("tool");
    expect(routeIntent("current date. Kindly check from the internet.")).toBe("tool");
  });
});
