const { withAndroidManifest } = require("expo/config-plugins");

// Foldables: folding/unfolding changes the screen size, smallest width and layout. If the main
// activity doesn't declare it handles those changes, Android recreates it and the React tree
// remounts, dropping typed text, an attached photo and in-progress screens. Expo's template
// already lists them today; this plugin pins them so a template change can't drop them, and
// marks the activity resizable (multi-window, freeform and foldable displays).
// No android:screenOrientation lock: Android 16 ignores it on large screens and Play flags it;
// phones are locked to portrait at runtime instead (usePhonePortraitLock).
const REQUIRED_CONFIG_CHANGES = ["orientation", "screenSize", "smallestScreenSize", "screenLayout"];

function withFoldableActivity(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    const activity = app?.activity?.find((a) => a.$["android:name"] === ".MainActivity");
    if (!activity) {
      throw new Error("with-foldable-activity: .MainActivity not found in AndroidManifest.xml");
    }
    activity.$["android:configChanges"] = mergeConfigChanges(activity.$["android:configChanges"]);
    activity.$["android:resizeableActivity"] = "true";
    return cfg;
  });
}

function mergeConfigChanges(current) {
  const values = (current ?? "").split("|").filter(Boolean);
  for (const v of REQUIRED_CONFIG_CHANGES) if (!values.includes(v)) values.push(v);
  return values.join("|");
}

module.exports = withFoldableActivity;
module.exports.mergeConfigChanges = mergeConfigChanges;
module.exports.REQUIRED_CONFIG_CHANGES = REQUIRED_CONFIG_CHANGES;
