import { describe, expect, it } from "vitest";
import { findMeetingLink, meetingServiceFor } from "@/tools/meeting-link";

describe("finding a meeting link in a calendar event", () => {
  it("reads the Google Meet block Google Calendar writes into the description", () => {
    // Copied from a real event synced to the Android emulator (0.14.0 testing); the help link must be skipped.
    const description = [
      "-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-",
      "Join with Google Meet: https://meet.google.com/kej-dava-qmu",
      "",
      "Learn more about Meet at: https://support.google.com/a/users/answer/9282720",
      "",
      "Please do not edit this section.",
    ].join("\n");
    expect(findMeetingLink(description)).toEqual({ service: "Google Meet", url: "https://meet.google.com/kej-dava-qmu" });
  });

  it("reads Zoom invite text, including company subdomains and passcodes", () => {
    const zoom =
      "Join Zoom Meeting\nhttps://us02web.zoom.us/j/81234567890?pwd=abcDEF123.1\n\nMeeting ID: 812 3456 7890\nPasscode: 123456";
    expect(findMeetingLink(zoom)).toEqual({ service: "Zoom", url: "https://us02web.zoom.us/j/81234567890?pwd=abcDEF123.1" });
    expect(meetingServiceFor("https://zoom.us/my/sara.ahmed")).toBe("Zoom");
  });

  it("reads Teams links for work and personal accounts", () => {
    const teams =
      "Microsoft Teams meeting\nJoin on your computer, mobile app or room device\nClick here to join the meeting<https://teams.microsoft.com/l/meetup-join/19%3ameeting_NjA0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d>";
    expect(findMeetingLink(teams)?.service).toBe("Microsoft Teams");
    expect(findMeetingLink(teams)?.url).toMatch(/^https:\/\/teams\.microsoft\.com\/l\/meetup-join\/.+%7d$/);
    expect(meetingServiceFor("https://teams.live.com/meet/9876543210")).toBe("Microsoft Teams");
  });

  it("reads Webex links", () => {
    expect(meetingServiceFor("https://acme.webex.com/meet/sara")).toBe("Webex");
    expect(meetingServiceFor("https://acme.webex.com/acme/j.php?MTID=m123")).toBe("Webex");
  });

  it("checks the location before the description", () => {
    expect(findMeetingLink("https://zoom.us/j/111", "https://meet.google.com/abc-defg-hij")?.service).toBe("Zoom");
    expect(findMeetingLink(null, "Dial in or join: https://meet.google.com/abc-defg-hij.")?.url).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("drops the sentence's punctuation from the end of the link", () => {
    expect(findMeetingLink("Join here (https://zoom.us/j/123456).")?.url).toBe("https://zoom.us/j/123456");
  });

  it("ignores look-alikes, other pages and insecure links", () => {
    for (const url of [
      "http://zoom.us/j/123456", // not https
      "https://zoom-login.example.com/j/123456", // look-alike domain
      "https://zoom.us.example.com/j/123456",
      "https://user:pass@zoom.us/j/123456",
      "https://zoom.us/pricing", // a Zoom page, not a meeting
      "https://meet.google.com/", // no meeting code
      "https://support.google.com/a/users/answer/9282720",
      "https://teams.microsoft.com/downloads",
    ]) {
      expect(meetingServiceFor(url), url).toBeNull();
    }
    expect(findMeetingLink("Dentist appointment at Main St Clinic, 12 Main St")).toBeNull();
    expect(findMeetingLink(undefined, "", null)).toBeNull();
  });
});
