import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  downloadTierPrimaryModel,
  getMissingDownloadBytes,
  getTierAssetReadiness,
  getTierAssets,
} from "@/ai/model-manager";
import { resolveModelForTier } from "@/ai/model-registry";
import { DownloadProgressCard } from "@/components/DownloadProgressCard";
import { useModelDownload } from "@/hooks/useModelDownload";
import { formatBytes } from "@/utils/download-format";
import type { ModelTier } from "@/types/assistant";

interface Props {
  tier: ModelTier;
  /** Chat model chosen for the tier; null/undefined means the tier default. */
  modelId?: string | null;
  onReadinessChange?: (ready: boolean) => void;
  /** Lets the parent lock tier/model selection while files download. */
  onDownloadingChange?: (downloading: boolean) => void;
}

type Readiness = "checking" | "ready" | "partial" | "missing" | "unknown";

type LoadedReadiness = { readiness: Exclude<Readiness, "checking">; bytesLeft: number };

/** What's on the phone for this tier and model, and how much is left to download. */
async function loadReadiness(tier: ModelTier, modelId: string | null): Promise<LoadedReadiness> {
  try {
    const result = await getTierAssetReadiness(tier, modelId);
    const bytesLeft = await getMissingDownloadBytes(getTierAssets(tier, modelId));
    return { readiness: result.ready ? "ready" : result.presentAssets.length > 0 ? "partial" : "missing", bytesLeft };
  } catch {
    return { readiness: "unknown", bytesLeft: 0 };
  }
}

export function ModelDownloader({ tier, modelId = null, onReadinessChange, onDownloadingChange }: Props) {
  const [readiness, setReadiness] = useState<Readiness>("checking");
  const [bytesLeft, setBytesLeft] = useState(0);
  const download = useModelDownload();
  const model = resolveModelForTier(tier, modelId);

  const apply = useCallback(
    (loaded: LoadedReadiness) => {
      setBytesLeft(loaded.bytesLeft);
      setReadiness(loaded.readiness);
      onReadinessChange?.(loaded.readiness === "ready");
    },
    [onReadinessChange],
  );

  const refresh = useCallback(async () => {
    setReadiness("checking");
    apply(await loadReadiness(tier, modelId));
  }, [apply, modelId, tier]);

  useEffect(() => {
    let cancelled = false;
    void loadReadiness(tier, modelId).then((loaded) => {
      if (!cancelled) apply(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, modelId, tier]);

  const startDownload = async () => {
    onDownloadingChange?.(true);
    try {
      await download.start(getTierAssets(tier, modelId), (onProgress) => downloadTierPrimaryModel(tier, onProgress, modelId));
    } finally {
      onDownloadingChange?.(false);
      await refresh();
    }
  };

  if (download.state.active) {
    return <DownloadProgressCard state={download.state} title={`${model.family} ${model.size}`} onCancel={download.cancel} />;
  }

  // "missing" needs no status line: the button says what it downloads.
  const status =
    readiness === "checking"
      ? "Checking what's on your phone…"
      : readiness === "ready"
        ? "Downloaded and ready to use."
        : readiness === "partial"
          ? `Partly downloaded. About ${formatBytes(bytesLeft)} left.`
          : readiness === "unknown"
            ? "Couldn't check the files on your phone."
            : null;

  return (
    <View style={styles.box}>
      {status ? <Text style={[styles.label, readiness === "ready" && styles.ready]}>{status}</Text> : null}
      {readiness !== "ready" && readiness !== "checking" ? (
        <TouchableOpacity style={styles.button} onPress={() => void startDownload()} accessibilityRole="button">
          <Text style={styles.buttonText}>
            {readiness === "partial" ? "Finish download" : `Download ${formatBytes(bytesLeft)}`}
          </Text>
        </TouchableOpacity>
      ) : null}
      {readiness !== "ready" ? (
        <Text style={styles.help}>Downloads once (Wi-Fi is best). After that it works without internet.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  label: { color: "#e5e7eb" },
  ready: { color: "#86efac", fontWeight: "600" },
  button: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#f9fafb", fontWeight: "700", fontSize: 16 },
  help: { color: "#9ca3af", fontSize: 12, lineHeight: 17 },
});
