import { useSettingsStore } from "@/stores/settings-store";
import { setAlarmTool } from "@/tools/alarm-tool";
import { createCalendarTool, getCalendarEventsTool } from "@/tools/calendar-tool";
import { searchContactsTool } from "@/tools/contacts-tool";
import { createNoteTool, searchNotesTool } from "@/tools/notes-tool";
import { setReminderTool } from "@/tools/reminders-tool";
import { webSearchTool } from "@/tools/search-tool";
import type { ToolResult } from "@/types/assistant";

export interface ToolParamSpec {
  required?: string[];
  optional?: string[];
}

/** Allowed args: query, text (always), plus tool's required/optional params. */
const GLOBAL_ALLOWED_ARGS = ["query", "text"];

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
  setAlarmTool,
  webSearchTool,
  searchContactsTool,
  createNoteTool,
  searchNotesTool,
  setReminderTool,
];

/** Exported for planner reconciliation tests. */
export function scoreToolMatch(input: string, tool: Tool): number {
  const normalized = input.toLowerCase();
  let best = 0;
  for (const keyword of tool.keywords) {
    if (!keyword || keyword.length === 0) continue;
    const k = keyword.toLowerCase();
    if (normalized.includes(k)) {
      // Prefer longer, more specific matches
      best = Math.max(best, k.length + (k.includes(" ") ? 2 : 0));
    }
  }
  return best;
}

export interface PlannerStepLike {
  id: string;
  description: string;
  toolName?: string;
  args?: Record<string, string>;
  dependsOn?: string[];
}

/** Ranked selection: highest-scoring tool wins. Deterministic for ambiguous prompts. */
export function selectToolFromInput(input: string): Tool | undefined {
  const webSearchEnabled = useSettingsStore.getState().webSearchEnabled;
  const tools = webSearchEnabled
    ? TOOL_REGISTRY
    : TOOL_REGISTRY.filter((t) => t.name !== "search.web");
  let best: Tool | undefined;
  let bestScore = 0;
  for (const tool of tools) {
    const score = scoreToolMatch(input, tool);
    if (score > bestScore) {
      bestScore = score;
      best = tool;
    }
  }
  return best;
}

/**
 * The LLM planner sometimes picks the wrong tool (e.g. reminders.set for "add a note …").
 * When keyword scoring clearly prefers another tool, use it for the first step instead.
 */
export function reconcilePlannerStepsWithKeywordMatch(prompt: string, steps: PlannerStepLike[]): PlannerStepLike[] {
  const selected = selectToolFromInput(prompt);
  if (!selected || steps.length === 0) return steps;
  const first = steps[0];
  if (!first?.toolName) return steps;
  const plannerTool = getToolByName(first.toolName);
  if (!plannerTool) return steps;
  if (first.toolName === selected.name) return steps;

  const plannerScore = scoreToolMatch(prompt, plannerTool);
  const selectedScore = scoreToolMatch(prompt, selected);
  if (selectedScore > plannerScore) {
    return [
      {
        ...first,
        toolName: selected.name,
        description: `Execute ${selected.name}`,
        args: { ...(first.args ?? {}), query: prompt, text: prompt },
      },
      ...steps.slice(1),
    ];
  }
  return steps;
}

/** Filter args to only allowed keys per tool schema. */
export function filterArgsForTool(tool: Tool, args: Record<string, string>): Record<string, string> {
  const allowed = new Set(GLOBAL_ALLOWED_ARGS);
  const spec = tool.params;
  if (spec?.required) for (const k of spec.required) allowed.add(k);
  if (spec?.optional) for (const k of spec.optional) allowed.add(k);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    if (allowed.has(k) && (typeof v === "string" || typeof v === "number")) {
      out[k] = String(v);
    }
  }
  return out;
}

export function getToolByName(name: string) {
  return TOOL_REGISTRY.find((tool) => tool.name === name);
}

export function listToolDescriptors() {
  const webSearchEnabled = useSettingsStore.getState().webSearchEnabled;
  const tools = webSearchEnabled
    ? TOOL_REGISTRY
    : TOOL_REGISTRY.filter((t) => t.name !== "search.web");
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    params: tool.params ?? {},
  }));
}

