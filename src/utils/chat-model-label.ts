export interface ChatModelLabelInput {
  /** Plain size name: "Balanced". */
  tierLabel: string;
  /** "Gemma 4 E2B"; shown with technical details. */
  modelName: string;
  /** "gemma4-e2b"; shown with technical details. */
  modelId: string;
  canSeePhotos: boolean;
  showTechnicalDetails: boolean;
}

/** "Assistant: Balanced · can look at photos"; adds the model name and id when technical details are on. */
export function chatModelBadgeText({
  tierLabel,
  modelName,
  modelId,
  canSeePhotos,
  showTechnicalDetails,
}: ChatModelLabelInput): string {
  const parts = [`Assistant: ${tierLabel}`];
  if (canSeePhotos) parts.push("can look at photos");
  if (showTechnicalDetails) parts.push(`${modelName} (${modelId})`);
  return parts.join(" · ");
}
