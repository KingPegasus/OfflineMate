import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  cancelActiveDownloads,
  checkDownloadPreflight,
  DownloadCancelledError,
  type AssetToDownload,
  type DownloadProgressCallback,
} from "@/ai/model-manager";
import { createRateTracker, describeDownload, downloadFailureMessage, formatBytes } from "@/utils/download-format";

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
        // Each pass is one try; offline and failed downloads offer Try again, which loops.
        for (;;) {
          const outcome = await attempt();
          if (outcome !== "retry") return outcome;
        }
      } finally {
        busy.current = false;
        destinations.current = [];
        setState(IDLE);
      }

      async function attempt(): Promise<DownloadOutcome | "retry"> {
      try {
        const preflight = await checkDownloadPreflight(assets, options?.replacing);
        if (preflight.offline) {
          const retry = await confirm(
            "No internet connection",
            "Connect to Wi-Fi or mobile data, then try again. You only need internet for this download.",
            "Try again",
            "Not now",
          );
          return retry ? "retry" : "declined";
        }
        if (!preflight.enoughSpace) {
          const free = preflight.freeBytes === null ? "" : ` Your phone has ${formatBytes(preflight.freeBytes)} free.`;
          Alert.alert(
            "Not enough space",
            `This download needs about ${formatBytes(preflight.bytesNeeded)}, plus a little room to spare.${free} Delete some photos, videos or apps you don't need, or choose a smaller size.`,
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
        setState(IDLE);
        const { title, message } = downloadFailureMessage(raw);
        const retry = await confirm(title, message, "Try again", "Not now");
        return retry ? "retry" : "failed";
      }
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    if (destinations.current.length > 0) void cancelActiveDownloads(destinations.current);
  }, []);

  return { state, start, cancel };
}
