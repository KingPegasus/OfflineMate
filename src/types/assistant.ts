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
  /** Standardized error code for telemetry and UX handling. */
  errorCode?: "PERMISSION_DENIED" | "NETWORK_UNAVAILABLE" | "PARSE_FAILURE" | "TIMEOUT" | "UNKNOWN";
  /** Whether the caller may safely retry. */
  retryable?: boolean;
}

