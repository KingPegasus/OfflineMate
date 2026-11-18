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

  const status =
    readiness === "checking"
      ? "Checking what's on your phone…"
      : readiness === "ready"
        ? `${model.family} ${model.size} is downloaded and ready.`
        : readiness === "partial"
          ? `Partly downloaded. About ${formatBytes(bytesLeft)} left.`
          : readiness === "missing"
            ? `Not downloaded yet. About ${formatBytes(bytesLeft)} (chat, voice input and notes search).`
            : "Couldn't check the files on your phone.";

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{status}</Text>
      {readiness !== "ready" && readiness !== "checking" ? (
        <TouchableOpacity style={styles.button} onPress={() => void startDownload()} accessibilityRole="button">
          <Text style={styles.buttonText}>
            {readiness === "partial" ? "Finish download" : `Download ${formatBytes(bytesLeft)}`}
          </Text>
        </TouchableOpacity>
      ) : null}
      {readiness !== "ready" ? (
        <Text style={styles.help}>
          Wi-Fi recommended. You can also continue now and download later from Settings.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#111827", borderRadius: 10, padding: 12, gap: 8 },
  label: { color: "#e5e7eb" },
  button: { alignSelf: "flex-start", backgroundColor: "#1d4ed8", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  buttonText: { color: "#e5e7eb", fontWeight: "700" },
  help: { color: "#6b7280", fontSize: 12, lineHeight: 17 },
});
