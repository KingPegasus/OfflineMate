import { useSettingsStore } from "@/stores/settings-store";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      selectedTier: "standard",
      voiceEnabled: false,
      hasCompletedOnboarding: false,
    });
  });

  it("updates selected tier", () => {
    useSettingsStore.getState().setSelectedTier("full");
    expect(useSettingsStore.getState().selectedTier).toBe("full");
  });

  it("completes onboarding", () => {
    useSettingsStore.getState().completeOnboarding();
    expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
  });
});
