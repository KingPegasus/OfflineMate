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
  /** expanded, or a wide window in book posture: show list and detail side by side. */
  isTwoPane: boolean;
  /** A half-opened fold to keep content off, or null when the screen is flat. */
  hinge: Hinge | null;
};

export function getBreakpoint(width: number, hinge: Hinge | null = null): Breakpoint {
  const windowClass = getWindowClass(width);
  const isWide = windowClass !== "compact";
  return {
    windowClass,
    isWide,
    // Book posture splits the screen in two anyway, so use both halves as panes.
    isTwoPane: windowClass === "expanded" || (isWide && hinge?.posture === "book"),
    hinge,
  };
}

/** A fold or hinge in the app window, as reported by Jetpack WindowManager (dp, window space). */
export type FoldFeature = {
  state: "flat" | "halfOpened";
  orientation: "vertical" | "horizontal";
  /** True when the fold splits the window into two areas: half-opened, or a physical hinge gap. */
  isSeparating: boolean;
  occludesContent: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * A fold content should stay off. `start`/`end` are window coordinates along the split axis
 * (x for a vertical fold, y for a horizontal one); they're equal for a fold with no gap.
 * - book:     vertical fold, device held like a book. Two side-by-side panes.
 * - tabletop: horizontal fold, bottom half resting on a table. Content on top, controls below.
 */
export type Hinge = {
  posture: "book" | "tabletop";
  start: number;
  end: number;
};

export type Rect = { x: number; y: number; width: number; height: number };

/** The first separating fold that crosses the window, or null (flat, folded shut, or no fold). */
export function getSeparatingHinge(
  features: readonly FoldFeature[],
  windowWidth: number,
  windowHeight: number,
): Hinge | null {
  for (const f of features) {
    if (!f.isSeparating) continue;
    const vertical = f.orientation === "vertical";
    const start = vertical ? f.x : f.y;
    const end = start + (vertical ? f.width : f.height);
    const size = vertical ? windowWidth : windowHeight;
    if (start <= 0 || end >= size) continue;
    return { posture: vertical ? "book" : "tabletop", start, end };
  }
  return null;
}

/** Smallest pane worth showing on either side of a hinge. */
export const MIN_HINGE_PANE = 240;

/**
 * How a container splits around a hinge: the leading pane (left, or top) ends at the hinge,
 * then `gap` (the hinge width) is skipped, and the trailing pane fills the rest.
 * Null when the hinge doesn't cross the container or would leave a pane under `minPane`.
 */
export type HingeSplit = { leading: number; gap: number; trailing: number };

export function splitAroundHinge(
  hinge: Hinge | null,
  container: Rect | null,
  minPane = MIN_HINGE_PANE,
): HingeSplit | null {
  if (!hinge || !container) return null;
  const vertical = hinge.posture === "book";
  const origin = vertical ? container.x : container.y;
  const size = vertical ? container.width : container.height;
  const leading = hinge.start - origin;
  const gap = hinge.end - hinge.start;
  const trailing = origin + size - hinge.end;
  if (leading < minPane || trailing < minPane) return null;
  return { leading, gap, trailing };
}
