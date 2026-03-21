import { routeIntent } from "@/ai/intent-router";

describe("routeIntent", () => {
  it("routes tool-related text to tool intent", () => {
    expect(routeIntent("Please remind me to send the report at 5")).toBe("tool");
  });

  it("routes STT-style find me in N minutes as tool (often misheard remind me)", () => {
    expect(routeIntent("Find me in 1 minute to get up.")).toBe("tool");
    expect(routeIntent("Remind me in 2 minutes to stretch")).toBe("tool");
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

  it("routes explicit search queries to tool intent", () => {
    expect(routeIntent("search for population of Tokyo")).toBe("tool");
    expect(routeIntent("current date. Kindly check from the internet.")).toBe("tool");
    expect(routeIntent("what is the current price of bitcoin")).toBe("tool");
  });

  it("routes bare definitional questions to direct (not web search)", () => {
    expect(routeIntent("What is an LLM?")).toBe("direct");
    expect(routeIntent("what is the capital of France")).toBe("direct");
    expect(routeIntent("who was Shakespeare?")).toBe("direct");
    expect(routeIntent("when is Christmas?")).toBe("direct");
    expect(routeIntent("tell me about your weekend")).toBe("direct");
  });

  it("routes calendar phrases to tool, not bare prose about events/schedules", () => {
    expect(routeIntent("What's on my calendar tomorrow?")).toBe("tool");
    expect(routeIntent("add event for lunch Tuesday")).toBe("tool");
    expect(routeIntent("That was a major event for our team")).toBe("direct");
    expect(routeIntent("The Gregorian calendar has leap years")).toBe("direct");
    expect(routeIntent("The train schedule is confusing")).toBe("direct");
  });

  it("routes messaging-style phrases to tool, not programming prose", () => {
    expect(routeIntent("Call mom when you land")).toBe("tool");
    expect(routeIntent("Text me the address")).toBe("tool");
    expect(routeIntent("recursive call in JavaScript")).toBe("direct");
    expect(routeIntent("This error message is unclear")).toBe("direct");
  });

  it("does not match text/phone phrase keywords inside longer words (substring false positives)", () => {
    expect(routeIntent("Give me the context of this file")).toBe("direct");
    expect(routeIntent("smartphone is too expensive")).toBe("direct");
    expect(routeIntent("hypertext and links")).toBe("direct");
  });

  it("routes note-taking phrases to tool", () => {
    expect(routeIntent("Take a note: buy milk")).toBe("tool");
    expect(routeIntent("Remember this password is wrong")).toBe("tool");
    expect(routeIntent("Play this musical note on the piano")).toBe("direct");
  });
});
