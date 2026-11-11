import { formatTokPerSec, hasMeasuredTokPerSec } from "@/utils/tok-per-sec";

describe("hasMeasuredTokPerSec", () => {
  it("is true only for a real, positive speed", () => {
    expect(hasMeasuredTokPerSec(18.3)).toBe(true);
    expect(hasMeasuredTokPerSec(0.4)).toBe(true);
  });

  it("is false when no model ran (null), for old messages (undefined) and for bad values", () => {
    expect(hasMeasuredTokPerSec(null)).toBe(false);
    expect(hasMeasuredTokPerSec(undefined)).toBe(false);
    expect(hasMeasuredTokPerSec(0)).toBe(false);
    expect(hasMeasuredTokPerSec(-1)).toBe(false);
    expect(hasMeasuredTokPerSec(Number.NaN)).toBe(false);
    expect(hasMeasuredTokPerSec(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("formatTokPerSec", () => {
  it("formats a measured speed to one decimal", () => {
    expect(formatTokPerSec(18.345)).toBe("(18.3 tok/s)");
  });
});
