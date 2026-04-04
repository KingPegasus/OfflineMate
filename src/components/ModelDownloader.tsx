import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { downloadTierPrimaryModel } from "@/ai/model-manager";
import type { ModelTier } from "@/types/assistant";

function hintForDownloadError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("resolve") || m.includes("hostname") || m.includes("enotfound")) {
    return "Your device could not reach the download server. Hugging Face often redirects large files to a CDN (e.g. xethub). Try Wi‑Fi instead of mobile data, turn off Private DNS in Android (Settings → Network → Private DNS → Off), or try again later.";
  }
  if (m.includes("network") || m.includes("internet") || m.includes("connection")) {
    return "Check your internet connection and try again.";
  }
  return "If this keeps happening, try another network or disable Private DNS in system settings.";
}

interface Props {
  tier: ModelTier;
}

export function ModelDownloader({ tier }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [currentAsset, setCurrentAsset] = useState<string>("");

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Model download: {status}</Text>
      {currentAsset ? <Text style={styles.progress}>Asset: {currentAsset}</Text> : null}
      <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      <Text
        style={styles.action}
        onPress={async () => {
          console.log("[OfflineMate] Onboarding: download button pressed", { tier });
          setStatus("Downloading");
          try {
            await downloadTierPrimaryModel(tier, (value, label) => {
              setProgress(value);
              if (label) setCurrentAsset(label);
            });
            setStatus("Done");
            console.log("[OfflineMate] Onboarding: tier model download finished", { tier });
          } catch (e) {
            console.error("[OfflineMate] Onboarding: tier model download failed", { tier }, e);
            setStatus("Failed");
            const raw = e instanceof Error ? e.message : String(e);
            Alert.alert("Download failed", `${hintForDownloadError(raw)}\n\n${raw}`);
          }
        }}
      >
        Download
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#111827", borderRadius: 10, padding: 12, gap: 6 },
  label: { color: "#e5e7eb" },
  progress: { color: "#9ca3af" },
  action: { color: "#60a5fa", fontWeight: "700" },
});

