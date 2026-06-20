import { migrateSettingsState, useSettingsStore } from "@/stores/settings-store";

describe("settings store", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      selectedTier: "standard",
      tierModelIds: { lite: null, standard: null, full: null },
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

  it("updates model id per tier", () => {
    useSettingsStore.getState().setTierModelId("standard", "gemma4-e2b");
    expect(useSettingsStore.getState().tierModelIds.standard).toBe("gemma4-e2b");
    useSettingsStore.getState().setTierModelId("standard", "invalid");
    expect(useSettingsStore.getState().tierModelIds.standard).toBe(null);
    useSettingsStore.getState().setTierModelId("full", "llama3.2-3b");
    expect(useSettingsStore.getState().tierModelIds.full).toBe("llama3.2-3b");
  });

  it("completes onboarding", () => {
    useSettingsStore.getState().completeOnboarding();
    expect(useSettingsStore.getState().hasCompletedOnboarding).toBe(true);
  });
});

describe("migrateSettingsState", () => {
  it("returns full defaults when persisted is undefined", () => {
    const result = migrateSettingsState(undefined, 6);
    expect(result).toEqual({
      selectedTier: "standard",
      tierModelIds: { lite: null, standard: null, full: null },
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is null", () => {
    const result = migrateSettingsState(null, 6);
    expect(result).toEqual({
      selectedTier: "standard",
      tierModelIds: { lite: null, standard: null, full: null },
      voiceEnabled: false,
      webSearchEnabled: true,
      hasCompletedOnboarding: false,
      persistChatHistory: false,
    });
  });

  it("returns full defaults when persisted is empty object", () => {
    const result = migrateSettingsState({}, 6);
    expect(result.selectedTier).toBe("standard");
    expect(result.tierModelIds).toEqual({ lite: null, standard: null, full: null });
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
        tierModelIds: { lite: "smollm2-360m", standard: "qwen3.5-2b", full: "llama3.2-3b" },
        voiceEnabled: true,
        webSearchEnabled: false,
        hasCompletedOnboarding: true,
        persistChatHistory: true,
      },
      6
    );
    expect(result).toEqual({
      selectedTier: "full",
      tierModelIds: { lite: "smollm2-360m", standard: "qwen3.5-2b", full: "llama3.2-3b" },
      voiceEnabled: true,
      webSearchEnabled: false,
      hasCompletedOnboarding: true,
      persistChatHistory: true,
    });
  });

  it("migrates standardModelId from v5 into tierModelIds.standard", () => {
    const result = migrateSettingsState(
      {
        selectedTier: "standard",
        standardModelId: "qwen3.5-2b",
        voiceEnabled: true,
        webSearchEnabled: false,
        hasCompletedOnboarding: true,
        persistChatHistory: true,
      },
      5
    );
    expect(result.tierModelIds).toEqual({ lite: null, standard: "qwen3.5-2b", full: null });
    expect(result.selectedTier).toBe("standard");
  });

  it("rejects invalid tier model ids", () => {
    const result = migrateSettingsState({ tierModelIds: { lite: "bad", standard: "bad", full: "bad" } }, 6);
    expect(result.tierModelIds).toEqual({ lite: null, standard: null, full: null });
  });

  it("replaces undefined persisted values with defaults (no broken state)", () => {
    const result = migrateSettingsState(
      { selectedTier: "lite", voiceEnabled: undefined, webSearchEnabled: undefined, chatHistoryLimit: 999 },
      6
    );
    expect(result.selectedTier).toBe("lite");
    expect(result.tierModelIds).toEqual({ lite: null, standard: null, full: null });
    expect(result.voiceEnabled).toBe(false);
    expect(result.webSearchEnabled).toBe(true);
    expect(result.hasCompletedOnboarding).toBe(false);
    expect(result.persistChatHistory).toBe(false);
    expect("chatHistoryLimit" in result).toBe(false);
  });
});
