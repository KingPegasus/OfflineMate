import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const moduleDir = path.join(process.cwd(), "modules", "openmp-env");
const packageFile = path.join(
  moduleDir,
  "android/src/main/java/com/offlinemate/openmpenv/OpenMpEnvPackage.kt",
);

/**
 * libRnExecutorch.so's OpenMP runtime aborts on ChromeOS (ARCVM) while detecting the CPU layout,
 * unless KMP_TOPOLOGY_METHOD=flat is set before the library loads. The variable is set by an Expo
 * Package's application listener, which only runs if Expo autolinking finds the Package: it scans
 * for files named *Package.kt that import expo.modules.core.interfaces.Package.
 */
describe("OpenMP environment module", () => {
  const source = fs.readFileSync(packageFile, "utf8");

  it("is an Android-only local Expo module", () => {
    const config = JSON.parse(fs.readFileSync(path.join(moduleDir, "expo-module.config.json"), "utf8"));
    expect(config.platforms).toEqual(["android"]);
  });

  it("matches what Expo autolinking looks for", () => {
    expect(path.basename(packageFile)).toMatch(/Package\.kt$/);
    expect(source).toMatch(/\bimport\s+expo\.modules\.core\.interfaces\.Package\b/);
    expect(source).toMatch(/^package com\.offlinemate\.openmpenv\b/m);
  });

  it("sets the flat OpenMP topology when the app starts", () => {
    expect(source).toContain('Os.setenv("KMP_TOPOLOGY_METHOD", "flat", false)');
    expect(source).toMatch(/override fun onCreate\(application: Application\)\s*\{\s*applyOpenMpEnv\(\)/);
  });
});
