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
    await vi.waitFor(() => expect(module.delete).toHaveBeenCalledOnce());
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
    await vi.waitFor(() => expect(module.delete).toHaveBeenCalledOnce());
  });
});
