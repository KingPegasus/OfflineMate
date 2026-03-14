# Model Comparison and Tier-Wise Selection

This document is the reference for OfflineMate model options, their pros, and how users select models within each tier. See also [model-and-capability-tiers.md](./model-and-capability-tiers.md) for tier strategy and [tech/models.md](../tech/models.md) for technical details.

---

## How Model Selection Works

### Current Flow

1. **Onboarding / Settings**: User selects a **tier** (Lite, Standard, or Full) based on device RAM.
2. **App behavior**: The app uses the **primary model** for that tier. There is no per-model selection within a tier; the primary model is always loaded.
3. **Fallback**: If the model fails to load (e.g. OOM), the app automatically downgrades to the next lower tier and retries.

### Future: Per-Model Selection Within Tier

The model registry already defines `primary` and `alternates` per tier. A future enhancement could let users pick a specific model within the selected tier (e.g. Standard: Qwen 3 1.7B vs SmolLM 1.7B vs Llama 1B) and show pros for each. See [ROADMAP_AND_GAPS.md](../ROADMAP_AND_GAPS.md) for planned work.

---

## Models by Tier

### Lite Tier (3–4 GB RAM)

Target: weak devices. Prioritize speed, battery, and minimal RAM. No RAG retrieval; shorter context.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **SmolLM2 135M** (primary) | 135M | ~90 MB | Smallest, fastest; lowest RAM use; ideal for low-end phones |
| **SmolLM2 360M** (alternate) | 360M | ~200 MB | Better chat quality than 135M; still fast and efficient |

**Future options** (when ExecuTorch exports exist):

- **Qwen 3 0.6B** — Better reasoning than SmolLM at similar size; available in react-native-executorch.
- **Qwen 3.5 0.8B** — Planned upgrade; better general quality. See [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

---

### Standard Tier (6–8 GB RAM)

Target: mid-range devices. Full RAG, tools, and speech. Balanced quality and responsiveness.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **Qwen 3 1.7B** (primary) | 1.7B | ~1 GB | Best general chat; strong tool use; Alibaba model |
| **SmolLM2 1.7B** (alternate) | 1.7B | ~1 GB | Fast; efficient; HuggingFace family |
| **Llama 3.2 1B** (alternate) | 1B | ~700 MB | Meta model; solid reasoning; smaller than others |

**Other options in react-native-executorch** (not yet in app registry):

- **Hammer 2.1 1.5B** — Optimized for function/tool calling; ideal for reminders, search, calendar.
- **Phi 4 Mini 4B** — Microsoft reasoning model; stronger on complex tasks (larger download).
- **Qwen 3.5 2B** — Planned when ExecuTorch exports are available. See [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

---

### Full Tier (10–12+ GB RAM)

Target: strong devices. Longer context (8K), advanced planner, richer RAG.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **Qwen 3 4B** (primary) | 4B | ~2 GB | Strongest general quality; best for complex requests |
| **Llama 3.2 3B** (alternate) | 3B | ~1.8 GB | Meta model; strong reasoning at this size |

**Other options in react-native-executorch** (not yet in app registry):

- **Phi 4 Mini 4B** — Microsoft model; often strong on reasoning benchmarks.
- **Hammer 2.1 3B** — Tool-calling focused; good for assistants with many tools.
- **Qwen 3.5 4B** — Planned when ExecuTorch exports are available. See [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

---

## Quick Comparison Matrix

| Tier | Primary | Alternates | Best for… |
|------|---------|------------|-----------|
| Lite | SmolLM2 135M | SmolLM2 360M | Low RAM; speed; basic chat |
| Standard | Qwen 3 1.7B | SmolLM2 1.7B, Llama 1B | General chat; tools; RAG |
| Full | Qwen 3 4B | Llama 3B | Complex reasoning; long context |

---

## Model Families Summary

| Family | Vendor | Strengths |
|--------|--------|-----------|
| **Qwen 3** | Alibaba | General chat; tool use; multilingual |
| **SmolLM2** | HuggingFace | Speed; efficiency; small size |
| **Llama 3.2** | Meta | Reasoning; instruction-following |
| **Hammer 2.1** | MadeAgents | Function/tool calling |
| **Phi 4 Mini** | Microsoft | Reasoning; complex tasks |

---

## Where to Change Model Selection

- **Code**: `src/ai/model-registry.ts` — tier specs, primary/alternates.
- **Settings UI**: `app/(tabs)/settings.tsx` — tier picker.
- **Onboarding**: `app/onboarding.tsx` — tier picker and initial model download.
- **LLM loading**: `src/ai/llm-engine.ts` — uses `getTierSpec(tier).primary`.
- **Model downloads**: `src/ai/model-manager.ts` — downloads assets for the tier’s primary model.

---

## References

- [Model and capability tiers](./model-and-capability-tiers.md)
- [Tech: models](../tech/models.md)
- [React Native ExecuTorch models](https://docs.swmansion.com/react-native-executorch/docs)
- [Software Mansion Hugging Face models](https://huggingface.co/software-mansion)
