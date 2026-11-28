/**
 * Finds a video-meeting link (Zoom, Google Meet, Microsoft Teams, Webex) in calendar event text, so chat can
 * show a "Join" button. Runs on the phone; nothing is sent anywhere.
 *
 * Only secure links on the services' own domains count. Any other link in an invite (a "learn more" page, or
 * a look-alike such as zoom-login.example.com) stays plain text, so an invite can't turn into a Join button
 * that opens a fake site.
 */

export type MeetingService = "Zoom" | "Google Meet" | "Microsoft Teams" | "Webex";

export interface MeetingLink {
  service: MeetingService;
  url: string;
}

const SERVICES: { service: MeetingService; host: RegExp; path: RegExp }[] = [
  // zoom.us/j/123, us02web.zoom.us/j/123?pwd=…, zoom.us/my/name, zoom.us/w/123 (webinars)
  { service: "Zoom", host: /^([a-z0-9-]+\.)*zoom\.us$/, path: /^\/(j|my|w|wc\/join)\/[^/]+/ },
  // meet.google.com/abc-defg-hij (Google Calendar writes "Join with Google Meet: <link>" into the description)
  { service: "Google Meet", host: /^meet\.google\.com$/, path: /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\b/ },
  // teams.microsoft.com/l/meetup-join/…, teams.live.com/meet/… (personal accounts)
  { service: "Microsoft Teams", host: /^teams\.microsoft\.com$/, path: /^\/l\/meetup-join\// },
  { service: "Microsoft Teams", host: /^teams\.live\.com$/, path: /^\/meet\// },
  // company.webex.com/meet/name, company.webex.com/company/j.php?MTID=…
  { service: "Webex", host: /^([a-z0-9-]+\.)+webex\.com$/, path: /^\/(meet\/|[a-z0-9-]+\/j\.php|join\/|wbxmjs\/joinservice\/)/i },
];

// Stops at whitespace, quotes and angle brackets (invites wrap links in <…>).
const URL_PATTERN = /https:\/\/[^\s"'<>]+/gi;

/** Trailing punctuation that belongs to the sentence, not the link ("…/j/123." or "(…/j/123)"). */
function trimUrl(raw: string): string {
  let url = raw.replace(/[.,;:!?]+$/, "");
  while (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) url = url.slice(0, -1);
  return url;
}

/** The meeting service a link belongs to, or null for any other link. */
export function meetingServiceFor(url: string): MeetingService | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  const match = SERVICES.find((s) => s.host.test(host) && s.path.test(parsed.pathname));
  return match?.service ?? null;
}

/** The first meeting link in the given texts (location first, then the description), or null. */
export function findMeetingLink(...texts: (string | null | undefined)[]): MeetingLink | null {
  for (const text of texts) {
    if (!text) continue;
    for (const raw of text.match(URL_PATTERN) ?? []) {
      const url = trimUrl(raw);
      const service = meetingServiceFor(url);
      if (service) return { service, url };
    }
  }
  return null;
}
