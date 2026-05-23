import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { downloadTierPrimaryModel, getTierAssetReadiness } from "@/ai/model-manager";
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
  onReadinessChange?: (ready: boolean) => void;
}

export function ModelDownloader({ tier, onReadinessChange }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [requiredAssets, setRequiredAssets] = useState(0);
  const [missingAssets, setMissingAssets] = useState(0);
  const [currentAsset, setCurrentAsset] = useState<string>("");

  const applyReadiness = useCallback(
    (readiness: Awaited<ReturnType<typeof getTierAssetReadiness>>) => {
      setRequiredAssets(readiness.missingAssets.length + readiness.presentAssets.length);
      setMissingAssets(readiness.missingAssets.length);
      onReadinessChange?.(readiness.ready);
      if (readiness.ready) {
        setProgress(1);
        setStatus("Ready");
      } else if (readiness.presentAssets.length > 0) {
        setStatus("Partial");
      } else {
        setStatus("Not downloaded");
      }
    },
    [onReadinessChange],
  );

  const refreshReadiness = useCallback(async () => {
    setIsChecking(true);
    try {
      const readiness = await getTierAssetReadiness(tier);
      applyReadiness(readiness);
    } catch {
      setStatus("Unknown");
      onReadinessChange?.(false);
    } finally {
      setIsChecking(false);
    }
  }, [applyReadiness, onReadinessChange, tier]);

  useEffect(() => {
    let cancelled = false;

    getTierAssetReadiness(tier)
      .then((readiness) => {
        if (cancelled) return;
        applyReadiness(readiness);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("Unknown");
        onReadinessChange?.(false);
      })
      .finally(() => {
        if (cancelled) return;
        setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyReadiness, onReadinessChange, tier]);

  const isReady = missingAssets === 0 && requiredAssets > 0;
  const downloadedAssets = Math.max(0, requiredAssets - missingAssets);
  const actionLabel = isReady ? "Re-check downloads" : isDownloading ? "Downloading..." : "Download required assets";

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Model download: {status}</Text>
      <Text style={styles.progress}>
        Assets ready: {downloadedAssets}/{requiredAssets || "?"}
      </Text>
      {currentAsset ? <Text style={styles.progress}>Asset: {currentAsset}</Text> : null}
      <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      <Text
        style={[styles.action, (isChecking || isDownloading) && styles.actionDisabled]}
        onPress={async () => {
          if (isChecking || isDownloading) return;
          if (isReady) {
            await refreshReadiness();
            return;
          }
          console.log("[OfflineMate] Onboarding: download button pressed", { tier });
          setIsDownloading(true);
          setStatus("Downloading");
          try {
            await downloadTierPrimaryModel(tier, (value, label) => {
              setProgress(value);
              if (label) setCurrentAsset(label);
            });
            await refreshReadiness();
            console.log("[OfflineMate] Onboarding: tier model download finished", { tier });
          } catch (e) {
            console.error("[OfflineMate] Onboarding: tier model download failed", { tier }, e);
            setStatus("Failed");
            const raw = e instanceof Error ? e.message : String(e);
            Alert.alert("Download failed", `${hintForDownloadError(raw)}\n\n${raw}`);
          } finally {
            setIsDownloading(false);
          }
        }}
      >
        {actionLabel}
      </Text>
      <Text style={styles.help}>
        Chat is ready when all required assets are downloaded. You can continue onboarding now and return later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#111827", borderRadius: 10, padding: 12, gap: 6 },
  label: { color: "#e5e7eb" },
  progress: { color: "#9ca3af" },
  action: { color: "#60a5fa", fontWeight: "700" },
  actionDisabled: { color: "#6b7280" },
  help: { color: "#6b7280", fontSize: 12, lineHeight: 17 },
});

