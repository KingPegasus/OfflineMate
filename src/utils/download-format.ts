const MB = 1024 * 1024;

/**
 * "640 MB", "2.3 GB". Model sizes are listed in MB (2315 MB), and 1000 MB shows as 1 GB, the same
 * rounding the website and the Play listing use, so every screen agrees on a model's size.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / MB;
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(mb))} MB`;
}

export function formatRate(bytesPerSecond: number): string {
  if (bytesPerSecond >= MB) return `${(bytesPerSecond / MB).toFixed(1)} MB/s`;
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

export function formatTimeLeft(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return "less than a minute left";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `about ${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `about ${hours} h ${rest} min left` : `about ${hours} h left`;
}

/**
 * Smoothed download speed. Samples closer than a second apart are ignored so the rate and the
 * time left don't jump with every progress event.
 */
export function createRateTracker(smoothing = 0.3) {
  let lastBytes: number | null = null;
  let lastAt = 0;
  let rate = 0;
  return {
    update(bytesWritten: number, nowMs: number): number {
      if (lastBytes === null || bytesWritten < lastBytes) {
        lastBytes = bytesWritten;
        lastAt = nowMs;
        return rate;
      }
      const elapsed = (nowMs - lastAt) / 1000;
      if (elapsed < 1) return rate;
      const instant = (bytesWritten - lastBytes) / elapsed;
      rate = rate === 0 ? instant : rate + smoothing * (instant - rate);
      lastBytes = bytesWritten;
      lastAt = nowMs;
      return rate;
    },
    reset() {
      lastBytes = null;
      lastAt = 0;
      rate = 0;
    },
  };
}

/** "1.2 GB of 2.3 GB · 4.1 MB/s · about 4 min left"; speed and time appear once they're known. */
export function describeDownload(bytesWritten: number, bytesTotal: number, bytesPerSecond: number): string {
  const parts = [`${formatBytes(bytesWritten)} of ${formatBytes(bytesTotal)}`];
  if (bytesPerSecond > 0) {
    parts.push(formatRate(bytesPerSecond));
    const left = formatTimeLeft((bytesTotal - bytesWritten) / bytesPerSecond);
    if (left) parts.push(left);
  }
  return parts.join(" · ");
}

/**
 * What to tell someone whose download stopped, in everyday words. Never shows the raw error
 * ("timeout", "ENOTFOUND"), network jargon or system settings to change; the dialog offers Try again.
 */
export function downloadFailureMessage(rawError: string): { title: string; message: string } {
  const m = rawError.toLowerCase();
  if (m.includes("space") || m.includes("enospc") || m.includes("storage")) {
    return {
      title: "Your phone is full",
      message: "There isn't enough room to finish the download. Delete some photos, videos or apps you don't need, then try again.",
    };
  }
  return {
    title: "Download didn't finish",
    message: "The connection dropped. Check that you're connected to the internet, then try again. Wi-Fi works best.",
  };
}
