import { createRateTracker, describeDownload, formatBytes, formatTimeLeft } from "@/utils/download-format";

const MB = 1024 * 1024;

describe("download progress text", () => {
  it("formats sizes like the model lists", () => {
    expect(formatBytes(619 * MB)).toBe("619 MB");
    expect(formatBytes(2315 * MB)).toBe("2.3 GB");
    expect(formatBytes(4169 * MB)).toBe("4.2 GB");
    expect(formatBytes(0)).toBe("0 MB");
  });

  it("rounds the time left to something readable", () => {
    expect(formatTimeLeft(30)).toBe("less than a minute left");
    expect(formatTimeLeft(250)).toBe("about 4 min left");
    expect(formatTimeLeft(3900)).toBe("about 1 h 5 min left");
  });

  it("adds speed and time left once the speed is known", () => {
    expect(describeDownload(100 * MB, 2315 * MB, 0)).toBe("100 MB of 2.3 GB");
    expect(describeDownload(1200 * MB, 2400 * MB, 4 * MB)).toBe("1.2 GB of 2.4 GB · 4.0 MB/s · about 5 min left");
  });

  it("smooths the speed and ignores samples under a second apart", () => {
    const rate = createRateTracker(0.5);
    expect(rate.update(0, 0)).toBe(0);
    expect(rate.update(5 * MB, 500)).toBe(0);
    expect(rate.update(10 * MB, 2000)).toBe(5 * MB);
    expect(rate.update(26 * MB, 4000)).toBe(6.5 * MB);
  });
});
