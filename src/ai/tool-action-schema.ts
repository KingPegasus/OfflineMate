export type ToolActionDecisionType = "use_tool" | "answer_direct";

export interface ToolActionDecision {
  decision: ToolActionDecisionType;
  toolName: string | null;
  query: string | null;
  answer: string | null;
}

function extractJsonPayload(raw: string): string | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const payload = fenced?.[1] ?? raw;
  const firstCurly = payload.indexOf("{");
  const lastCurly = payload.lastIndexOf("}");
  if (firstCurly === -1 || lastCurly === -1 || lastCurly <= firstCurly) return null;
  return payload.slice(firstCurly, lastCurly + 1);
}

function normalizeOptionalText(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDecisionValue(input: unknown): ToolActionDecisionType | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().toLowerCase();
  if (raw === "use_tool" || raw.includes("use_tool")) return "use_tool";
  if (raw === "answer_direct" || raw.includes("answer_direct")) return "answer_direct";
  return null;
}

function normalizeToolNameValue(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().toLowerCase();
  if (raw === "search.web" || raw.includes("search.web")) return "search.web";
  return null;
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower === "string|null" ||
    lower === "search.web|null" ||
    lower === "use_tool|answer_direct" ||
    lower.includes("[insert current date")
  );
}

export function parseToolActionDecision(raw: string): ToolActionDecision | null {
  const jsonPayload = extractJsonPayload(raw);
  if (!jsonPayload) return null;

  try {
    const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
    const decision = normalizeDecisionValue(parsed.decision);
    if (!decision) return null;

    const toolName = normalizeToolNameValue(parsed.toolName) ?? normalizeOptionalText(parsed.toolName);
    const queryCandidate = normalizeOptionalText(parsed.query);
    const query = queryCandidate && !looksLikePlaceholder(queryCandidate) ? queryCandidate : null;
    const answer = normalizeOptionalText(parsed.answer);

    if (decision === "use_tool") {
      if (toolName !== "search.web") return null;
      if (!query) return null;
      return { decision, toolName, query, answer };
    }

    if (!answer) return null;
    return { decision, toolName, query, answer };
  } catch {
    return null;
  }
}

/**
 * Lenient fallback parser for non-JSON outputs.
 * Supports:
 * - ACTION:search.web
 *   QUERY:...
 * - Direct answer text when no action is present
 */
export function parseToolActionDecisionLenient(raw: string): ToolActionDecision | null {
  const actionMatch = raw.match(/action\s*:\s*([a-z0-9._-]+)/i);
  const queryMatch = raw.match(/query\s*:\s*(.+)/i);
  if (actionMatch?.[1]) {
    const toolName = actionMatch[1].trim().toLowerCase();
    if (toolName !== "search.web") return null;
    const query = queryMatch?.[1]?.trim();
    if (!query) return null;
    return {
      decision: "use_tool",
      toolName: "search.web",
      query,
      answer: null,
    };
  }

  const direct = raw.trim();
  const lower = direct.toLowerCase();
  const looksStructured =
    direct.startsWith("{") ||
    direct.startsWith("```") ||
    lower.includes("\"decision\"") ||
    lower.includes("toolname") ||
    lower.includes("query:");
  // Reject model reasoning (<think>...</think>) as direct answer — it's not a valid decision
  const isThinkOrReasoning =
    lower.includes("</think>") ||
    /<think>/i.test(direct) ||
    /^(okay|let me see|since i'?m a language model|i don'?t have real[- ]?time)/i.test(direct);
  if (direct.length > 0 && !looksStructured && !isThinkOrReasoning) {
    return {
      decision: "answer_direct",
      toolName: null,
      query: null,
      answer: direct,
    };
  }
  return null;
}

