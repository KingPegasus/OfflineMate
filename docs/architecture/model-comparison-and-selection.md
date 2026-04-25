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

- **Qwen 3 0.6B** — Better reasoning than SmolLM at similar size; already available in react-native-executorch as a quantized ~400 MB model.
- **Qwen 2.5 0.5B** — Older Qwen line, but already available in react-native-executorch and useful as a conservative Lite-tier fallback candidate.
- **Hammer 2.1 0.5B** — Built-in mobile option optimized for assistant/tool workflows.
- **Qwen 3.5 0.8B** — Still blocked for the current runtime; see [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

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
- **LFM 2.5 1.2B Instruct** — Compact instruction-following model; promising Standard-tier alternate.
- **Qwen 2.5 1.5B / 3B** — Stable built-in Qwen alternatives if Qwen 3 behavior regresses.
- **Phi 4 Mini 4B** — Microsoft reasoning model; stronger on complex tasks (larger download).
- **Gemma 4 E2B** — Upstream ExecuTorch support exists, but React Native ExecuTorch exports are still open.
- **Qwen 3.5 2B** — Not ready for React Native ExecuTorch; planned only when mobile exports are available. See [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

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
- **Gemma 4 E4B** — Promising if Software Mansion ships React Native exports; upstream ExecuTorch text-only support has landed.
- **Qwen 3.5 4B** — Not ready for React Native ExecuTorch. See [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md).

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
| **LFM 2.5** | Liquid AI | Compact instruction following |
| **Gemma 4** | Google | Strong small-model candidate; pending RN ExecuTorch exports |
| **Qwen 3.5 / 3.6** | Alibaba | Watchlist only; not compatible with current mobile runtime |

### Not Practical for Phone Tiers

- **Kimi K2.x** — Current open-weight releases are very large MoE models (hundreds of GB even quantized). They are server/desktop candidates, not OfflineMate phone models.
- **MiniMax M2.x** — Strong agent/coding models, but GGUF quantizations still target high-RAM desktops or servers. No React Native ExecuTorch path found.
- **Qwen 3.6** — Released and useful in vLLM/SGLang/llama.cpp/MLX ecosystems, but current public sizes are not phone-tier React Native ExecuTorch candidates.

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
