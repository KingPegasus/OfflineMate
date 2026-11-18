import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

/** How a tool is shown to people: a plain name, what it does, and something to try. */
export interface ToolDisplay {
  /** Registry id, e.g. "reminders.set" (shown only with technical details on). */
  name: string;
  title: string;
  description: string;
  /** A request that routes to this tool; tests check it does. */
  example: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  /** True when it needs an internet connection. */
  online?: boolean;
}

/** In the order the Tools tab lists them: everyday things first. */
export const TOOL_DISPLAY: readonly ToolDisplay[] = [
  {
    name: "reminders.set",
    title: "Reminders",
    description: "Get a notification at the time you choose.",
    example: "Remind me at 9 to call the bank",
    icon: "notifications-outline",
  },
  {
    name: "alarms.set",
    title: "Alarms",
    description: "Set an alarm in your phone's clock app.",
    example: "Wake me up at 7am",
    icon: "alarm-outline",
  },
  {
    name: "calendar.getEvents",
    title: "Your calendar",
    description: "See what's coming up.",
    example: "What's on my calendar tomorrow?",
    icon: "calendar-outline",
  },
  {
    name: "calendar.createEvent",
    title: "Add to calendar",
    description: "Put a new event in your calendar.",
    example: "Add dentist appointment Friday at 3pm",
    icon: "calendar-number-outline",
  },
  {
    name: "notes.create",
    title: "Save a note",
    description: "Write something down to find later.",
    example: "Add a note to pick up bread",
    icon: "create-outline",
  },
  {
    name: "notes.search",
    title: "Find a note",
    description: "Look through the notes you saved.",
    example: "What did I save about the dentist?",
    icon: "search-outline",
  },
  {
    name: "contacts.search",
    title: "Contacts",
    description: "Find someone's phone number.",
    example: "What's Sarah's number?",
    icon: "person-outline",
  },
  {
    name: "weather.current",
    title: "Weather",
    description: "Today's weather or tomorrow's forecast for a town or city.",
    example: "What's the weather in London tomorrow?",
    icon: "partly-sunny-outline",
    online: true,
  },
  {
    name: "search.web",
    title: "Web search",
    description: "Look up current information online.",
    example: "Search the web for the latest football scores",
    icon: "globe-outline",
    online: true,
  },
];

/** Plain name for a tool id; falls back to the id for anything unlisted. */
export function toolTitle(name: string): string {
  return TOOL_DISPLAY.find((t) => t.name === name)?.title ?? name;
}
