const { withAppBuildGradle } = require("expo/config-plugins");

// Play Console shows native crashes (ExecuTorch, whisper, Hermes) as bare addresses unless the
// upload carries native debug symbols. SYMBOL_TABLE puts function names into the AAB's
// BUNDLE-METADATA, which Play reads automatically, and writes
// app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip for APK builds.
// It only affects what is uploaded to Play: the libraries installed on phones stay stripped.
// Libraries that ship already stripped (some prebuilt .so files) have no symbols to extract.
const LEVEL = "SYMBOL_TABLE";
const MARKER = "debugSymbolLevel";

module.exports = function withNativeDebugSymbols(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    const anchor = /(buildTypes\s*\{[\s\S]*?\n(\s*)release\s*\{)/;
    const match = gradle.match(anchor);
    if (!match) {
      throw new Error("with-native-debug-symbols: buildTypes.release block not found in app/build.gradle");
    }
    const indent = `${match[2]}    `;
    cfg.modResults.contents = gradle.replace(
      anchor,
      (whole) => `${whole}\n${indent}ndk {\n${indent}    ${MARKER} '${LEVEL}'\n${indent}}`,
    );
    return cfg;
  });
};
