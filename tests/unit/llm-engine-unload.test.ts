import { describe, expect, it, vi } from "vitest";
import { LLMEngine } from "@/ai/llm-engine";

/** A stand-in for the native LLMModule whose generate() finishes only when told to. */
function fakeModule() {
  let finish: (text: string) => void = () => {};
  const module = {
    generate: vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    ),
    interrupt: vi.fn(),
    delete: vi.fn(),
  };
  return { module, finish: (text = "") => finish(text) };
}

function loadedEngine(module: unknown) {
  const engine = new LLMEngine();
  Object.assign(engine as unknown as Record<string, unknown>, { llm: module, isLoaded: true });
  return engine;
}

// Play crash (Kyocera URBANO V04, 0.12.0): unload() freed the model while a reply was still being
// generated, and the native destructor crashed (Module::~Module from LLM::unload).
describe("LLMEngine.unload", () => {
  it("frees the model right away when nothing is generating", () => {
    const { module } = fakeModule();
    loadedEngine(module).unload();
    expect(module.delete).toHaveBeenCalledOnce();
  });

  it("stops a reply in progress and frees the model only after it returns", async () => {
    const { module, finish } = fakeModule();
    const engine = loadedEngine(module);
    const reply = engine.generate([{ id: "1", role: "user", content: "Hi", createdAt: 0 }]);
    await vi.waitFor(() => expect(module.generate).toHaveBeenCalled());

    engine.unload();
    expect(module.interrupt).toHaveBeenCalled();
    expect(module.delete).not.toHaveBeenCalled();

    finish("partial");
    await expect(reply).resolves.toBe("partial");
    expect(module.delete).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(module.delete).toHaveBeenCalledOnce(), { timeout: 3000 });
  });

  // Play crash (Samsung Galaxy A50, Android 11, 0.12.0): the same Module::~Module crash from a tap that
  // unloaded the model. The native runner can still be finishing just after generate() returns.
  it("waits a moment after a reply that has just finished before freeing the model", async () => {
    const { module, finish } = fakeModule();
    const engine = loadedEngine(module);
    const reply = engine.generate([{ id: "1", role: "user", content: "Hi", createdAt: 0 }]);
    await vi.waitFor(() => expect(module.generate).toHaveBeenCalled());
    finish("done");
    await reply;

    const started = Date.now();
    engine.unload();
    expect(module.delete).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(module.delete).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(LLMEngine.DISPOSE_SETTLE_MS - 50);
  });

  it("frees the model once even if unload is called again while waiting", async () => {
    const { module, finish } = fakeModule();
    const engine = loadedEngine(module);
    const reply = engine.generate([{ id: "1", role: "user", content: "Hi", createdAt: 0 }]);
    await vi.waitFor(() => expect(module.generate).toHaveBeenCalled());
    engine.unload();
    engine.unload();
    finish();
    await reply;
    await vi.waitFor(() => expect(module.delete).toHaveBeenCalledOnce(), { timeout: 3000 });
  });
});

// Seen testing 0.14.0: a run whose caller timed out kept going, and the next request failed with
// "The model is currently generating" (code 104).
describe("LLMEngine.generate while a previous run is still going", () => {
  it("stops the previous run and waits for it before starting the next", async () => {
    const { module, finish } = fakeModule();
    const engine = loadedEngine(module);
    const message = [{ id: "1", role: "user" as const, content: "Hi", createdAt: 0 }];
    const first = engine.generate(message);
    await vi.waitFor(() => expect(module.generate).toHaveBeenCalledTimes(1));

    const second = engine.generate(message);
    await new Promise((r) => setTimeout(r, 0));
    expect(module.interrupt).toHaveBeenCalled();
    expect(module.generate).toHaveBeenCalledTimes(1);

    finish("first");
    await first;
    await vi.waitFor(() => expect(module.generate).toHaveBeenCalledTimes(2));
    finish("second");
    await expect(second).resolves.toBe("second");
  });
});
