import { describe, expect, it } from "vitest";
import { getTierSpec, MODEL_TIERS } from "@/ai/model-registry";
import { describePhoneRam, describeRecommendation, recommendTierForDevice, soldRamGb } from "@/utils/tier-recommendation";

describe("recommendTierForDevice", () => {
  it("suggests Light for 3 and 4 GB phones", () => {
    expect(recommendTierForDevice(2.8)).toBe("lite");
    expect(recommendTierForDevice(3.7)).toBe("lite");
    expect(recommendTierForDevice(4.9)).toBe("lite");
  });

  it("suggests Balanced for 6 and 8 GB phones (reported as about 5.5 and 7.6 GB)", () => {
    expect(recommendTierForDevice(5)).toBe("standard");
    expect(recommendTierForDevice(7.6)).toBe("standard");
  });

  it("suggests Smartest from 12 GB phones (reported as about 11 GB)", () => {
    expect(recommendTierForDevice(10)).toBe("full");
    expect(recommendTierForDevice(11.2)).toBe("full");
  });

  it("decides on RAM alone, so a new phone with little RAM isn't offered a model that won't fit", () => {
    // Until 0.14.0 a 2021+ year class meant Balanced even on a 4 GB phone, and 2024+ meant Smartest on 8 GB.
    expect(recommendTierForDevice.length).toBe(1);
    expect(recommendTierForDevice(3.8)).toBe("lite");
    expect(recommendTierForDevice(7.5)).toBe("standard");
  });
});

describe("describeRecommendation", () => {
  it("reads as plain words with the download size", () => {
    expect(describeRecommendation(getTierSpec("standard").label, "2.6 GB")).toBe("Balanced · 2.6 GB download");
  });

  it("leaves the size out until it is known", () => {
    expect(describeRecommendation("Light", null)).toBe("Light");
  });
});

describe("plain tier wording", () => {
  it("every tier has an everyday label and a summary without RAM figures or model jargon", () => {
    expect(MODEL_TIERS.map((t) => t.label)).toEqual(["Light", "Balanced", "Smartest"]);
    for (const tier of MODEL_TIERS) {
      expect(tier.summary.length).toBeGreaterThan(20);
      expect(tier.summary).not.toMatch(/\b(RAM|GB|LLM|tier|token|quantiz)/i);
    }
  });
});

// Balanced and Smartest download the same model, so the size buttons show RAM, not download size.
describe("RAM wording", () => {
  it("each size says how much RAM a phone needs, and the sizes differ", () => {
    expect(MODEL_TIERS.map((t) => t.ramLabel)).toEqual(["3–4 GB RAM", "6–8 GB RAM", "10 GB+ RAM"]);
  });

  it("turns the memory a phone reports into the RAM it was sold with", () => {
    expect(soldRamGb(2.8)).toBe(3);
    expect(soldRamGb(3.7)).toBe(4);
    expect(soldRamGb(5.6)).toBe(6);
    expect(soldRamGb(7.6)).toBe(8);
    expect(soldRamGb(11.2)).toBe(12);
    expect(soldRamGb(15.4)).toBe(16);
  });

  it("describes the phone's RAM in a sentence, or nothing when it's unknown", () => {
    expect(describePhoneRam(7.6)).toBe("Your phone has 8 GB of RAM.");
    expect(describePhoneRam(null)).toBeNull();
    expect(describePhoneRam(0)).toBeNull();
  });
});
