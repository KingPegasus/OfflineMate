import { describe, expect, it } from "vitest";
import { getBreakpoint, getWindowClass, shouldLockPortrait } from "@/utils/layout";

describe("window size classes", () => {
  it("keeps phones compact, including landscape phones", () => {
    expect(getWindowClass(360)).toBe("compact");
    expect(getWindowClass(411)).toBe("compact");
    expect(getWindowClass(599)).toBe("compact");
    expect(getBreakpoint(411)).toEqual({ windowClass: "compact", isWide: false, isTwoPane: false });
  });

  it("treats tablets in portrait as medium (single pane, capped width)", () => {
    expect(getWindowClass(600)).toBe("medium");
    expect(getWindowClass(800)).toBe("medium");
    expect(getBreakpoint(800)).toEqual({ windowClass: "medium", isWide: true, isTwoPane: false });
  });

  it("treats tablets in landscape as expanded (two panes)", () => {
    expect(getWindowClass(840)).toBe("expanded");
    expect(getWindowClass(1280)).toBe("expanded");
    expect(getBreakpoint(1280)).toEqual({ windowClass: "expanded", isWide: true, isTwoPane: true });
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
