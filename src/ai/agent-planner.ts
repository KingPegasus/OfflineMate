import type { ChatMessage } from "@/types/assistant";
import { filterArgsForTool, getToolByName, listToolDescriptors, selectToolFromInput } from "@/tools/tool-registry";

export interface PlannedStep {
  id: string;
  description: string;
  toolName?: string;
  args?: Record<string, string>;
  dependsOn?: string[];
}

interface PlannedPayload {
  steps: unknown[];
}

export interface PlannerInput {
  prompt: string;
  maxSteps?: number;
}

function parsePlanPayload(raw: string): PlannedPayload | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const payload = fenced?.[1] ?? raw;
  const firstCurly = payload.indexOf("{");
  const lastCurly = payload.lastIndexOf("}");
  if (firstCurly === -1 || lastCurly === -1 || lastCurly <= firstCurly) return null;
  try {
    return JSON.parse(payload.slice(firstCurly, lastCurly + 1)) as PlannedPayload;
  } catch {
    return null;
  }
}

function sanitizeArgs(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value);
    }
  }
  return result;
}

function validatePlan(payload: PlannedPayload | null, maxSteps: number): PlannedStep[] {
  if (!payload || !Array.isArray(payload.steps)) return [];
  const valid: PlannedStep[] = [];
  for (const [index, step] of payload.steps.entries()) {
    if (!step || typeof step !== "object") continue;
    const candidate = step as Record<string, unknown>;
    const toolName = typeof candidate.toolName === "string" ? candidate.toolName : undefined;
    const description =
      typeof candidate.description === "string" && candidate.description.trim().length > 0
        ? candidate.description.trim()
        : `Step ${index + 1}`;
    const tool = toolName ? getToolByName(toolName) : undefined;
    if (toolName && !tool) continue;
    const rawArgs = sanitizeArgs(candidate.args);
    const args = tool ? filterArgsForTool(tool, rawArgs) : rawArgs;
    valid.push({
      id: typeof candidate.id === "string" ? candidate.id : String(index + 1),
      description,
      toolName,
      args,
      dependsOn: Array.isArray(candidate.dependsOn)
        ? candidate.dependsOn.filter((dep): dep is string => typeof dep === "string")
        : undefined,
    });
    if (valid.length >= maxSteps) break;
  }
  return valid;
}

function fallbackPlanFromPrompt(prompt: string): PlannedStep[] {
  const selected = selectToolFromInput(prompt);
  if (!selected) {
    return [{ id: "1", description: "Answer directly using available context." }];
  }
  return [
    {
      id: "1",
      description: `Execute ${selected.name}`,
      toolName: selected.name,
      args: { query: prompt, text: prompt },
    },
    { id: "2", description: "Compose a concise response from tool output." },
  ];
}

function buildPlannerMessages(prompt: string): ChatMessage[] {
  const toolInfo = JSON.stringify(listToolDescriptors(), null, 2);
  return [
    {
      id: "planner-system",
      role: "system",
      createdAt: Date.now(),
      content:
        "You are a planning module. Return ONLY valid JSON with shape: " +
        '{"steps":[{"id":"1","description":"...","toolName":"tool.name(optional)","args":{"k":"v"},"dependsOn":["1"]}]}. ' +
        "Create up to 4 steps. Use toolName only from the provided tools. Keep args minimal.",
    },
    {
      id: "planner-tools",
      role: "system",
      createdAt: Date.now(),
      content: `Available tools:\n${toolInfo}`,
    },
    {
      id: "planner-user",
      role: "user",
      createdAt: Date.now(),
      content: prompt,
    },
  ];
}

export async function planStepsFromPrompt(
  input: PlannerInput,
  generate: (messages: ChatMessage[]) => Promise<string>,
): Promise<PlannedStep[]> {
  const maxSteps = Math.max(1, Math.min(input.maxSteps ?? 4, 6));
  try {
    const plannerOutput = await generate(buildPlannerMessages(input.prompt));
    const payload = parsePlanPayload(plannerOutput);
    const validated = validatePlan(payload, maxSteps);
    if (validated.length > 0) return validated;
  } catch {
    // Fall through to deterministic fallback.
  }
  return fallbackPlanFromPrompt(input.prompt).slice(0, maxSteps);
}

export interface ExecutedPlanResult {
  toolSummary: string;
  planSummary: string;
}

export async function executePlanSteps(
  steps: PlannedStep[],
  executeTool: (toolName: string, args: Record<string, string>) => Promise<string>,
): Promise<ExecutedPlanResult> {
  const executed: string[] = [];
  const planSummary = steps.map((step) => step.description).join(" -> ");
  for (const step of steps) {
    if (!step.toolName) continue;
    const output = await executeTool(step.toolName, step.args ?? {});
    executed.push(`${step.toolName}: ${output}`);
  }
  return {
    toolSummary: executed.join("\n"),
    planSummary,
  };
}
