const { withAppBuildGradle } = require("expo/config-plugins");

// Play Console shows native crashes (ExecuTorch, whisper, Hermes) as bare addresses unless the
// upload carries native debug symbols. SYMBOL_TABLE puts function names into the AAB's
// BUNDLE-METADATA, which Play reads automatically, and writes
// app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip for APK builds.
// It only affects what is uploaded to Play: the libraries installed on phones stay stripped.
// Libraries that ship already stripped (some prebuilt .so files) have no symbols to extract.
const LEVEL = "SYMBOL_TABLE";
const MARKER = "debugSymbolLevel";
// buildTypes { ... release {  plus the release block's text up to its first nested "}" (our ndk
// block goes at its top). The indent group takes spaces and tabs only, never blank lines.
const RELEASE_BLOCK = /(buildTypes\s*\{[\s\S]*?\n([ \t]*)release\s*\{)([^}]*)/;

module.exports = function withNativeDebugSymbols(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    const match = gradle.match(RELEASE_BLOCK);
    if (!match) {
      throw new Error("with-native-debug-symbols: buildTypes.release block not found in app/build.gradle");
    }
    // Skip only when release itself already sets it; debugSymbolLevel in another block doesn't count.
    if (match[3].includes(MARKER)) return cfg;
    const indent = `${match[2]}    `;
    cfg.modResults.contents = gradle.replace(
      RELEASE_BLOCK,
      (_whole, head, _releaseIndent, rest) =>
        `${head}\n${indent}ndk {\n${indent}    ${MARKER} '${LEVEL}'\n${indent}}${rest}`,
    );
    return cfg;
  });
};
