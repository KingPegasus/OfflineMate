import fs from "node:fs";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withOptionalHardware = require("../../plugins/with-optional-hardware");

type Feature = { $: Record<string, string> };
type Manifest = { manifest: { "uses-feature"?: Feature[] } };

async function runManifestMod(manifest: Manifest): Promise<Manifest> {
  const config = withOptionalHardware({ name: "OfflineMate", slug: "offlinemate" });
  const mod = config.mods.android.manifest;
  const result = await mod({ ...config, modResults: manifest, modRequest: { platform: "android" } });
  return result.modResults;
}

// Play blocked 0.12.0: ACCESS_WIFI_STATE (expo-network, react-native-blob-util) implies a required
// android.hardware.wifi unless the manifest says otherwise.
describe("optional hardware config plugin", () => {
  it("declares Wi-Fi and the microphone as not required", async () => {
    const out = await runManifestMod({ manifest: {} });
    expect(out.manifest["uses-feature"]).toEqual([
      { $: { "android:name": "android.hardware.wifi", "android:required": "false" } },
      { $: { "android:name": "android.hardware.microphone", "android:required": "false" } },
    ]);
  });

  it("turns an existing required Wi-Fi declaration into an optional one, without duplicating it", async () => {
    const out = await runManifestMod({
      manifest: {
        "uses-feature": [
          { $: { "android:name": "android.hardware.wifi", "android:required": "true" } },
          { $: { "android:name": "android.hardware.touchscreen", "android:required": "false" } },
        ],
      },
    });
    const features = out.manifest["uses-feature"]!;
    expect(features.filter((f) => f.$["android:name"] === "android.hardware.wifi")).toEqual([
      { $: { "android:name": "android.hardware.wifi", "android:required": "false" } },
    ]);
    expect(features).toHaveLength(3);
  });

  it("is registered in app.json", () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "app.json"), "utf8"));
    expect(appJson.expo.plugins).toContain("./plugins/with-optional-hardware");
  });
});
