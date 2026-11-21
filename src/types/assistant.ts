export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: Role;
  content: string;
  createdAt: number;
  thinking?: string[];
  /** `file://` URI of a gallery image copied into app storage (user messages only). */
  imageUri?: string;
  /** Generation speed for assistant replies; null when not measured (shown as "n/a"). */
  tokensPerSecond?: number | null;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export type ModelTier = "lite" | "standard" | "full";

/**
 * Why chat can't answer until something is set up: the model isn't downloaded (or its download was
 * incomplete), it's downloaded but couldn't start, or a photo was sent to a model that can't see.
 */
export type ModelSetupKind = "not-downloaded" | "load-failed" | "no-vision";

export interface ToolResult {
  ok: boolean;
  message: string;
  payload?: Record<string, unknown>;
  /** Standardized error code for telemetry and UX handling. */
  errorCode?: "PERMISSION_DENIED" | "NETWORK_UNAVAILABLE" | "PARSE_FAILURE" | "TIMEOUT" | "UNKNOWN";
  /** Whether the caller may safely retry. */
  retryable?: boolean;
}

