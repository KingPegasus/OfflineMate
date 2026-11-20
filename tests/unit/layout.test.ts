import { describe, expect, it } from "vitest";
import {
  getBreakpoint,
  getSeparatingHinge,
  getWindowClass,
  shouldLockPortrait,
  splitAroundHinge,
  type FoldFeature,
} from "@/utils/layout";

describe("window size classes", () => {
  it("keeps phones compact, including landscape phones", () => {
    expect(getWindowClass(360)).toBe("compact");
    expect(getWindowClass(411)).toBe("compact");
    expect(getWindowClass(599)).toBe("compact");
    expect(getBreakpoint(411)).toEqual({ windowClass: "compact", isWide: false, isTwoPane: false, hinge: null });
  });

  it("treats tablets in portrait as medium (single pane, capped width)", () => {
    expect(getWindowClass(600)).toBe("medium");
    expect(getWindowClass(800)).toBe("medium");
    expect(getBreakpoint(800)).toEqual({ windowClass: "medium", isWide: true, isTwoPane: false, hinge: null });
  });

  it("treats tablets in landscape as expanded (two panes)", () => {
    expect(getWindowClass(840)).toBe("expanded");
    expect(getWindowClass(1280)).toBe("expanded");
    expect(getBreakpoint(1280)).toEqual({ windowClass: "expanded", isWide: true, isTwoPane: true, hinge: null });
  });
});

describe("portrait lock", () => {
  it("locks phones to portrait in either orientation", () => {
    expect(shouldLockPortrait(411, 914)).toBe(true);
    expect(shouldLockPortrait(914, 411)).toBe(true);
  });

  it("lets tablets and unfolded foldables rotate", () => {
    expect(shouldLockPortrait(800, 1280)).toBe(false);
    expect(shouldLockPortrait(1280, 800)).toBe(false);
    expect(shouldLockPortrait(960, 600)).toBe(false);
  });
});

// Pixel Fold-like inner display: 841 x 701 dp in landscape, fold down the middle.
const fold = (overrides: Partial<FoldFeature> = {}): FoldFeature => ({
  state: "halfOpened",
  orientation: "vertical",
  isSeparating: true,
  occludesContent: false,
  x: 420,
  y: 0,
  width: 0,
  height: 701,
  ...overrides,
});

describe("foldable hinge", () => {
  it("ignores a flat fold, so an unfolded screen is one continuous surface", () => {
    expect(getSeparatingHinge([fold({ state: "flat", isSeparating: false })], 841, 701)).toBeNull();
    expect(getSeparatingHinge([], 841, 701)).toBeNull();
  });

  it("reads a half-opened vertical fold as book posture", () => {
    expect(getSeparatingHinge([fold()], 841, 701)).toEqual({ posture: "book", start: 420, end: 420 });
  });

  it("reads a half-opened horizontal fold as tabletop posture, keeping a hinge gap", () => {
    const f = fold({ orientation: "horizontal", x: 0, y: 410, width: 701, height: 20 });
    expect(getSeparatingHinge([f], 701, 841)).toEqual({ posture: "tabletop", start: 410, end: 430 });
  });

  it("ignores folds on the window edge (split screen beside the fold)", () => {
    expect(getSeparatingHinge([fold({ x: 0 })], 420, 701)).toBeNull();
    expect(getSeparatingHinge([fold({ x: 420 })], 420, 701)).toBeNull();
  });

  it("uses two panes in book posture even when the window is only medium width", () => {
    const hinge = { posture: "book" as const, start: 395, end: 395 };
    expect(getBreakpoint(790, hinge).isTwoPane).toBe(true);
    expect(getBreakpoint(790).isTwoPane).toBe(false);
    expect(getBreakpoint(500, hinge).isTwoPane).toBe(false);
    const tabletop = { posture: "tabletop" as const, start: 395, end: 395 };
    expect(getBreakpoint(790, tabletop).isTwoPane).toBe(false);
  });

  it("splits a container at the fold, relative to the container's own position", () => {
    const hinge = { posture: "book" as const, start: 420, end: 420 };
    // Pane row starts right of a 96 dp navigation rail.
    expect(splitAroundHinge(hinge, { x: 96, y: 0, width: 745, height: 650 })).toEqual({
      leading: 324,
      gap: 0,
      trailing: 421,
    });
  });

  it("skips the hinge gap and splits vertically in tabletop posture", () => {
    const hinge = { posture: "tabletop" as const, start: 410, end: 430 };
    expect(splitAroundHinge(hinge, { x: 0, y: 60, width: 701, height: 781 }, 120)).toEqual({
      leading: 350,
      gap: 20,
      trailing: 411,
    });
  });

  it("gives up when a pane would be too small or there is nothing to split", () => {
    const hinge = { posture: "book" as const, start: 420, end: 420 };
    expect(splitAroundHinge(hinge, { x: 300, y: 0, width: 541, height: 650 })).toBeNull();
    expect(splitAroundHinge(null, { x: 0, y: 0, width: 841, height: 650 })).toBeNull();
    expect(splitAroundHinge(hinge, null)).toBeNull();
  });
});
