# Model Comparison and Tier-Wise Selection

This document is the reference for OfflineMate model options, their pros, and how users select models within each tier. See also [model-and-capability-tiers.md](./model-and-capability-tiers.md) for tier strategy, [tech/models.md](../tech/models.md) for technical details, and [qwen35-compatibility-research.md](../tech/qwen35-compatibility-research.md) for the latest compatibility research (October 2026, `react-native-executorch` 0.11.0).

---

## How Model Selection Works

1. **Onboarding / Settings**: User selects a **tier** (Lite, Standard, or Full) based on device RAM.
2. **Per-tier variant (Settings)**: Every tier has a model picker listing its primary plus alternates. Non-default variants can be downloaded from Settings or on first chat message.
3. **App behavior**: Each tier loads the selected variant, or the primary when none is selected (`tierModelIds[tier] = null`).
4. **Fallback**: If the model fails to load (for example OOM), the app automatically downgrades to the next lower tier and retries.

Implementation plan: [per-tier-model-selection-plan.md](./per-tier-model-selection-plan.md)

---

## Models by Tier

### Lite Tier (3–4 GB RAM)

Target: weak devices. Prioritize speed, battery, and minimal RAM. No RAG retrieval; shorter context.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **SmolLM2 135M** (primary) | 135M | ~90 MB | Smallest, fastest; lowest RAM use; ideal for low-end phones |
| **SmolLM2 360M** (alternate) | 360M | ~200 MB | Better chat quality than 135M; still fast and efficient |
| **LFM 2.5 350M** (alternate) | 350M | ~435 MB | Liquid hybrid architecture; fast first token; stronger instruction following |

**Available but not in the app registry:**

- **Qwen 3 0.6B**: better reasoning than SmolLM at a similar size (~400 MB).
- **Hammer 2.1 0.5B**: tuned for assistant/tool workflows.
- **Qwen 3.5 0.8B**: exported, but the 8da4w file is **~1.4 GB**, too large for this tier.

---

### Standard Tier (6–8 GB RAM)

Target: mid-range devices. Full RAG, tools, and speech. Balanced quality and responsiveness.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **Gemma 4 E2B** (primary) | E2B | ~900 MB | Google PLE model; good prefill latency; strongest general quality at this size |
| **Qwen 3 1.7B** (alternate) | 1.7B | ~1 GB | Strong chat and tool use |
| **Qwen 3.5 2B** (alternate) | 2B | ~1.1 GB | Newer Qwen line; experimental slow prefill |
| **MiniCPM5 2B** (alternate) | 2B | ~1.3 GB | New in RNE 0.11.0; vendor claims strong coding/agent results; 8K context |
| **SmolLM2 1.7B** (alternate) | 1.7B | ~1 GB | Fast; efficient |
| **Llama 3.2 1B** (alternate) | 1B | ~700 MB | Smallest Standard option |

**Available but not in the app registry:**

- **LFM 2.5 1.2B**: compact instruction-following model.
- **Hammer 2.1 1.5B**: tuned for function/tool calling (reminders, search, calendar).
- **Gemma 4 E2B Omni**: vision + audio input (new API `GEMMA4_OMNI_E2B`).
- **Bielik v3 1.5B**: Polish/CEE regional model.

**Watching:** **LFM3-1.7B** (Oct 2026, 256K context, ~1 GB at 4-bit). No ExecuTorch export yet.

---

### Full Tier (10–12+ GB RAM)

Target: strong devices. Longer context (8K), advanced planner, richer RAG.

| Model | Size | Download | Pros |
|-------|------|----------|------|
| **Qwen 3 4B** (primary) | 4B | ~2 GB | Strongest general quality; best for complex requests |
| **LFM 2.5 2.6B** (alternate) | 2.6B | ~1.7 GB | New in RNE 0.11.0; hybrid architecture for fast decode; aimed at instruction following and agents |
| **Llama 3.2 3B** (alternate) | 3B | ~1.8 GB | Strong reasoning at this size |

