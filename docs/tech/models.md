# Model Strategy Technical Notes

This document tracks model families, target tiers, and migration strategy. For user-facing model options and pros per tier, see [architecture/model-comparison-and-selection.md](../architecture/model-comparison-and-selection.md).

## Goals

- Cover weak and strong devices
- Keep inference local
- Preserve option to switch model family without architecture rewrite

## Model Families in Scope

- Qwen 3 family (0.6B, 1.7B, 4B as available in runtime ecosystem)
- SmolLM2 family (135M, 360M, 1.7B)
- Llama 3.2 family (1B, 3B class options)

## Tier-Driven Model Assignment

- Lite tier:
  - SmolLM2 135M or 360M
- Standard tier:
  - Qwen 3 1.7B
  - fallback to SmolLM2 1.7B or Llama 3.2 1B
- Full tier:
  - Qwen 3 4B
  - fallback to Llama 3.2 3B class

## Quantization and Performance

- Use runtime-supported quantized variants where available
- Tune by:
  - max generated tokens
  - prompt length budget
  - temperature/top-p bounds
  - tool-routing strategy per tier

## Response Quality Guards (Loop/Repeat Protection)

Small on-device models can get stuck in local loops (sentence repetition) when temperature/sampling
are not constrained enough, or when prompt context is noisy. To reduce that:

- Runtime generation is configured per tier using `temperature` + `top-p`:
  - Lite: lower randomness for stability
  - Standard/Full: slightly higher creativity while staying bounded
- Token streaming path includes a repetition detector that interrupts generation when repeated sentence
  patterns are detected several times in the recent output window.
- A final output cleanup guard removes excessive duplicate lines/sentence tails before the response is
  persisted and spoken.

These guards are intentionally lightweight and deterministic to avoid heavy post-processing overhead on
low-end devices.

## Fallback and Recovery

- If model fails to load:
  - downgrade one tier
  - present user-visible notice
  - keep app interactive with reduced capability

## Qwen 3.5 Path

- Track Qwen 3.5 export/runtime maturity and stability for mobile runtime path in use
- **Detailed research:** See [qwen35-compatibility-research.md](./qwen35-compatibility-research.md) for architecture analysis, ExecuTorch status, and migration blockers
- Plan migration as a configuration and model-registry update, not a pipeline rewrite

## ExecuTorch Deployment (Best Practices)

- **Export:** Models are exported to `.pte` (ExecuTorch) format; Hugging Face Optimum and native export paths are supported. The runtime loads these files from app storage (e.g. after download from model manager).
- **Quantization:** 4-bit post-training quantization (e.g. GPTQ) is common for mobile; it enables larger models (e.g. 7B-class) on flagship devices. Our tiers use smaller, quantized variants (e.g. 0.6B–4B) for broader device coverage.
- **Delegation:** Use backend delegation where available—XNNPack (CPU), Core ML (iOS), MPS (Apple Silicon), Qualcomm AI Stack (Android NPU)—to improve latency and energy use.
- **Why on-device:** Keeps data local (privacy), avoids network latency, enables offline use, and removes per-request cloud cost. Trade-off: mobile inference is memory- and battery-bound; tier selection and generation guards help stay within device limits.

## On-Device Constraints (Memory, Battery)

- **Memory:** LLM inference is largely memory-bound. Small models (sub‑billion parameters) and quantization reduce RAM pressure; tier fallbacks prevent OOM on low-end devices.
- **Battery and thermal:** Continuous inference can impact battery and thermal behavior. Interrupt and timeout logic, plus optional background unload, help avoid sustained heavy load.
- **Accuracy vs. size:** Sub-billion and low-billion models (e.g. MobileLLM, Phi-3-mini) can match or approach larger models when optimized for edge; we rely on tiered model assignment and generation config (temperature, top-p) to balance quality and stability.

## References

- [Qwen (Alibaba)](https://github.com/QwenLM)
- [React Native ExecuTorch](https://docs.swmansion.com/react-native-executorch/docs)
- [ExecuTorch LLM Deployment](https://docs.pytorch.org/executorch/stable/llm/getting-started.html)
- [ExecuTorch (executorch.ai)](https://executorch.ai/)
- [LLMModule / GenerationConfig](https://docs.swmansion.com/react-native-executorch/docs/typescript-api/natural-language-processing/LLMModule)
- [ExecuTorch repository](https://github.com/pytorch/executorch)
- [Llama (Meta)](https://huggingface.co/meta-llama)
- [SmolLM (HuggingFace)](https://huggingface.co/HuggingFaceTB)
- [MobileLLM (arxiv)](https://arxiv.org/abs/2402.14905)
