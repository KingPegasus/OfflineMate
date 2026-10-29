const { withAppBuildGradle } = require("expo/config-plugins");

// Windows builds fail with "Filename longer than 260 characters" once autolinked codegen
// (e.g. react-native-gesture-handler 3) nests source paths inside the app's .cxx tree.
// The Android NDK's CMake 3.22 + Ninja cannot use long paths, and CMAKE_OBJECT_PATH_MAX
// defaults to 1000 for Android targets, so CMake never shortens object names on its own.
// Capping it makes CMake replace over-long object directories with a hash. CMake only uses the
// hashed name when it fits under the cap with some slack, so 240 still failed for arm64-v8a
// (a longer ABI directory name than x86_64); 250 leaves room while staying under 260.
const OBJECT_PATH_MAX = 250;
const MARKER = "-DCMAKE_OBJECT_PATH_MAX=";

module.exports = function withCmakeObjectPathMax(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    const anchor = /defaultConfig\s*\{/;
    if (!anchor.test(gradle)) {
      throw new Error("with-cmake-object-path-max: defaultConfig block not found in app/build.gradle");
    }
    cfg.modResults.contents = gradle.replace(
      anchor,
      (match) =>
        `${match}\n        externalNativeBuild {\n            cmake {\n                arguments "${MARKER}${OBJECT_PATH_MAX}"\n            }\n        }`,
    );
    return cfg;
  });
};
