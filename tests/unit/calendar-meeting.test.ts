import { describe, expect, it, vi } from "vitest";
import { routeIntent } from "@/ai/intent-router";
import {
  asksForNextEvent,
  describeEvent,
  describeNextEvent,
  eventMeetingLink,
  joinButtons,
  startsIn,
} from "@/tools/calendar-tool";
import { selectToolFromInput } from "@/tools/tool-registry";

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-notifications", () => ({}));
vi.mock("expo-calendar/legacy", () => ({}));
vi.mock("expo-contacts/legacy", () => ({}));
vi.mock("expo-alarm", () => ({}));
vi.mock("@/native/ios-alarms", () => ({}));
vi.mock("@/db/database", () => ({ getDb: () => ({}) }));
vi.mock("@/context/context-indexer", () => ({ indexNoteForRetrieval: vi.fn() }));

const at = (h: number, m = 0) => new Date(2026, 10, 24, h, m);
const meet = { title: "Team sync", startDate: at(15), endDate: at(16), notes: "Join with Google Meet: https://meet.google.com/kej-dava-qmu" };
const zoom = { title: "Client call", startDate: at(17), endDate: at(17, 30), location: "https://zoom.us/j/81234567890" };
const dentist = { title: "Dentist appointment", startDate: at(11), endDate: at(12), location: "Main St Clinic" };

describe("meeting links in calendar answers", () => {
  it("finds the link in the location, iOS's URL field or the description", () => {
    expect(eventMeetingLink(meet)?.service).toBe("Google Meet");
    expect(eventMeetingLink(zoom)?.service).toBe("Zoom");
    expect(eventMeetingLink({ title: "x", url: "https://teams.live.com/meet/123" })?.service).toBe("Microsoft Teams");
    expect(eventMeetingLink(dentist)).toBeNull();
  });

  it("marks events that have a meeting", () => {
    expect(describeEvent(meet, true, "Google Meet")).toMatch(/^Team sync, .+ · Google Meet$/);
    expect(describeEvent(dentist, true, null)).not.toContain("·");
  });

  it("makes one Join button per meeting, naming the meeting when there are several", () => {
    expect(joinButtons([{ title: "Team sync", link: eventMeetingLink(meet) }])).toEqual([
      { label: "Join Google Meet", url: "https://meet.google.com/kej-dava-qmu" },
    ]);
    const several = joinButtons([meet, dentist, zoom].map((e) => ({ title: e.title, link: eventMeetingLink(e) })));
    expect(several.map((b) => b.label)).toEqual(["Join Google Meet: Team sync", "Join Zoom: Client call"]);
  });
});

describe("the next meeting", () => {
  it("recognises the questions", () => {
    expect(asksForNextEvent("When's my next meeting?")).toEqual({ join: false });
    expect(asksForNextEvent("what is my upcoming event")).toEqual({ join: false });
    expect(asksForNextEvent("Join my next meeting")).toEqual({ join: true });
    expect(asksForNextEvent("join the call")).toEqual({ join: true });
    expect(asksForNextEvent("What's on my calendar tomorrow?")).toBeNull();
  });

  it("says when it starts and gives its Join button", () => {
    const reply = describeNextEvent([zoom, meet, dentist], false, at(14, 35));
    expect(reply.message).toMatch(/^Your next meeting: Team sync, today at .+ \(in 25 min\) · Google Meet\.$/);
    expect(reply.links).toEqual([{ label: "Join Google Meet", url: "https://meet.google.com/kej-dava-qmu" }]);
  });

  it("counts a meeting that has started but not ended", () => {
    const reply = describeNextEvent([meet], false, at(15, 10));
    expect(reply.message).toMatch(/^Your next meeting: Team sync, started at .+ · Google Meet\.$/);
  });

  it("skips events without a link when asked to join", () => {
    expect(describeNextEvent([dentist, zoom], true, at(10)).message).toMatch(/^Your next meeting: Client call/);
    expect(describeNextEvent([dentist], false, at(10)).message).toMatch(/^Next on your calendar: Dentist appointment/);
    expect(describeNextEvent([dentist], true, at(10)).message).toMatch(/^No meetings with a Zoom, Google Meet/);
    expect(describeNextEvent([], false, at(10)).message).toMatch(/^Nothing on your calendar/);
  });

  it("phrases the wait", () => {
    expect(startsIn(at(15), at(14, 35))).toBe("in 25 min");
    expect(startsIn(at(17, 5), at(15))).toBe("in 2 hr 5 min");
    expect(startsIn(at(15), at(15, 1))).toBe("");
  });

  it.each(["When's my next meeting?", "Join my next meeting", "What's my next event?"])(
    "%s goes to the calendar",
    (text) => {
      expect(routeIntent(text)).toBe("tool");
      expect(selectToolFromInput(text)?.name).toBe("calendar.getEvents");
    },
  );
});
