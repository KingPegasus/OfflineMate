# On-Device Model Compatibility Research

**Document type:** Technical research  
**Author:** Senior tech lead research  
**Last updated:** May 2026  
**Scope:** Qwen 3.5 migration for OfflineMate, plus third-party model families (Moonshot, DeepSeek, MiniMax, Zhipu, Mistral, Google, and react-native-executorch catalog updates).  
**Status:** Qwen 3.5 is **partially** ready — Lite/Standard tiers can migrate on **react-native-executorch v0.9.0+** (experimental). Full tier (4B) and most third-party flagship models remain blocked. OfflineMate currently pins **v0.8.4**; keep `QWEN35_MIGRATION_FLAG` disabled until v0.9.0 is released and prefill performance is validated.

---

## Executive Summary

Qwen 3.5 (Alibaba, Feb–Mar 2026) uses a **hybrid architecture** (Gated DeltaNet + Gated Attention) that blocked mobile export in April 2026. **Since late April 2026**, Software Mansion merged Qwen 3.5 support into react-native-executorch (**PR #1096**, milestone **v0.9.0**) with pre-exported `.pte` assets for **0.8B and 2B** on Hugging Face. Support is **experimental** — Gated DeltaNet requires sequential prefill fallback, which makes **prefill very slow**.

**OfflineMate today:** `react-native-executorch@^0.8.4` (npm stable). Qwen 3.5 constants require **v0.9.0** (merged to main; npm stable not yet published as of May 2026 — only `0.9.0-nightly-*` builds exist).

**Third-party vendors (Moonshot, DeepSeek, MiniMax, Zhipu):** Flagship open-weight releases are **MoE models in the tens-to-hundreds of billions of parameters**. None have Software Mansion pre-exports or phone-class React Native ExecuTorch paths. DeepSeek **distill** models (1.5B–8B) share Qwen/Llama architectures and could be DIY-exported, but there are **no turnkey RN constants** and tokenizer/export friction remains.

**Near-term wins without vendor migration:** Qwen 3 0.6B (Lite), Hammer 2.1 (tool calling), LFM 2.5 (Standard), Phi 4 Mini 4B (Full), and Bielik v3.0 1.5B (v0.9.0+, Polish/CEE languages).

---

## May 2026 Compatibility Snapshot

| Family | Mobile-runtime status | OfflineMate action |
|--------|----------------------|--------------------|
| **Qwen 3** | ✅ RN ExecuTorch 0.6B, 1.7B, 4B (8da4w) | Keep primary path; evaluate **0.6B for Lite** |
| **Qwen 3.5** | ⚠️ **v0.9.0+**: 0.8B, 2B only; experimental slow prefill | Upgrade to v0.9.0 when stable; pilot Lite/Standard only |
| **Qwen 3.5 4B / 9B** | ❌ No RN pre-exports | Full tier stays on Qwen 3 4B |
| **Qwen 3.6** | ❌ 27B+ only; server/GGUF paths | Track only |
| **Gemma 4 E2B/E4B** | ⚠️ Upstream ExecuTorch text-only; LiteRT-LM on Android; RN issue open | Watch [#1062](https://github.com/software-mansion/react-native-executorch/issues/1062) |
| **Hammer 2.1** | ✅ 0.5B, 1.5B, 3B in RN ExecuTorch | Evaluate for tool-calling tiers |
| **LFM 2.5** | ✅ 350M, 1.2B (+ VL variants) | Evaluate Standard-tier alternate |
| **Phi 4 Mini 4B** | ✅ Quantized in RN ExecuTorch | Evaluate Full-tier alternate |
| **Bielik v3.0 1.5B** | ✅ v0.9.0+ (Polish) | v0.9.0 upgrade candidate for CEE locales |
| **DeepSeek R1 distill** | ⚠️ DIY export only (Qwen/Llama base); no SM pre-exports | Not recommended until SM ships assets |
| **DeepSeek V3/V4** | ❌ 671B+ MoE | Not phone-class |
| **Moonshot Kimi K2.x/K2.6** | ❌ 1T MoE / 32B active; API/cloud only | Not suitable for on-device |
| **MiniMax M2/M2.7** | ❌ 230B+ MoE; smallest quant ~100 GB+ | Not suitable for on-device |
| **Zhipu GLM-4-9B** | ❌ No RN ExecuTorch export; 9B too large for Lite | Track; no mobile path |
| **Mistral Small 3 (24B)** | ❌ No RN pre-export; too large for phone tiers | Server/desktop only |

---

## 1. Qwen 3.5 Overview

### Release Timeline

| Date | Release |
|------|---------|
| Feb 16, 2026 | Flagship 397B-A17B |
| Feb 24, 2026 | Medium models (35B-A3B, 122B-A10B, 27B) |
| Mar 2, 2026 | Small models (0.8B, 2B, 4B, 9B) |

_Source: [QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5)_

### Small Model Specifications (Relevant to OfflineMate)

| Model | Params | Architecture | VRAM (BF16) | VRAM (4-bit) | Context |
|-------|--------|--------------|-------------|--------------|---------|
| Qwen3.5-0.8B | 0.8B | Dense, Gated DeltaNet + Gated Attention | ~1.6 GB | ~0.5 GB | 262K |
| Qwen3.5-2B | 2B | Dense, hybrid | — | — | 262K |
| Qwen3.5-4B | 4B | Dense, hybrid | — | — | 262K |
| Qwen3.5-9B | 9B | Dense, hybrid | — | — | 262K |

- Small models use **dense architecture** (no MoE); flagship uses sparse MoE.
- 0.8B and 2B are aimed at edge and mobile use.
- License: Apache 2.0.

---

## 2. Architecture Compatibility Analysis

### Gated DeltaNet + Gated Attention

Qwen 3.5 small models use a **hybrid architecture** distinct from standard transformers and Qwen 3:

1. **Gated DeltaNet (linear attention)** — ~75% of layers  
2. **Gated Full Attention** — ~25% of layers  
3. **Layer pattern:** `[linear_attention × 3, full_attention × 1]` per block.  
4. **Model types:** `Qwen3_5ForConditionalGeneration` (dense), `Qwen3_5MoeForConditionalGeneration` (MoE).

### Implications for ExecuTorch (Updated May 2026)

- Upstream ExecuTorch now has **dense Qwen 3.5** example code at `examples/models/qwen3_5` and MoE paths with MLX/Metal backends.
- Software Mansion exports Qwen 3.5 `.pte` files using **ExecuTorch v1.2.0** ([HF repo](https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5)).
- **Runtime caveat:** RN ExecuTorch PR #1096 notes that Gated DeltaNet still requires **sequential prefill fallback** → **very slow prefill** on mobile. Token generation may be acceptable; first-response latency is the risk.

---

## 3. ExecuTorch & react-native-executorch Status

### Version Matrix (OfflineMate-relevant)

| Package version | npm status (May 2026) | Qwen 3.5 | Notes |
|-----------------|----------------------|----------|-------|
| **0.8.4** | ✅ Latest stable (OfflineMate pin) | ❌ | Current app dependency |
| **0.9.0** | ⏳ Merged to main; not on npm stable | ✅ 0.8B, 2B | Issue #935 closed; PR #1096 merged Apr 27, 2026 |
| **0.9.0-nightly-*** | ✅ On npm | ✅ | For early testing only |

### ExecuTorch Supported Models (upstream)

| Model Family | Status | Notes |
|--------------|--------|-------|
| Llama 3.2 | ✅ | 1B, 3B spinquant |
| Qwen 3 | ✅ | 0.6B, 1.7B, 4B (8da4w) |
| Qwen 2.5 | ✅ | 0.5B, 1.5B, 3B |
| Qwen 3.5 dense | ✅ | Export examples; XNNPACK mobile path via SM |
| Qwen 3.5 MoE | ⚠️ | MLX/Metal/CUDA; not phone-class sizes |
| Qwen 3.6 | ❌ | No small phone-class export |
| Gemma 4 E2B/E4B | ⚠️ | Text-only upstream ([PR #18695](https://github.com/pytorch/executorch/pull/18695)) |
| Phi-4-mini | ✅ | Listed in ExecuTorch README |

### Software Mansion Pre-Exports (react-native-executorch)

**Available on 0.8.4 (current OfflineMate):**

| Family | Sizes | Constants |
|--------|-------|-----------|
| Qwen 3 | 0.6B, 1.7B, 4B | `QWEN3_*_QUANTIZED` |
| Qwen 2.5 | 0.5B, 1.5B, 3B | `QWEN2_5_*` |
| SmolLM 2 | 135M, 360M, 1.7B | `SMOLLM2_*` |
| Llama 3.2 | 1B, 3B | `LLAMA3_2_*` |
| Hammer 2.1 | 0.5B, 1.5B, 3B | `HAMMER2_1_*` |
| Phi 4 Mini | 4B | `PHI4_MINI_*` |
| LFM 2.5 | 350M, 1.2B, VL | `LFM2_5_*`, `LFM2_VL_*` |

**Added in v0.9.0 (requires upgrade):**

| Family | Sizes | Constants |
|--------|-------|-----------|
| Qwen 3.5 | **0.8B, 2B** (no 4B yet) | `QWEN3_5_0_8B_QUANTIZED`, `QWEN3_5_2B_QUANTIZED` |
| Bielik v3.0 | 1.5B | `BIELIK_V3_0_1_5B`, `BIELIK_V3_0_1_5B_QUANTIZED` |

_Sources:_  
- [react-native-executorch PR #1096](https://github.com/software-mansion/react-native-executorch/pull/1096)  
- [Issue #935 — Qwen 3.5 support](https://github.com/software-mansion/react-native-executorch/issues/935)  
- [software-mansion/react-native-executorch-qwen-3.5](https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5)  
- [MODEL_REGISTRY docs (next)](https://docs.swmansion.com/react-native-executorch/docs/next/api-reference/variables/MODEL_REGISTRY)

---

## 4. Third-Party Model Vendor Research

### Moonshot AI (Kimi)

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **Kimi K2.6** (Apr 2026) | 1T total / 32B active MoE | ❌ | ❌ API/cloud ([Workers AI](https://developers.cloudflare.com/changelog/post/2026-04-20-kimi-k2-6-workers-ai/), [Kimi platform](https://platform.kimi.ai/docs/models)) |
| Kimi K2 (legacy) | Large MoE | ❌ | ❌ Deprecated May 2026 |

**Assessment:** Moonshot targets **agentic server/cloud** deployment. Open weights exist for research, but there is **no phone-class dense model** and **no ExecuTorch `.pte` export**. Kimi WebBridge runs agents locally via browser automation, not as an on-device LLM in React Native.

**OfflineMate action:** Not compatible. Do not plan tier mapping.

---

### DeepSeek

| Model | Params | Architecture base | Mobile fit | RN ExecuTorch |
|-------|--------|-------------------|------------|---------------|
| **DeepSeek-V3/V4** | 671B+ MoE | Custom MLA + MoE | ❌ | ❌ Server-only ([DeepSeek-V3 repo](https://github.com/deepseek-ai/DeepSeek-V3)) |
| **DeepSeek-R1** (full) | Very large | Custom | ❌ | ❌ |
| **R1-Distill-Qwen-1.5B** | 1.5B | Qwen 2 | ⚠️ Theoretically exportable | ❌ No SM pre-export |
| **R1-Distill-Qwen-7B** | 7B | Qwen 2 | ⚠️ Borderline RAM | ❌ No SM pre-export |
| **R1-Distill-Llama-8B** | 8B | Llama 3.1 | ⚠️ Full-tier RAM only | ⚠️ DIY export ([ExecuTorch #7981](https://github.com/pytorch/executorch/issues/7981)); tokenizer friction |

**Assessment:** DeepSeek's **brand value is in R1 reasoning**, but only **distill** variants are small enough for phones — and those are fine-tunes of **Qwen/Llama**, not native DeepSeek architecture. ExecuTorch documented export for **R1-Distill-Llama-8B** (Llama export path); Qwen-based distills could use the Qwen export pipeline, but Software Mansion has **not** published `.pte` bundles. Distill models also emit chain-of-thought tokens (`` blocks) that may need prompt/UX handling.

**OfflineMate action:** Track for pre-exports; do not DIY unless benchmarking proves clear quality gain over Qwen 3 0.6B/1.7B. Qwen 3 already covers the same architectural bases.

---

### MiniMax

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **MiniMax-M2** | 230B total / 10B active MoE | ❌ | ❌ ([GitHub](https://github.com/MiniMax-AI/MiniMax-M2)) |
| **MiniMax-M2.7** | Same class | ❌ Smallest MLX quant ~100 GB RAM | ❌ ([Local deploy guide](https://platform.minimax.io/docs/guides/local-deploy)) |

**Assessment:** "Mini" refers to **efficiency vs frontier closed models**, not phone deployment. Even aggressive 3-bit quants need **112 GB+ unified memory**. No ExecuTorch mobile path.

**OfflineMate action:** Not compatible.

---

### Zhipu AI (GLM)

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **GLM-4-9B-Chat** | 9B | ❌ Too large for Lite; tight for Standard | ❌ No export ([zai-org/GLM-4](https://github.com/zai-org/GLM-4)) |
| GLM-4-9B-Chat-1M | 9B, 1M context | ❌ | ❌ |

**Assessment:** GLM-4-9B is **Apache 2.0** and popular in China, but 9B exceeds OfflineMate Lite/Standard targets and there is **no** react-native-executorch integration. Would require custom ExecuTorch export (non-Llama architecture).

**OfflineMate action:** Not compatible without major export investment.

---

### Mistral AI

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **Mistral Small 3** | 24B | ❌ Desktop/GPU (16 GB+ VRAM quantized) | ❌ No pre-export ([Mistral announcement](https://mistral.ai/news/mistral-small-3/)) |
| Mistral Small 3.1 | 24B multimodal | ❌ | ❌ |

**Assessment:** Apache 2.0 and strong for **local server** agent workflows, but 24B is above OfflineMate Full-tier RAM envelope on mid-range phones.

**OfflineMate action:** Not compatible for tier mapping.

---

### Google (Gemma)

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **Gemma 4 E2B** | 2B effective (PLE architecture) | ⚠️ ~2.6 GB INT4 on phone (LiteRT-LM path) | ⚠️ Upstream ET yes; RN [#1062](https://github.com/software-mansion/react-native-executorch/issues/1062) open |
| **Gemma 4 E4B** | 4B effective | ⚠️ Larger; flagship phones | ⚠️ Same |

**Assessment:** Most promising **non-Qwen** watchlist item. ExecuTorch merged text-only Gemma 4 support. Software Mansion is working on RN export with **efficient memory management** (PLE layers load ~50% params only at first token). Separate **LiteRT-LM** `.litertlm` bundles exist for Android but use a **different runtime** than react-native-executorch.

**OfflineMate action:** Monitor #1062; do not adopt LiteRT-LM without a major runtime fork.

---

### Bielik (SpeakLeash — Polish)

| Model | Params | Mobile fit | RN ExecuTorch |
|-------|--------|------------|---------------|
| **Bielik v3.0 1.5B** | 1.5B | ✅ Standard-tier size | ✅ v0.9.0+ ([HF](https://huggingface.co/software-mansion/react-native-executorch-bielik-v3.0)) |

**Assessment:** Strong **Polish/CEE** regional model. Useful if OfflineMate adds locale-specific tiers; not a general English upgrade over Qwen 3.

**OfflineMate action:** Consider for Polish locale after v0.9.0 upgrade.

---

## 5. Alternative Deployment Paths (Non-ExecuTorch)

These options do **not** integrate with OfflineMate's current react-native-executorch stack:

| Path | Format | Vendors / models | Use case |
|------|--------|------------------|----------|
| vLLM / SGLang | Native | DeepSeek V3, MiniMax M2, Kimi (server) | Server-side |
| llama.cpp | GGUF | DeepSeek distill, Mistral, Qwen 3.5/3.6 community quants | On-device via **llama.rn** (different RN runtime) |
| LiteRT-LM | `.litertlm` | Gemma 4 E2B | Android NPU/GPU; not ExecuTorch |
| WebLLM (TVM) | MLC/TVM | Qwen 3.5 (early support) | In-browser WebGPU |
| Cloud API | REST | Kimi K2.6, DeepSeek API, MiniMax API | Online-only; conflicts with offline-first unless optional |

---

## 6. OfflineMate Integration Readiness

### Current Code

- `src/ai/qwen35-migration.ts`: `QWEN35_MIGRATION_FLAG = false`; target IDs defined (0.8B, 2B, 4B).
- `src/ai/model-registry.ts`: Tier specs include `futureUpgrade` for Qwen 3.5.
- `package.json`: `react-native-executorch@^0.8.4` — **below Qwen 3.5 requirement (v0.9.0)**.

### Remaining Blockers for Qwen 3.5

1. **npm stable v0.9.0** not published yet (nightly only).
2. **Experimental performance** — slow prefill on 0.8B/2B.
3. **No 4B export** — Full tier cannot migrate.
4. **Validation** — chat template, tokenizer, tier RAM envelopes on real devices.

### Prerequisites for Migration

1. Upgrade to `react-native-executorch@>=0.9.0` (and matching `react-native-executorch-expo-resource-fetcher`).
2. Benchmark prefill + decode latency on Lite/Standard target devices.
3. Wire `QWEN3_5_0_8B_QUANTIZED` / `QWEN3_5_2B_QUANTIZED` in `model-registry.ts`.
4. Keep Full tier on Qwen 3 4B (or Phi 4 Mini) until Qwen 3.5 4B ships.

---

## 7. Recommendations

1. **Keep** `QWEN35_MIGRATION_FLAG = false` until v0.9.0 stable + device benchmarks pass.
2. **Upgrade path:** When v0.9.0 lands on npm, spike Qwen 3.5 0.8B on Lite and 2B on Standard; measure prefill latency before enabling by default.
3. **Immediate wins on 0.8.4:**
   - **Qwen 3 0.6B** for Lite (better than SmolLM 135M).
   - **Hammer 2.1 1.5B** if tool-calling quality is the bottleneck.
   - **LFM 2.5 1.2B** for Standard instruction following.
   - **Phi 4 Mini 4B** as Full-tier alternate.
4. **Do not pursue** Moonshot Kimi, DeepSeek V3/V4, MiniMax M2, GLM-4-9B, or Mistral Small 3 for on-device tiers — all are wrong size or lack RN ExecuTorch exports.
5. **Track DeepSeek R1 distill** only if Software Mansion publishes pre-exports; otherwise Qwen 3 covers the same bases.
6. **Track Gemma 4** via [react-native-executorch #1062](https://github.com/software-mansion/react-native-executorch/issues/1062).
7. **Revisit quarterly** — Qwen 3.5 4B export, Gemma 4 RN export, and v0.9.0 stability.

---

## 8. References

### Qwen & ExecuTorch

- [QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5)
- [software-mansion/react-native-executorch-qwen-3.5](https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5)
- [RN ExecuTorch Issue #935 — Qwen 3.5](https://github.com/software-mansion/react-native-executorch/issues/935)
- [RN ExecuTorch PR #1096 — Qwen 3.5 + Bielik](https://github.com/software-mansion/react-native-executorch/pull/1096)
- [ExecuTorch Qwen 3.5 dense examples](https://github.com/pytorch/executorch/tree/main/examples/models/qwen3_5)
- [ExecuTorch LLM export](https://docs.pytorch.org/executorch/stable/llm/export-llm.html)

### Third-party vendors

- [Moonshot Kimi K2.6 on Workers AI](https://developers.cloudflare.com/changelog/post/2026-04-20-kimi-k2-6-workers-ai/)
- [Kimi API model list](https://platform.kimi.ai/docs/models)
- [DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3)
- [DeepSeek-R1-Distill-Qwen-1.5B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B)
- [ExecuTorch DeepSeek R1 Distill Llama 8B — Issue #7981](https://github.com/pytorch/executorch/issues/7981)
- [MiniMax-M2](https://github.com/MiniMax-AI/MiniMax-M2)
- [MiniMax local deploy guide](https://platform.minimax.io/docs/guides/local-deploy)
- [zai-org/GLM-4](https://github.com/zai-org/GLM-4)
- [Mistral Small 3](https://mistral.ai/news/mistral-small-3/)

### Other mobile paths

- [Gemma 4 RN ExecuTorch — Issue #1062](https://github.com/software-mansion/react-native-executorch/issues/1062)
- [ExecuTorch Gemma 4 — PR #18695](https://github.com/pytorch/executorch/pull/18695)
- [WebLLM Qwen 3.5 — Issue #778](https://github.com/mlc-ai/web-llm/issues/778)
- [React Native ExecuTorch MODEL_REGISTRY](https://docs.swmansion.com/react-native-executorch/docs/next/api-reference/variables/MODEL_REGISTRY)
- [software-mansion/react-native-executorch-bielik-v3.0](https://huggingface.co/software-mansion/react-native-executorch-bielik-v3.0)

---

## Appendix A: Tier Mapping (Qwen 3.5 — Planned)

When Qwen 3.5 migration is enabled in `qwen35-migration.ts`:

| Tier | Target model | RN constant (v0.9.0+) | Status |
|------|--------------|----------------------|--------|
| Lite | qwen3.5-0.8b | `QWEN3_5_0_8B_QUANTIZED` | ⚠️ Experimental; needs v0.9.0 |
| Standard | qwen3.5-2b | `QWEN3_5_2B_QUANTIZED` | ⚠️ Experimental; needs v0.9.0 |
| Full | qwen3.5-4b | — | ❌ Not exported yet |

## Appendix B: Tier Mapping (Non-Qwen alternatives on 0.8.4)

| Tier | Current primary | Alternates to evaluate |
|------|-----------------|------------------------|
| Lite | SmolLM2 135M | Qwen 3 0.6B, Hammer 2.1 0.5B, LFM 2.5 350M |
| Standard | Qwen 3 1.7B | Hammer 2.1 1.5B, LFM 2.5 1.2B, SmolLM2 1.7B |
| Full | Qwen 3 4B | Phi 4 Mini 4B, Llama 3.2 3B |
