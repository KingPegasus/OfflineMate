import { createCalendarTool, getCalendarEventsTool } from "@/tools/calendar-tool";
import { searchContactsTool } from "@/tools/contacts-tool";
import { createNoteTool, searchNotesTool } from "@/tools/notes-tool";
import { setReminderTool } from "@/tools/reminders-tool";
import type { ToolResult } from "@/types/assistant";

export interface ToolParamSpec {
  required?: string[];
  optional?: string[];
}

export interface Tool {
  name: string;
  description: string;
  keywords: string[];
  params?: ToolParamSpec;
  execute: (params: Record<string, string>) => Promise<ToolResult>;
}

export const TOOL_REGISTRY: Tool[] = [
  getCalendarEventsTool,
  createCalendarTool,
  searchContactsTool,
  createNoteTool,
  searchNotesTool,
  setReminderTool,
];

export function selectToolFromInput(input: string) {
  const normalized = input.toLowerCase();
  return TOOL_REGISTRY.find((tool) =>
    tool.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

export function getToolByName(name: string) {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

export function listToolDescriptors() {
  return TOOL_REGISTRY.map((tool) => ({
    name: tool.name,
    description: tool.description,
    params: tool.params ?? {},
  }));
}

