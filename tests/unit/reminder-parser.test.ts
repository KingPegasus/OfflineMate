import { resolveReminderSeconds, resolveReminderText } from "@/tools/reminder-parser";

describe("reminder parser", () => {
  it("uses explicit seconds when provided", () => {
    expect(resolveReminderSeconds("600", "remind me in 10 minutes")).toBe(600);
  });

  it("infers minutes from natural language", () => {
    expect(resolveReminderSeconds(undefined, "Remind me in 10 minutes to drink water")).toBe(600);
  });

  it("extracts concise reminder text", () => {
    expect(resolveReminderText("Remind me in 10 minutes to drink water")).toBe("drink water");
  });

  it("falls back to query text when explicit text is empty", () => {
    expect(resolveReminderText("", "Remind me in 5 minutes to sleep")).toBe("sleep");
    expect(resolveReminderSeconds(undefined, "Remind me in 5 minutes to sleep")).toBe(300);
  });

  it("strips trailing time from reminder body so notification shows only the action", () => {
    expect(resolveReminderText(undefined, "Remind me to eat icecream in 3 mins.")).toBe("eat icecream");
    expect(resolveReminderText(undefined, "Remind me in 5 minutes to call mom")).toBe("call mom");
    expect(resolveReminderText(undefined, "Remind me to wake up tomorrow same time.")).toBe("wake up");
  });

  it("parses relative times: tomorrow / same time as ~24h", () => {
    expect(resolveReminderSeconds(undefined, "Remind me to wake up tomorrow same time.")).toBe(86400);
    expect(resolveReminderSeconds(undefined, "remind me tomorrow")).toBe(86400);
  });

  it("returns 0 when no duration can be parsed (caller should not default to 60s)", () => {
    expect(resolveReminderSeconds(undefined, "remind me to buy milk")).toBe(0);
  });

  it("falls back safely", () => {
    expect(resolveReminderSeconds(undefined, "please remind me")).toBe(0);
    expect(resolveReminderText(undefined, undefined)).toBe("Reminder");
  });
});

