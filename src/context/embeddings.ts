export function generateEmbedding(text: string): number[] {
  // Placeholder deterministic embedding until ExecuTorch embedding model is wired.
  const seed = Array.from(text).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return Array.from({ length: 16 }, (_, i) => ((seed + i * 17) % 1000) / 1000);
}

