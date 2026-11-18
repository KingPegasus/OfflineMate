import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  cancelActiveDownloads,
  checkDownloadPreflight,
  DownloadCancelledError,
  type AssetToDownload,
  type DownloadProgressCallback,
} from "@/ai/model-manager";
import { createRateTracker, describeDownload, formatBytes } from "@/utils/download-format";

/** Above this, a download on mobile data asks first (model files are hundreds of MB to several GB). */
const MOBILE_DATA_CONFIRM_BYTES = 50 * 1024 * 1024;

export type DownloadOutcome = "done" | "cancelled" | "declined" | "failed";

export interface ModelDownloadState {
  active: boolean;
  progress: number;
  /** Which file is downloading: "Chat model", "Voice model"… */
  label: string;
  /** "1.2 GB of 2.3 GB · 4.1 MB/s · about 4 min left" */
  detail: string;
}

const IDLE: ModelDownloadState = { active: false, progress: 0, label: "", detail: "" };

function confirm(title: string, message: string, okLabel: string, cancelLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: okLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function downloadFailureHint(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("resolve") || m.includes("hostname") || m.includes("enotfound")) {
    return "Your phone couldn't reach the download server. Try Wi-Fi instead of mobile data, or turn off Private DNS (Settings → Network → Private DNS → Off), then try again.";
  }
  if (m.includes("space") || m.includes("enospc") || m.includes("storage")) {
    return "Your phone ran out of storage. Free up some space, then try again.";
  }
  return "Check your connection and try again. Downloads start over if they're interrupted, so Wi-Fi works best.";
}

/**
 * One model download at a time, with the checks a multi-GB download needs: offline, free storage,
 * and a confirmation on mobile data. Progress is reported in bytes with speed and time left.
 */
export function useModelDownload() {
  const [state, setState] = useState<ModelDownloadState>(IDLE);
  const busy = useRef(false);
  /** Files this screen is downloading, so Cancel stops only them. */
  const destinations = useRef<string[]>([]);

  const start = useCallback(
    async (
      assets: AssetToDownload[],
      run: (onProgress: DownloadProgressCallback) => Promise<unknown>,
      /** Files a re-download deletes and fetches again; they count toward the size checks. */
      options?: { replacing?: AssetToDownload[] },
    ): Promise<DownloadOutcome> => {
      if (busy.current) return "declined";
      busy.current = true;
      destinations.current = assets.map((a) => a.destination);
      try {
        const preflight = await checkDownloadPreflight(assets, options?.replacing);
        if (preflight.offline) {
          Alert.alert("You're offline", "Connect to Wi-Fi or mobile data to download the model. After that, OfflineMate works without internet.");
          return "declined";
        }
        if (!preflight.enoughSpace) {
          const free = preflight.freeBytes === null ? "" : ` Your phone has ${formatBytes(preflight.freeBytes)} free.`;
          Alert.alert(
            "Not enough storage",
            `This download needs about ${formatBytes(preflight.bytesNeeded)}, plus some room to spare.${free} Free up space or pick a smaller model.`,
          );
          return "declined";
        }
        if (preflight.onMobileData && preflight.bytesNeeded > MOBILE_DATA_CONFIRM_BYTES) {
          const ok = await confirm(
            "Download on mobile data?",
            `You're not on Wi-Fi. This download is about ${formatBytes(preflight.bytesNeeded)}, which may use your data allowance.`,
            "Download anyway",
            "Wait for Wi-Fi",
          );
          if (!ok) return "declined";
        }

        const rate = createRateTracker();
        setState({ active: true, progress: 0, label: "", detail: "Starting…" });
        await run((progress, label, detail) => {
          const bytesPerSecond = detail ? rate.update(detail.bytesWritten, Date.now()) : 0;
          setState({
            active: true,
            progress,
            label: label ?? "",
            detail: detail && detail.bytesTotal > 0 ? describeDownload(detail.bytesWritten, detail.bytesTotal, bytesPerSecond) : "",
          });
        });
        return "done";
      } catch (err) {
        if (err instanceof DownloadCancelledError) return "cancelled";
        const raw = err instanceof Error ? err.message : String(err);
        console.warn("[OfflineMate] Model download failed:", raw);
        Alert.alert("Download didn't finish", downloadFailureHint(raw));
        return "failed";
      } finally {
        busy.current = false;
        destinations.current = [];
        setState(IDLE);
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    if (destinations.current.length > 0) void cancelActiveDownloads(destinations.current);
  }, []);

  return { state, start, cancel };
}
