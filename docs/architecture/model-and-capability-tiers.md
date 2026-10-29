# Model and Capability Tiers

OfflineMate supports a wide device range through tiered model selection and feature adaptation.

## Tier Strategy

```text
Lite tier (weak devices): prioritize speed, battery, and basic utility
Standard tier (mid devices): balance quality and responsiveness
Full tier (strong devices): maximize reasoning and richer context usage
```

## Current Tier Mapping

- Lite (3-4 GB RAM):
  - Primary: SmolLM2 135M quantized
  - Alternates: SmolLM2 360M, LFM 2.5 350M
- Standard (6-8 GB RAM):
  - Primary: Gemma 4 E2B quantized
  - Alternates: Qwen 3 1.7B, Qwen 3.5 2B, MiniCPM5 2B, SmolLM2 1.7B, Llama 3.2 1B
- Full (10-12+ GB RAM):
  - Primary: Qwen 3 4B quantized
  - Alternates: LFM 2.5 2.6B, Llama 3.2 3B
  - Future targets: Gemma 4 E4B or Qwen 3.5 4B once ExecuTorch exports ship

See [model-comparison-and-selection.md](./model-comparison-and-selection.md) for per-model pros.

## Why This Was Chosen

- A single model does not serve both low-end and flagship devices well.
- Tiering protects user experience on weak devices while retaining quality on stronger devices.
- Existing pre-exported model availability in runtime ecosystem reduces implementation risk.
- The architecture remains model-family-agnostic, allowing future swaps.

## Runtime Selection and Fallback

- Initial tier recommendation based on device memory and device class signals.
- User can override tier in settings.
- Automatic fallback to lower tier if model load fails (OOM or runtime incompatibility).

## Feature Adaptation by Tier

- Lite:
  - shorter prompts, strict token limits, deterministic tool routing
- Standard:
  - full RAG + tools + speech defaults
- Full:
  - longer context windows and advanced planner capabilities

For detailed model options, pros, and tier-wise selection, see [model-comparison-and-selection.md](./model-comparison-and-selection.md).

## References

- React Native ExecuTorch model docs: [https://docs.swmansion.com/react-native-executorch/docs/0.1.x/guides/running-llms](https://docs.swmansion.com/react-native-executorch/docs/0.1.x/guides/running-llms)
- ExecuTorch Qwen support PR: [https://github.com/pytorch/executorch/pull/10539](https://github.com/pytorch/executorch/pull/10539)
- Qwen model family repository: [https://github.com/QwenLM](https://github.com/QwenLM)
- Llama 3.2 model card family: [https://huggingface.co/meta-llama](https://huggingface.co/meta-llama)
- SmolLM family: [https://huggingface.co/HuggingFaceTB](https://huggingface.co/HuggingFaceTB)
