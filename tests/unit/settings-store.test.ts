import { migrateSettingsState, useSettingsStore } from "@/stores/settings-store";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      selectedTier: "standard",
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
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

describe("migrateSettingsState", () => {
  it("returns full defaults when persisted is undefined", () => {
    const result = migrateSettingsState(undefined, 4);
    expect(result).toEqual({
      selectedTier: "standard",
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is null", () => {
    const result = migrateSettingsState(null, 4);
    expect(result).toEqual({
      selectedTier: "standard",
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is empty object", () => {
    const result = migrateSettingsState({}, 4);
    expect(result.selectedTier).toBe("standard");
    expect(result.voiceEnabled).toBe(false);
    expect(result.webSearchEnabled).toBe(true);
    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.persistChatHistory).toBe(false);
  });

  it("adds webSearchEnabled when migrating from v1", () => {
    const result = migrateSettingsState(
      { selectedTier: "lite", voiceEnabled: true, hasCompletedOnboarding: true },
      1
    );
    expect(result.webSearchEnabled).toBe(true);
    expect(result.selectedTier).toBe("lite");
    expect(result.voiceEnabled).toBe(true);
    expect(result.hasCompletedOnboarding).toBe(true);
    expect(result.persistChatHistory).toBe(false);
  });

  it("preserves existing values when version matches and state is complete", () => {
    const result = migrateSettingsState(
      {
        selectedTier: "full",
        voiceEnabled: true,
        webSearchEnabled: false,
        hasCompletedOnboarding: true,
        persistChatHistory: true,
      },
      4
    );
    expect(result).toEqual({
      selectedTier: "full",
      voiceEnabled: true,
      webSearchEnabled: false,
      hasCompletedOnboarding: true,
      persistChatHistory: true,
    });
  });

  it("replaces undefined persisted values with defaults (no broken state)", () => {
    const result = migrateSettingsState(
      { selectedTier: "lite", voiceEnabled: undefined, webSearchEnabled: undefined, chatHistoryLimit: 999 },
      4
    );
    expect(result.selectedTier).toBe("lite");
    expect(result.voiceEnabled).toBe(false);
    expect(result.webSearchEnabled).toBe(true);
    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.persistChatHistory).toBe(false);
    expect("chatHistoryLimit" in result).toBe(false);
  });
});
