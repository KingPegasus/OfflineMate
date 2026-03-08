# Model Strategy Technical Notes

This document tracks model families, target tiers, and migration strategy.

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

## Fallback and Recovery

- If model fails to load:
  - downgrade one tier
  - present user-visible notice
  - keep app interactive with reduced capability

## Qwen 3.5 Path

- Track Qwen 3.5 export/runtime maturity and stability for mobile runtime path in use
- Plan migration as a configuration and model-registry update, not a pipeline rewrite

## References

- Qwen organization: [https://github.com/QwenLM](https://github.com/QwenLM)
- React Native ExecuTorch docs: [https://docs.swmansion.com/react-native-executorch/docs](https://docs.swmansion.com/react-native-executorch/docs)
- ExecuTorch repository: [https://github.com/pytorch/executorch](https://github.com/pytorch/executorch)
- Llama model family: [https://huggingface.co/meta-llama](https://huggingface.co/meta-llama)
- HuggingFace SmolLM family: [https://huggingface.co/HuggingFaceTB](https://huggingface.co/HuggingFaceTB)
