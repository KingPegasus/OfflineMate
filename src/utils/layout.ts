/**
 * Shared window-size breakpoints (Material 3 window size classes, in dp).
 * Screens read these through `useBreakpoint()` instead of comparing widths themselves.
 *
 * - compact:  < 600   phones (portrait and most landscape). Layouts here must match the phone UI.
 * - medium:   600–839 small tablets, large foldables, tablets in portrait.
 * - expanded: >= 840  tablets in landscape. Room for two panes.
 */
export type WindowClass = "compact" | "medium" | "expanded";

export const BREAKPOINT_MEDIUM = 600;
export const BREAKPOINT_EXPANDED = 840;

/** Max width of single-column reading content (settings, tools, onboarding, lists). */
export const READABLE_MAX_WIDTH = 720;
/** Max width of the chat message column and composer. */
export const CHAT_MAX_WIDTH = 760;
/** Max width of dialogs such as the model picker. */
export const DIALOG_MAX_WIDTH = 560;
/** Width of the list pane in two-pane layouts (chat list, notes list). */
export const LIST_PANE_WIDTH = 340;

/**
 * Phones (shortest screen side under 600 dp) stay in portrait; tablets and foldables rotate.
 * The lock is applied at runtime, not in the manifest, because Android 16 ignores manifest
 * orientation locks on large screens and Play flags them.
 */
export function shouldLockPortrait(screenWidth: number, screenHeight: number): boolean {
  return Math.min(screenWidth, screenHeight) < BREAKPOINT_MEDIUM;
}

export function getWindowClass(width: number): WindowClass {
  if (width >= BREAKPOINT_EXPANDED) return "expanded";
  if (width >= BREAKPOINT_MEDIUM) return "medium";
  return "compact";
}

export type Breakpoint = {
  windowClass: WindowClass;
  /** medium or expanded: use the navigation rail and capped content widths. */
  isWide: boolean;
  /** expanded: show list and detail side by side. */
  isTwoPane: boolean;
};

export function getBreakpoint(width: number): Breakpoint {
  const windowClass = getWindowClass(width);
  return {
    windowClass,
    isWide: windowClass !== "compact",
    isTwoPane: windowClass === "expanded",
  };
}
