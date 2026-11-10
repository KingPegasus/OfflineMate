import type { ModelTier } from "@/types/assistant";

/**
 * Lite models (SmolLM2 135M/360M, LFM 2.5 350M) can't reliably turn tool output into a reply: they
 * copy the tool name or the "Payload: {...}" line, or (LFM 350M) emit <|endoftext|> and then unrelated
 * text. Tool messages are already full sentences, so on Lite chat shows them as-is instead.
 */
export function usesDeterministicToolReplies(tier: ModelTier): boolean {
  return tier === "lite";
}

/** "reminders.set: ..." — the prefix executePlanSteps and the search flow put on each tool's output. */
const TOOL_LINE = /^([a-z]+\.[a-zA-Z]+):\s?(.*)$/;
const PAYLOAD_LINE = /^payload:\s*(\{.*\})\s*$/i;
const MAX_LISTED = 5;

/** Names or titles from a tool payload (contacts.search, notes.search), so "Found 2 notes." says which. */
function listFromPayload(json: string): string[] {
  try {
    const payload = JSON.parse(json) as Record<string, unknown>;
    for (const key of ["contacts", "rows"]) {
      const items = payload[key];
      if (!Array.isArray(items)) continue;
      return items
        .map((item) => {
          const record = (item ?? {}) as Record<string, unknown>;
          const label = record.name ?? record.title;
          return typeof label === "string" ? label.trim() : "";
        })
        .filter(Boolean)
        .slice(0, MAX_LISTED);
    }
  } catch {
    // Not JSON: nothing to list.
  }
  return [];
}

/**
 * Turn the combined tool output ("reminders.set: Reminder set for ...\nPayload: {...}\nPlan: ...")
 * into the reply chat shows: each tool's message, without tool names, payload JSON or the plan line.
 * Returns null when there is nothing readable to show.
 */
export function buildDeterministicToolReply(toolResult?: string): string | null {
  if (!toolResult?.trim()) return null;
  const blocks: { lines: string[]; listed: string[] }[] = [];
  for (const raw of toolResult.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^plan:/i.test(line.trim())) continue;
    const payload = line.trim().match(PAYLOAD_LINE);
    if (payload) {
      if (blocks.length > 0) blocks[blocks.length - 1].listed.push(...listFromPayload(payload[1]));
      continue;
    }
    const toolLine = line.match(TOOL_LINE);
    if (toolLine) {
      blocks.push({ lines: toolLine[2].trim() ? [toolLine[2].trim()] : [], listed: [] });
      continue;
    }
    if (blocks.length === 0) blocks.push({ lines: [], listed: [] });
    blocks[blocks.length - 1].lines.push(line);
  }
  const replies = blocks
    .map(({ lines, listed }) => {
      const body = lines.join("\n").trim();
      const list = listed.length > 0 ? `\n${listed.map((name) => `- ${name}`).join("\n")}` : "";
      return body ? body + list : "";
    })
    .filter(Boolean);
  return replies.length > 0 ? replies.join("\n\n") : null;
}
