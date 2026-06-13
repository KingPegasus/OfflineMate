import { migrateSettingsState, useSettingsStore } from "@/stores/settings-store";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      selectedTier: "standard",
      standardModelId: null,
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

  it("updates standard model id", () => {
    useSettingsStore.getState().setStandardModelId("gemma4-e2b");
    expect(useSettingsStore.getState().standardModelId).toBe("gemma4-e2b");
    useSettingsStore.getState().setStandardModelId("invalid");
    expect(useSettingsStore.getState().standardModelId).toBe(null);
  });

  it("completes onboarding", () => {
    useSettingsStore.getState().completeOnboarding();
    expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
  });
});

describe("migrateSettingsState", () => {
  it("returns full defaults when persisted is undefined", () => {
    const result = migrateSettingsState(undefined, 5);
    expect(result).toEqual({
      selectedTier: "standard",
      standardModelId: null,
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is null", () => {
    const result = migrateSettingsState(null, 5);
    expect(result).toEqual({
      selectedTier: "standard",
      standardModelId: null,
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is empty object", () => {
    const result = migrateSettingsState({}, 5);
    expect(result.selectedTier).toBe("standard");
    expect(result.standardModelId).toBe(null);
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
        standardModelId: "qwen3.5-2b",
        voiceEnabled: true,
        webSearchEnabled: false,
        hasCompletedOnboarding: true,
        persistChatHistory: true,
      },
      5
    );
    expect(result).toEqual({
      selectedTier: "full",
      standardModelId: "qwen3.5-2b",
      voiceEnabled: true,
      webSearchEnabled: false,
      hasCompletedOnboarding: true,
      persistChatHistory: true,
    });
  });

  it("adds standardModelId when migrating from v4", () => {
    const result = migrateSettingsState(
      {
        selectedTier: "standard",
        voiceEnabled: true,
        webSearchEnabled: false,
        hasCompletedOnboarding: true,
        persistChatHistory: true,
      },
      4
    );
    expect(result.standardModelId).toBe(null);
    expect(result.selectedTier).toBe("standard");
  });

  it("rejects invalid standardModelId values", () => {
    const result = migrateSettingsState({ standardModelId: "not-a-model" }, 5);
    expect(result.standardModelId).toBe(null);
  });

  it("replaces undefined persisted values with defaults (no broken state)", () => {
    const result = migrateSettingsState(
      { selectedTier: "lite", voiceEnabled: undefined, webSearchEnabled: undefined, chatHistoryLimit: 999 },
      5
    );
    expect(result.selectedTier).toBe("lite");
    expect(result.voiceEnabled).toBe(false);
    expect(result.webSearchEnabled).toBe(true);
    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.persistChatHistory).toBe(false);
    expect("chatHistoryLimit" in result).toBe(false);
  });
});
