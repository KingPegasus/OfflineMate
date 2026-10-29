# On-Device Model Compatibility Research

**Document type:** Technical research  
**Last updated:** October 29, 2026 (rechecked against npm, the installed package, Hugging Face, and vendor announcements)  
**Scope:** Which current small LLMs OfflineMate can run through `react-native-executorch`, the Qwen 3.5 migration, newer model families (LFM3, MiniCPM5, Gemma 4 E4B, Qwen 3.6–3.8), and vendors that remain server-only.  
**Status:** OfflineMate now pins **`react-native-executorch@^0.11.0`** (released Oct 27, 2026) on **Expo SDK 57 / RN 0.86.3**, still through the `legacy` entry point. 0.11.0 adds **MiniCPM5 2B** and **LFM 2.5 2.6B**; both are wired as alternates. **Qwen 3.5 4B**, **Gemma 4 E4B**, and **LFM3** still have no ExecuTorch exports.

---

## Executive Summary

- **Runtime:** react-native-executorch went 0.9.2 → 0.10.x → **0.11.0**. 0.10.6 added RN 0.87/0.88 + Expo SDK 58 support and allows `react-native-worklets` 0.13, which **removes the SDK 58 upgrade blocker** recorded in the 0.4.0 changelog. 0.11.0 moves LLM generation to TypeScript runners (llama.cpp-style sampler, constrained decoding), re-exports LLMs with up to **16K context**, and adds `enable_thinking` chat-template support.
- **New phone-tier LLMs since the May recheck:** **MiniCPM5 2B** (OpenBMB, 0.11.0), **LFM 2.5 2.6B** (Liquid AI, 0.11.0), plus **Gemma 4 E2B Omni** (vision + audio).
- **Qwen 3.5:** 0.8B and 2B exports exist but are **legacy-only** — they are not in the new `models.llm` registry in 0.10 or 0.11, and the legacy API is deprecated. The 0.8B 8da4w file is **~1.4 GB** (large 248K-token vocabulary), so it is not a Lite-tier fit. 4B/9B are still not exported.
- **Newest families with no ExecuTorch path yet:** **LFM3** (Oct 27, 2026; GGUF/MLX/ONNX only), **Gemma 4 E4B**, and **Qwen 3.6/3.7/3.8** (server-class sizes only).
- **Server-only vendors** (Moonshot Kimi, DeepSeek V3/V4, MiniMax M2, Zhipu GLM, Mistral Small) are unchanged: not practical for phone tiers.

---

## October 2026 Compatibility Snapshot

| Family | Mobile-runtime status (RNE 0.11.0) | In OfflineMate registry | Action |
|--------|-----------------------------------|-------------------------|--------|
| **Gemma 4 E2B** | ✅ XNNPACK / Vulkan / MLX; re-exported at v0.11.0 | ✅ Standard **primary** | Keep |
| **Gemma 4 E2B Omni** | ✅ New API only (`GEMMA4_OMNI_E2B`); legacy has `gemma4_e2b_multimodal` | ❌ | Candidate for image/voice input features |
| **Gemma 4 E4B** | ❌ Not exported | ❌ | Track |
| **MiniCPM5 2B** | ✅ New in 0.11.0 (new API only), 8K context, ~1.3 GB | ✅ Standard alternate | **Benchmark on device** vs Gemma 4 E2B |
| **LFM 2.5 2.6B** | ✅ New in 0.11.0 (new API only), ~1.7 GB | ✅ Full alternate | **Benchmark on device** vs Qwen 3 4B |
| **LFM 2.5 350M** | ✅ Legacy + new API, ~435 MB | ✅ Lite alternate | Benchmark vs SmolLM2 360M |
| **LFM 2.5 1.2B** | ✅ | ❌ | Standard candidate |
| **LFM3 (1.7B, VL/Omni/Audio 2B)** | ❌ GGUF/MLX/ONNX only; no `.pte` | ❌ | Track — likely next SM export given LFM2 history |
| **Qwen 3** (0.6B, 1.7B, 4B) | ✅ | ✅ 1.7B (Standard alt), 4B (Full primary) | Keep |
| **Qwen 3.5** (0.8B, 2B) | ⚠️ Legacy-only exports (v0.9.0 assets); slow prefill | ✅ 2B Standard alt | Keep 2B as test alternate; **do not** add 0.8B to Lite (~1.4 GB) |
| **Qwen 3.5 4B / 9B** | ❌ Not exported | ❌ | Full tier stays on Qwen 3 4B |
| **Qwen 3.6 / 3.7 / 3.8** | ❌ 27B+ dense, MoE, or API-only | ❌ | Not phone-class |
| **Phi 4 Mini 3.8B** | ✅ 8da4w | ❌ | Full candidate |
| **Hammer 2.1** (0.5B, 1.5B, 3B) | ✅ | ❌ | Tool-calling candidate for the planner |
| **Llama 3.2** (1B, 3B) | ✅ | ✅ | Keep; no small Llama 4 exists |
| **SmolLM2** (135M, 360M, 1.7B) | ✅ | ✅ | Keep; SmolLM3 3B has no `.pte` |
| **Bielik v3 1.5B** | ✅ | ❌ | Polish locale only |
| **Kimi, DeepSeek V3/V4, MiniMax M2, GLM, Mistral Small** | ❌ | ❌ | Not phone-class (see §5) |

