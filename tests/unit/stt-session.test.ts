import { describe, expect, it, vi } from "vitest";
import { sessionForPress, type ListeningSession } from "@/voice/stt-session";

const session = (modelMissing = false): ListeningSession => ({
  start: vi.fn(async () => {}),
  stop: vi.fn(async () => ""),
  release: vi.fn(async () => {}),
  ...(modelMissing ? { modelMissing: true } : {}),
});

// Found on a Galaxy S23 Ultra (0.13.0): Chat opened while onboarding was still downloading, so the
// pre-warmed session was the "model missing" stub, and the first press offered a download that had
// already finished.
describe("sessionForPress", () => {
  it("keeps a pre-warmed session that has the model", async () => {
    const warm = session();
    const create = vi.fn(async () => session());
    expect(await sessionForPress(Promise.resolve(warm), create)).toBe(warm);
    expect(create).not.toHaveBeenCalled();
  });

  it("looks again when the pre-warmed session was made before the voice model was downloaded", async () => {
    const fresh = session();
    const create = vi.fn(async () => fresh);
    expect(await sessionForPress(Promise.resolve(session(true)), create)).toBe(fresh);
    expect(create).toHaveBeenCalledOnce();
  });

  it("creates a session when none is pre-warmed", async () => {
    const fresh = session();
    expect(await sessionForPress(null, async () => fresh)).toBe(fresh);
  });
});
