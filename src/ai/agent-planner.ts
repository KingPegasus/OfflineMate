export interface PlannedStep {
  id: string;
  description: string;
  toolHint?: string;
}

export function planStepsFromPrompt(prompt: string): PlannedStep[] {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("schedule") || lowered.includes("meeting")) {
    return [
      { id: "1", description: "Read calendar events", toolHint: "calendar.getEvents" },
      { id: "2", description: "Summarize and propose next actions" },
    ];
  }
  if (lowered.includes("contact") || lowered.includes("call")) {
    return [
      { id: "1", description: "Search contacts", toolHint: "contacts.search" },
      { id: "2", description: "Draft assistant response" },
    ];
  }
  return [{ id: "1", description: "Answer directly using available context" }];
}

