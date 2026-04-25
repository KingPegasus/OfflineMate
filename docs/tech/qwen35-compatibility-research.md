# Qwen 3.5 Compatibility Research

**Document type:** Technical research  
**Author:** Senior tech lead research  
**Last updated:** April 2026  
**Status:** Qwen 3.5 is still not ready for OfflineMate's React Native ExecuTorch mobile runtime. Upstream server/WebGPU support is improving, but the app should stay on Qwen 3 for `.pte` mobile deployment.

---

## Executive Summary

Qwen 3.5 (Alibaba, Feb-Mar 2026) offers small models (0.8B, 2B, 4B, 9B) that look attractive for on-device use, but they introduce a **new hybrid architecture** (Gated DeltaNet + Gated Attention) that differs from Qwen 3. As of April 2026, **React Native ExecuTorch still does not expose Qwen 3.5 models**, and there are no Software Mansion pre-exported Qwen 3.5 `.pte` constants. Migration remains blocked for OfflineMate's current runtime.

The wider ecosystem has moved: MLC/WebLLM has early Qwen 3.5 work, FlashInfer/Megatron/server runtimes are adding Gated DeltaNet support, and ExecuTorch has MLX-backend work for a Qwen 3.5 MoE variant. None of that is equivalent to a stable XNNPACK/Core ML React Native ExecuTorch model for Android/iOS. Keep the migration flag disabled until either Software Mansion ships Qwen 3.5 `.pte` assets or PyTorch/Optimum documents a reproducible mobile export path that works with the React Native package version in use.

## April 2026 Compatibility Snapshot

| Family | Current mobile-runtime status | OfflineMate action |
|--------|-------------------------------|--------------------|
| Qwen 3 | Supported in ExecuTorch and React Native ExecuTorch for 0.6B, 1.7B, 4B | Keep as primary Qwen path |
| Qwen 3.5 | Server/WebGPU ecosystem improving; no React Native ExecuTorch pre-exports | Do not enable |
| Qwen 3.6 | Released with 35B-A3B and 27B models; supported by server runtimes and GGUF/llama.cpp paths, not RN ExecuTorch | Track only; not a phone model |
| Gemma 4 | Upstream ExecuTorch text-only support for E2B/E4B exists; React Native ExecuTorch export issue is open | Promising watchlist candidate |
| Kimi K2.x | Open weights are very large MoE models, e.g. 1T total / 32B active | Not suitable for phone runtime |
| MiniMax M2.x | Large MoE models with GGUF quants still tens/hundreds of GB | Not suitable for phone runtime |
| LFM 2.5 1.2B | Available in React Native ExecuTorch | Evaluate as Standard-tier alternate |

---

## 1. Qwen 3.5 Overview

### Release Timeline

| Date | Release |
|------|---------|
| Feb 16, 2026 | Flagship 397B-A17B |
| Feb 24, 2026 | Medium models (35B-A3B, 122B-A10B, 27B) |
| Mar 2, 2026 | Small models (0.8B, 2B, 4B, 9B) |