---

## 1. react-native-executorch Release History (since May 2026)

| Version | Date | Relevant changes |
|---------|------|------------------|
| 0.9.2 | Jun 2026 | Sampling + VLM cache fixes; no new LLMs |
| 0.10.0–0.10.5 | Jul–Sep 2026 | New typed `models` registry; old API moved to `react-native-executorch/legacy` (OfflineMate migrated in 0.4.0) |
| **0.10.6** | Oct 19, 2026 | **RN 0.87/0.88 + Expo SDK 58**, worklets 0.13 allowed, Vulkan crash fix on Adreno 720/740, `react-native-blob-util >=0.24.11` required |
| 0.10.7 | Oct 21, 2026 | TTS number reading fix |
| **0.11.0** | Oct 27, 2026 | TS LLM runners + llama.cpp-style sampler with constrained decoding; LLMs re-exported with up to 16K context; `enable_thinking`; **MiniCPM5 2B**; LFM 2.5 2.6B; `createVectorStore`; LFM2.5-ColBERT-350M; per-device [benchmarks](https://docs.swmansion.com/react-native-executorch/docs/benchmarks); unquantized XNNPACK LLM variants removed |

**Breaking changes in 0.11.0 that matter to OfflineMate:** none on the legacy path. The chat/generation APIs are unchanged; only the `@experimental` runner API changed. Legacy model constants still point at the v0.9.0 Hugging Face assets.

### Legacy vs new API

OfflineMate imports everything from `react-native-executorch/legacy` (`LLMModule`, `TextEmbeddingsModule`, `initExecutorch`). The legacy API is **deprecated** and will be removed in a future release (1.0.0 nightlies have started). Consequences:

- New models (MiniCPM5, LFM 2.5 2.6B, Gemma 4 Omni) are only in the new registry. OfflineMate references their v0.11.0 asset URLs directly in `src/ai/model-registry.ts`.
- The 0.11 text exports expose the standard ExecuTorch LLM interface (`get_max_context_len`, `get_eos_ids`, `use_kv_cache`, `forward(tokens, pos)`), which the legacy native runner also uses, so they are expected to load through `LLMModule`. **This must be confirmed on a device.**
- Qwen 3.5 exists only in legacy. If legacy is removed before SM adds Qwen 3.5 to the new registry, the Qwen 3.5 2B alternate goes with it.
- **Recommended follow-up:** migrate `src/ai/llm-engine.ts` and `src/context/embeddings.ts` to the new API before 1.0.0. That also unlocks the 16K-context re-exports, the new sampler, and constrained decoding (useful for the planner's JSON output).

### Compatibility with the OfflineMate stack

| Requirement | OfflineMate | RNE 0.11.0 |
|-------------|-------------|------------|
| React Native | 0.86.3 | ✅ (peer `*`; 0.87/0.88 supported since 0.10.6) |
| Expo SDK | 57 | ✅ (SDK 58 supported since 0.10.6) |
| `react-native-worklets` | 0.10.1 | ✅ `>=0.10.0 <0.14.0` |
| `react-native-blob-util` | 0.24.11 (transitive) | ✅ `>=0.24.11` |
| Expo resource fetcher | `react-native-executorch-expo-resource-fetcher@0.11.0` | ✅ |

---

## 2. Newly Available Models (in the OfflineMate registry)

### MiniCPM5 2B (OpenBMB) — Standard alternate

- Released alongside RNE 0.11.0 (late Oct 2026). OpenBMB claims best-in-class results at 2B and wins over some 4B models on coding/agent tasks. These are **vendor claims** that have not been independently verified.
- Export: XNNPACK 8da4w (~1.3 GB `.pte`), MLX int4 on iOS. 8K context window.
- Assets: [react-native-executorch-minicpm-5](https://huggingface.co/software-mansion/react-native-executorch-minicpm-5) at `resolve/v0.11.0`.
- Supports `enable_thinking` in its chat template, but the legacy runner does not pass that option, so thinking stays at the template default.

### LFM 2.5 2.6B (Liquid AI) — Full alternate

- Hybrid Liquid architecture (low memory bandwidth, fast decode), aimed at instruction following and agent workloads.
- Export: XNNPACK 8da4w (~1.7 GB), MLX int4. That is smaller than Qwen 3 4B (~2 GB), so it may be a faster Full-tier option.
- Assets: [react-native-executorch-lfm-2.5](https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5) `2_6b/` at `resolve/v0.11.0`.

### LFM 2.5 350M (Liquid AI) — Lite alternate

- Legacy constant `LFM2_5_350M_QUANTIZED` (v0.9.0 assets, ~435 MB 8da4w).
- Larger download than SmolLM2 360M (~200 MB). Liquid positions it for fast first-token response and instruction following.

---

## 3. Qwen 3.5 Status

Qwen 3.5 small models (0.8B/2B/4B/9B, Mar 2026, Apache 2.0) use a hybrid **Gated DeltaNet + Gated Attention** architecture (3 linear-attention layers per full-attention layer). Software Mansion shipped 0.8B and 2B exports in RNE 0.9.0 ([PR #1096](https://github.com/software-mansion/react-native-executorch/pull/1096)), with a known caveat: Gated DeltaNet requires a **sequential prefill fallback**, which makes the first token slow.

October 2026 findings:

| Item | Finding |
|------|---------|
| 0.8B export size | **1,412,986,112 bytes (~1.35 GiB)** for `qwen_3_5_0_8b_xnnpack_8da4w.pte`. That is about the same as the 2B and roughly 4× the Lite budget, because the 248K-token embedding table dominates. |
| New-API registry | Qwen 3.5 is **absent** from `models.llm` in 0.10.x and 0.11.0. It appears only in `legacy/src/constants/modelRegistry.ts`. |
| Re-export | Not re-exported at v0.11.0 (assets remain at v0.9.0) |
| 4B / 9B | Not exported |

**Decision:** Keep Qwen 3.5 2B as a Standard test alternate. Do **not** add 0.8B to Lite. Keep `QWEN35_MIGRATION_FLAG = false` (`src/ai/qwen35-migration.ts`). Given the slow prefill and the legacy-only status, Qwen 3.5 is no longer the most likely next primary. Gemma 4 E2B already holds Standard, and MiniCPM5 2B / LFM 2.5 2.6B are better-supported upgrade candidates.

---

## 4. Newest Families Without an ExecuTorch Path

### Liquid AI LFM3 (Oct 27, 2026)

- Six models on a shared 1.7B/2B backbone: **LFM3-1.7B** (text, 256K context, ~1 GB at 4-bit), LFM3-VL-2B, LFM3-Omni-2B, LFM3-Audio-2B, d1-2B, d1-Omni-2B.
- Liquid claims LFM3-1.7B beats LFM 2.5 2.6B with 35% fewer parameters (vendor-reported). Target devices include Galaxy S26 Ultra and OnePlus 15.
- Published formats: GGUF, MLX, ONNX, FP8/NVFP4. **No ExecuTorch `.pte`** from Liquid or Software Mansion yet.
- Liquid has used ExecuTorch for LFM2 deployment and SM has exported every LFM 2.x release, so an RNE export is likely. **Top tracking priority**, since it could replace both LFM 2.5 alternates with a smaller, stronger model.

### Gemma 4 E4B (Google, Apr 2026)

- On-device "reasoning" sibling of E2B; reports put it at ~4 GB storage and ~12 GB RAM. It runs on Android through AICore / LiteRT-LM, not ExecuTorch.
- No RNE export. Upstream ExecuTorch has text-only export code. Full-tier candidate if SM ships it.

### Qwen 3.6 / 3.7 / 3.8 (Alibaba, Apr–Aug 2026)

- 3.6: 27B dense and 35B-A3B MoE. 3.7: Max/Plus closed, API-first. 3.8: 27B dense, 2.4T-A95B MoE, "Flash-Next" (Aug 2026). **No sub-4B models**, so none are phone-tier.

### Others checked

| Model | Status |
|-------|--------|
| SmolLM3 3B (Hugging Face) | Open, ONNX available; no `.pte` |
| Phi-5 / small Llama 4 | Not released; Phi 4 Mini and Llama 3.2 remain the newest phone-class sizes |
| NVIDIA Nemotron 3.5 Bolt E4B | Local NVIDIA hardware target; not a phone model |
| MiniCPM-V 4.7 1B (OpenBMB) | GGUF only; vision model |
| Microsoft FrogNano-4B | Released Sep 2026; no mobile export |

---

## 5. Server-Only Vendors (unchanged)

| Vendor | Models | Why not on-device |
|--------|--------|-------------------|
| Moonshot | Kimi K2.x / K2.6 | 1T MoE / 32B active; API/cloud |
| DeepSeek | V3/V4, R1 | 671B+ MoE. R1 distills (1.5B–8B) are Qwen/Llama fine-tunes with no SM exports and add chain-of-thought output that would need UX handling |
| MiniMax | M2 / M2.7 | 230B MoE; smallest quant needs ~100 GB+ |
| Zhipu | GLM-4-9B | 9B, no ExecuTorch export path |
| Mistral | Small 3 / 3.1 (24B) | Too large for phone RAM |

---

## 6. Alternative Runtimes (not integrated)

These could reach models that ExecuTorch cannot, at the cost of a second native LLM runtime:

| Path | Format | Would unlock |
|------|--------|--------------|
| **llama.rn** (llama.cpp) | GGUF | LFM3, Gemma 4 E4B, SmolLM3, Qwen 3.5 4B community quants — almost every new model on day one |
| LiteRT-LM / AICore | `.litertlm` | Gemma 4 E2B/E4B with Android NPU/GPU acceleration |
| ONNX Runtime GenAI | ONNX | LFM3, SmolLM3 |

**Recommendation:** Stay on ExecuTorch for now. OfflineMate already uses it for embeddings and LLMs, and SM has generally shipped exports for the families that matter within weeks of their release (for example, Gemma 4 and MiniCPM5). Reconsider llama.rn only if a must-have model (for example LFM3 or Gemma 4 E4B) is still unexported a quarter after release.

---

## 7. Recommendations

1. **Benchmark the new alternates on real devices** (prefill latency, tokens/s, peak RAM, JSON-plan validity): MiniCPM5 2B vs Gemma 4 E2B (Standard), LFM 2.5 2.6B vs Qwen 3 4B (Full), LFM 2.5 350M vs SmolLM2 (Lite). SM's per-device [benchmarks page](https://docs.swmansion.com/react-native-executorch/docs/benchmarks) is a useful baseline.
2. **Plan the move off `legacy`** before RNE 1.0.0. That unlocks 16K-context exports, constrained decoding for planner JSON, `enable_thinking` control, and Gemma 4 Omni.
3. **Expo SDK 58 is now unblocked** (RNE ≥0.10.6 accepts worklets 0.13).
4. **Track:** LFM3 `.pte` export (highest priority), Gemma 4 E4B, Qwen 3.5 in the new registry, Qwen 3.5 4B.
5. **Do not** add Qwen 3.5 0.8B to Lite unless a smaller export appears.
6. **Other built-in candidates not yet wired:** Phi 4 Mini (Full), Hammer 2.1 1.5B (planner/tool calling), LFM 2.5 1.2B (Standard), Qwen 3 0.6B (Lite, ~400 MB).

---

## 8. References

### react-native-executorch

- [v0.11.0 release](https://github.com/software-mansion/react-native-executorch/releases/tag/v0.11.0)
- [v0.10.6 release (SDK 58 / RN 0.88)](https://github.com/software-mansion/react-native-executorch/releases/tag/v0.10.6)
- [LLM chat & generation docs](https://docs.swmansion.com/react-native-executorch/docs/extensions/llm-chat-and-generation)
- [Benchmarks](https://docs.swmansion.com/react-native-executorch/docs/benchmarks)
- [Software Mansion on Hugging Face](https://huggingface.co/software-mansion)
- [react-native-executorch-minicpm-5](https://huggingface.co/software-mansion/react-native-executorch-minicpm-5)
- [react-native-executorch-lfm-2.5](https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5)
- [react-native-executorch-qwen-3.5](https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5)
- [react-native-executorch-gemma-4](https://huggingface.co/software-mansion/react-native-executorch-gemma-4)
- [PR #1096 — Qwen 3.5 + Bielik](https://github.com/software-mansion/react-native-executorch/pull/1096)

### Model families

- [Liquid AI LFM3 collection](https://huggingface.co/LiquidAI) · [LFM3 launch coverage](https://aiweekly.co/alerts/liquid-ai-opens-six-model-lfm3-family-at-256k-context) · [LFM3-1.7B overview](https://www.mindstudio.ai/blog/liquidai-lfm3-1-7b-edge-model)
- [Liquid AI on ExecuTorch (LFM2)](https://www.liquid.ai/blog/how-liquid-ai-uses-executorch-to-power-efficient-flexible-on-device-intelligence)
- [Gemma 4 on Android (InfoQ)](https://infoq.com/news/2026/04/gemma-4-android-ai-inference) · [AICore Developer Preview](https://android-developers.googleblog.com/2026/03/AI-Core-Developer-Preview)
- [QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5) · [Qwen on Hugging Face](https://huggingface.co/Qwen) · [Qwen models guide (mid-2026)](https://insiderllm.com/guides/qwen-models-guide/)
- [ExecuTorch Qwen 3.5 examples](https://github.com/pytorch/executorch/tree/main/examples/models/qwen3_5) · [ExecuTorch Gemma 4 PR #18695](https://github.com/pytorch/executorch/pull/18695)
- [October 2026 LLM release timeline](https://llmgateway.io/timeline)

### Server-only vendors

- [Kimi K2.6 on Workers AI](https://developers.cloudflare.com/changelog/post/2026-04-20-kimi-k2-6-workers-ai/) · [DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3) · [MiniMax-M2](https://github.com/MiniMax-AI/MiniMax-M2) · [zai-org/GLM-4](https://github.com/zai-org/GLM-4) · [Mistral Small 3](https://mistral.ai/news/mistral-small-3/)

---

## Appendix: Current Tier Mapping (registry as of 0.5.0)

| Tier | Primary | Alternates (Settings) | Watching |
|------|---------|-----------------------|----------|
| Lite | SmolLM2 135M | SmolLM2 360M, **LFM 2.5 350M** | LFM3 (if a sub-1B variant ships), Qwen 3 0.6B |
| Standard | Gemma 4 E2B | Qwen 3 1.7B, Qwen 3.5 2B, **MiniCPM5 2B**, SmolLM2 1.7B, Llama 3.2 1B | LFM3-1.7B |
| Full | Qwen 3 4B | **LFM 2.5 2.6B**, Llama 3.2 3B | Gemma 4 E4B, Qwen 3.5 4B, Phi 4 Mini |
