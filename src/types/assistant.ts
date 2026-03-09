export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  thinking?: string[];
}

export type ModelTier = "lite" | "standard" | "full";

export interface ToolResult {
  ok: boolean;
  message: string;
  payload?: Record<string, unknown>;
}

