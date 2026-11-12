import type { ModelTier } from "@/types/assistant";

/** "reminders.set: ..." — the prefix executePlanSteps and the search flow put on each tool's output. */
const TOOL_LINE = /^([a-z]+\.[a-zA-Z]+):\s?(.*)$/;

/** Tools whose output is a web page summary the model still has to read and answer from. */
const SYNTHESIZED_TOOLS = new Set(["search.web"]);

/**
 * Whether chat shows the tools' own sentences instead of a model-written reply.
 *
 * Lite models (SmolLM2 135M/360M, LFM 2.5 350M) can't reliably turn tool output into a reply: they copy the
 * tool name or the "Payload: {...}" line, or (LFM 350M) emit <|endoftext|> and then unrelated text.
 * Larger models do better, but still drop facts: Gemma 4 E2B answered "What's Ali's number?" with
 * "Searching for Ali's contact now." and no number. On-device tool messages (contacts, notes, alarms,
 * reminders, calendar) are already full sentences, so every tier shows them as-is; only web search results
 * go to the model to summarize.
 */
export function usesDeterministicToolReplies(tier: ModelTier, toolResult?: string): boolean {
  if (tier === "lite") return true;
  const tools = (toolResult ?? "")
    .split(/\r?\n/)
    .map((line) => line.match(TOOL_LINE)?.[1])
    .filter((name): name is string => !!name);
  return tools.length > 0 && tools.every((name) => !SYNTHESIZED_TOOLS.has(name));
}
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
          if (typeof label !== "string" || !label.trim()) return "";
          // contacts.search: "Ali Khan: +92 300 1234567". A contact without a number says so.
          if (Array.isArray(record.phones)) {
            const phones = record.phones.filter((p): p is string => typeof p === "string" && p.trim() !== "");
            return `${label.trim()}: ${phones.length > 0 ? phones.join(", ") : "no phone number saved"}`;
          }
          return label.trim();
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
