export function approximateTokenCount(text: string) {
  // Lightweight heuristic for prompt budgeting.
  return Math.ceil(text.length / 4);
}

