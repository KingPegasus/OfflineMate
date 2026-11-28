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
  /** Buttons under an assistant reply, e.g. "Join Google Meet" for a calendar event's meeting link. */
  links?: MessageLink[];
}

/** A button under a chat reply that opens a link (only meeting links on known services, see meeting-link.ts). */
export interface MessageLink {
  label: string;
  url: string;
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
  /** Buttons for the reply (kept out of the model's prompt), e.g. meeting links from the calendar. */
  links?: MessageLink[];
}

