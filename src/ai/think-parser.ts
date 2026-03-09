export interface ParsedThinkContent {
  thinking: string;
  response: string;
  hasThinkTag: boolean;
  isClosed: boolean;
}

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

export function parseThinkTaggedContent(raw: string): ParsedThinkContent {
  const openIndex = raw.indexOf(THINK_OPEN);
  if (openIndex === -1) {
    return {
      thinking: "",
      response: raw,
      hasThinkTag: false,
      isClosed: false,
    };
  }

  const thinkingStart = openIndex + THINK_OPEN.length;
  const closeIndex = raw.indexOf(THINK_CLOSE, thinkingStart);
  if (closeIndex === -1) {
    return {
      thinking: raw.slice(thinkingStart),
      response: raw.slice(0, openIndex),
      hasThinkTag: true,
      isClosed: false,
    };
  }

  const beforeThink = raw.slice(0, openIndex);
  const afterThink = raw.slice(closeIndex + THINK_CLOSE.length);
  return {
    thinking: raw.slice(thinkingStart, closeIndex),
    response: `${beforeThink}${afterThink}`,
    hasThinkTag: true,
    isClosed: true,
  };
}

export function toThinkingLines(thinking: string): string[] {
  return thinking
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