**Available but not in the app registry:**

- **Phi 4 Mini 3.8B**: Microsoft reasoning model.
- **Hammer 2.1 3B**: tool-calling focused.

**Watching:** **Gemma 4 E4B** and **Qwen 3.5 4B**. Neither has an ExecuTorch export yet.

---

## Quick Comparison Matrix

| Tier | Primary | Alternates (in app) | Best for… |
|------|---------|---------------------|-----------|
| Lite | SmolLM2 135M | SmolLM2 360M, LFM 2.5 350M | Low RAM; speed; basic chat |
| Standard | Gemma 4 E2B | Qwen 3 1.7B, Qwen 3.5 2B, MiniCPM5 2B, SmolLM2 1.7B, Llama 1B | General chat; tools; RAG |
| Full | Qwen 3 4B | LFM 2.5 2.6B, Llama 3B | Complex reasoning; long context |

---

## Model Families Summary

| Family | Vendor | Strengths / status |
|--------|--------|--------------------|
| **Gemma 4** | Google | E2B in app (Standard primary); E2B Omni available; E4B not exported |
| **Qwen 3** | Alibaba | General chat; tool use; multilingual |
| **Qwen 3.5** | Alibaba | 2B in app; legacy-only exports; slow prefill; 0.8B too large for Lite; 4B not exported |
| **MiniCPM5** | OpenBMB | 2B in app (new in RNE 0.11.0) |
| **LFM 2.5** | Liquid AI | 350M and 2.6B in app; 1.2B and VL variants available |
| **LFM3** | Liquid AI | Released Oct 2026; GGUF/MLX/ONNX only so far |
| **SmolLM2** | Hugging Face | Speed; efficiency; small size |
| **Llama 3.2** | Meta | Reasoning; instruction following |
| **Hammer 2.1** | MadeAgents | Function/tool calling |
| **Phi 4 Mini** | Microsoft | Reasoning; complex tasks |
| **Bielik v3** | SpeakLeash | Polish/CEE regional |

### Not Practical for Phone Tiers

None of these ship phone-tier ExecuTorch exports:

- **Qwen 3.6 / 3.7 / 3.8**: 27B+ dense, large MoE, or API-only.
- **Moonshot Kimi K2.x**: 1T MoE; cloud/API only.
- **DeepSeek V3/V4**: 671B+ MoE. R1 distills have no turnkey RN exports.
- **MiniMax M2/M2.7**: 230B+ MoE.
- **Zhipu GLM-4-9B**: no ExecuTorch export path.
- **Mistral Small 3 (24B)**: too large for phone RAM.

---

## Where to Change Model Selection

- **Code**: `src/ai/model-registry.ts`: tier specs, primary/alternates.
- **Settings UI**: `app/(tabs)/settings.tsx`: tier picker plus per-tier model variant picker.
- **Persisted choice**: `src/stores/settings-store.ts`: `tierModelIds` (per-tier selected model id, `null` = primary).
- **Onboarding**: `app/onboarding.tsx`: tier picker and primary model download.
- **LLM loading**: `src/ai/llm-engine.ts`: `initialize(tier, { modelId })` via `resolveModelForTier`.
- **Model downloads**: `src/ai/model-manager.ts`: onboarding downloads the tier primary; alternates are fetched from Settings or on first chat load.

---

## References

- [Model and capability tiers](./model-and-capability-tiers.md)
- [Tech: models](../tech/models.md)
- [On-device model compatibility research](../tech/qwen35-compatibility-research.md)
- [React Native ExecuTorch docs](https://docs.swmansion.com/react-native-executorch/docs)
- [React Native ExecuTorch benchmarks](https://docs.swmansion.com/react-native-executorch/docs/benchmarks)
- [Software Mansion Hugging Face models](https://huggingface.co/software-mansion)
