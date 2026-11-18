const { withAndroidManifest } = require("expo/config-plugins");

// Some permissions make Google Play assume hardware is required. ACCESS_WIFI_STATE (added by
// expo-network and react-native-blob-util) implies android.hardware.wifi, so Play hid the app from
// devices without Wi-Fi and blocked the 0.12.0 release: "Required hardware feature declarations are
// restricting your app's availability". Wi-Fi is only used to tell Wi-Fi from mobile data before a
// download, so declaring the feature as not required keeps the app installable everywhere.
// RECORD_AUDIO implies android.hardware.microphone the same way; voice input is optional (typing
// works), so devices without a microphone shouldn't be excluded either.
const OPTIONAL_FEATURES = ["android.hardware.wifi", "android.hardware.microphone"];

function withOptionalHardware(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = manifest["uses-feature"] ?? [];
    for (const name of OPTIONAL_FEATURES) {
      const existing = features.find((f) => f.$?.["android:name"] === name);
      if (existing) {
        existing.$["android:required"] = "false";
      } else {
        features.push({ $: { "android:name": name, "android:required": "false" } });
      }
    }
    manifest["uses-feature"] = features;
    return cfg;
  });
}

module.exports = withOptionalHardware;
module.exports.OPTIONAL_FEATURES = OPTIONAL_FEATURES;