_Source: [QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5), [Lushbinary Developer Guide](https://www.lushbinary.com/blog/qwen-3-5-developer-guide-benchmarks-architecture-integration-2026/)_

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

_References:_  
- [Qwen/Qwen3.5-0.8B (Hugging Face)](https://huggingface.co/Qwen/Qwen3.5-0.8B)  
- [Office Chai – Alibaba Qwen 3.5 Small Models](https://officechai.com/ai/alibaba-qwen-3-5-0-8b-2b-4b-9b-benchmarks/)  
- [Awesome Agents – Qwen3.5-0.8B](https://awesomeagents.ai/models/qwen-3-5-0-8b/)

---

## 2. Architecture Compatibility Analysis

### Gated DeltaNet + Gated Attention

Qwen 3.5 small models use a **hybrid architecture** distinct from standard transformers and Qwen 3:

1. **Gated DeltaNet (linear attention)** — ~75% of layers  
   - Linear scaling in sequence length (vs quadratic).  
   - Config: `linear_conv_kernel_dim: 4`, separate Q/K (16 heads) and V (32 heads), `head_dim: 128`.  
   - More memory-efficient than traditional KV-cache.

2. **Gated Full Attention** — ~25% of layers  
   - GQA: 16 heads, 2 KV heads, `head_dim: 256`.  
   - Partial rotary factor 0.25, interleaved mRoPE.

3. **Layer pattern:** `[linear_attention × 3, full_attention × 1]` per block.

4. **Model types:** `Qwen3_5ForConditionalGeneration` (dense), `Qwen3_5MoeForConditionalGeneration` (MoE).

_Source: [mlc-ai/web-llm #778](https://github.com/mlc-ai/web-llm/issues/778), [Qwen 3.5 Explained – Medium](https://medium.com/data-science-in-your-pocket/qwen-3-5-explained-architecture-upgrades-over-qwen-3-benchmarks-and-real-world-use-cases-af38b01e9888)_

### Implications for ExecuTorch

- ExecuTorch export pipeline today targets **standard transformer** models (Llama-style, Qwen 2.5, Qwen 3).
- Gated DeltaNet introduces **custom ops** and data flow that require:
  - TVM compiler / custom lowering, or  
  - New ExecuTorch op implementations, or  
  - Mapping to existing ExecuTorch primitives (if feasible).
- The mlc-ai/web-llm issue states that Qwen3.5 “**requires TVM compiler support**” for Gated DeltaNet.
- No public ExecuTorch export examples for Qwen 3.5 were found as of March 2026.

---

## 3. ExecuTorch & react-native-executorch Status

### ExecuTorch Supported Models

| Model Family | Status | Notes |
|--------------|--------|-------|
| Llama 3.2 | ✅ | 1B, 3B spinquant |
| Qwen 3 | ✅ | 0.6B, 1.7B, 4B (8da4w quantized) |
| Qwen 2.5 | ✅ | PR #8355, Feb 2025 |
| Qwen 3.5 | ⚠️ | Some upstream/backend work exists, but no stable React Native ExecuTorch mobile export |
| Qwen 3.6 | ❌ | No small phone-class React Native ExecuTorch export |

_Sources:_  
- [ExecuTorch LLM export](https://docs.pytorch.org/executorch/stable/llm/export-llm.html)  
- [Add Qwen 2.5 – pytorch/executorch PR #8355](https://github.com/pytorch/executorch/pull/8355)  
- [Add Qwen3 0.6B, 1.7B, 4B – pytorch/executorch PR #10539](https://github.com/pytorch/executorch/pull/10539)

### Software Mansion Pre-Exports

- **react-native-executorch** provides Qwen **3** (0.6B, 1.7B, 4B) and Qwen **2.5** (0.5B, 1.5B, 3B), not Qwen 3.5.
- No `react-native-executorch-qwen-3.5`, `QWEN3_5_*`, `QWEN3_6_*`, or equivalent built-in constants were found.
- React Native ExecuTorch also exposes practical alternatives that are already mobile-package-compatible: Hammer 2.1 (0.5B/1.5B/3B), Phi 4 Mini 4B, and LFM 2.5 1.2B.

_Source: [software-mansion/react-native-executorch-qwen-3](https://huggingface.co/software-mansion/react-native-executorch-qwen-3)_

### Hugging Face Optimum

- `optimum-executorch` supports broader model families.  
- Qwen 3.5 support would require upstream Optimum + ExecuTorch changes.

_Source: [Optimum ExecuTorch export](https://huggingface.co/docs/optimum-executorch/guides/export)_

---

## 4. Alternative Deployment Paths (Non-ExecuTorch)

These options do **not** integrate with OfflineMate’s current react-native-executorch stack:

| Path | Format | Use Case |
|------|--------|----------|
| vLLM | Native | Server-side; not on-device |
| SGLang | Native | Server-side; not on-device |
| llama.cpp | GGUF | On-device; requires different RN runtime (e.g. llama.rn) |
| WebLLM (TVM) | MLC/TVM | In-browser; architecture support requested but not yet implemented |

- **GGUF:** Qwen 3.5 GGUF models may appear from the community; would need a GGUF-based runtime instead of ExecuTorch.
- **WebLLM:** [Issue #778](https://github.com/mlc-ai/web-llm/issues/778) now shows early Qwen3.5 support work, including custom model config/WASM paths. This is useful signal for architecture feasibility, but it does not help OfflineMate until the app adopts a WebGPU/MLC runtime.
- **Qwen 3.6:** Official materials list vLLM, SGLang, KTransformers, llama.cpp/GGUF, and MLX paths. These are server/desktop-oriented for current Qwen 3.6 sizes, not React Native ExecuTorch mobile exports.

---

## 5. OfflineMate Integration Readiness

### Current Code

- `src/ai/qwen35-migration.ts`: `QWEN35_MIGRATION_FLAG = false`; target IDs defined (0.8B, 2B, 4B).
- `src/ai/model-registry.ts`: Tier specs include `futureUpgrade` for Qwen 3.5.
- Model manager and LLM engine use `getTierSpec(tier).primary`; no Qwen 3.5 runtime wired.

### Blockers

1. **No ExecuTorch export** for Qwen 3.5.
2. **No Software Mansion pre-exports** for react-native-executorch.
3. **Architecture mismatch** — Gated DeltaNet requires new export/op support.

### Prerequisites for Migration

1. ExecuTorch or Optimum adds Qwen3.5 export support (or third-party export guide).  
2. Software Mansion releases `.pte` models for react-native-executorch (or equivalent).  
3. Validation of XNNPACK/Core ML execution and tokenizer behavior (regex, chat template) on mobile.

---

## 6. Recommendations

1. **Do not enable** `QWEN35_MIGRATION_FLAG` until ExecuTorch/Qwen 3.5 support is confirmed.
2. **Monitor**:
   - [pytorch/executorch](https://github.com/pytorch/executorch) for Qwen 3.5–related issues/PRs
   - [Software Mansion react-native-executorch](https://github.com/software-mansion/react-native-executorch)
   - [Hugging Face Optimum ExecuTorch](https://huggingface.co/docs/optimum-executorch/)
   - [QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5) for official export examples
3. **Evaluate Qwen 3 0.6B** as an immediate upgrade for Lite tier; it is already supported in react-native-executorch and may provide better quality than SmolLM 135M.
4. **Evaluate built-in alternatives first**: Hammer 2.1 0.5B/1.5B for tool calling, LFM 2.5 1.2B for Standard-tier instruction following, and Phi 4 Mini 4B for Full-tier reasoning.
5. **Track Gemma 4 closely**: upstream ExecuTorch E2B/E4B text-only support is promising, but React Native ExecuTorch export work is still open.
6. **Revisit Qwen 3.5/3.6** quarterly; Qwen 3.5 small models remain candidates only after mobile `.pte` export/runtime support lands, while Qwen 3.6 is currently too large for OfflineMate phone tiers.

---

## 7. References

### Official

- [QwenLM/Qwen3.5 (GitHub)](https://github.com/QwenLM/Qwen3.5)
- [QwenLM/Qwen3.6 (GitHub)](https://github.com/QwenLM/Qwen3.6)
- [Qwen/Qwen3.5-0.8B (Hugging Face)](https://huggingface.co/Qwen/Qwen3.5-0.8B)
- [Qwen 3.5 Blog – Native Multimodal Agents](https://qwen.ai/blog?id=qwen3.5)

### Architecture & Benchmarks

- [Qwen 3.5 Developer Guide – Lushbinary](https://www.lushbinary.com/blog/qwen-3-5-developer-guide-benchmarks-architecture-integration-2026/)
- [Qwen 3.5 Explained – Medium](https://medium.com/data-science-in-your-pocket/qwen-3-5-explained-architecture-upgrades-over-qwen-3-benchmarks-and-real-world-use-cases-af38b01e9888)
- [The Compression Problem: Qwen 3.5 Small & Edge AI – Medium](https://medium.com/@AdithyaGiridharan/the-compression-problem-how-qwen-3-5-small-rewrites-the-rules-of-edge-ai-3062e8a9d5e8)
- [Alibaba Qwen 3.5 Small Model Series – Office Chai](https://officechai.com/ai/alibaba-qwen-3-5-0-8b-2b-4b-9b-benchmarks/)

### ExecuTorch & Mobile

- [ExecuTorch LLM Export](https://docs.pytorch.org/executorch/stable/llm/export-llm.html)
- [Add Qwen 2.5 – pytorch/executorch PR #8355](https://github.com/pytorch/executorch/pull/8355)
- [Add Qwen3 0.6B, 1.7B, 4B – pytorch/executorch PR #10539](https://github.com/pytorch/executorch/pull/10539)
- [How to run Qwen using Executorch – Issue #7467](https://github.com/pytorch/executorch/issues/7467)

### Other Runtimes

- [WebLLM Qwen3.5 support request – mlc-ai/web-llm #778](https://github.com/mlc-ai/web-llm/issues/778)
- [React Native ExecuTorch](https://docs.swmansion.com/react-native-executorch/)
- [React Native ExecuTorch available models](https://mintlify.com/software-mansion/react-native-executorch/llm/available-models)
- [Software Mansion Qwen 3 models](https://huggingface.co/software-mansion/react-native-executorch-qwen-3)
- [Gemma4 support issue - react-native-executorch #1062](https://github.com/software-mansion/react-native-executorch/issues/1062)

---

## Appendix: Tier Mapping (Planned)

When Qwen 3.5 becomes compatible, the intended mapping in `qwen35-migration.ts` is:

| Tier | Target Model | Notes |
|------|--------------|-------|
| Lite | qwen3.5-0.8b | ~0.5 GB 4-bit; edge-focused |
| Standard | qwen3.5-2b | Mid-tier balance |
| Full | qwen3.5-4b | Higher capability |

These remain placeholders until export and runtime support exist.
