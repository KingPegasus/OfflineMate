import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { downloadTierPrimaryModel } from "@/ai/model-manager";
import type { ModelTier } from "@/types/assistant";

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
          setStatus("Downloading");
          await downloadTierPrimaryModel(tier, (value, label) => {
            setProgress(value);
            if (label) setCurrentAsset(label);
          });
          setStatus("Done");
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

