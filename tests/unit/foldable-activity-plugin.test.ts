import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const plugin = require("../../plugins/with-foldable-activity.js") as {
  mergeConfigChanges(current: string | undefined): string;
  REQUIRED_CONFIG_CHANGES: string[];
};
const appJson = require("../../app.json") as { expo: { orientation?: string; plugins: unknown[] } };

describe("foldable activity config", () => {
  it("keeps Expo's config changes and adds the ones folding needs", () => {
    expect(plugin.mergeConfigChanges("keyboard|keyboardHidden|orientation|screenSize|uiMode")).toBe(
      "keyboard|keyboardHidden|orientation|screenSize|uiMode|smallestScreenSize|screenLayout",
    );
    expect(plugin.mergeConfigChanges(undefined).split("|").sort()).toEqual(
      [...plugin.REQUIRED_CONFIG_CHANGES].sort(),
    );
  });

  it("doesn't duplicate values already present", () => {
    const full = "orientation|screenSize|smallestScreenSize|screenLayout|uiMode";
    expect(plugin.mergeConfigChanges(full)).toBe(full);
  });

  it("is registered in app.json, with no orientation lock", () => {
    expect(appJson.expo.plugins).toContain("./plugins/with-foldable-activity");
    expect(appJson.expo.orientation ?? "default").toBe("default");
  });
});
