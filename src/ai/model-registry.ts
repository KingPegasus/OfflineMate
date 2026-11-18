import type { ModelTier } from "@/types/assistant";
import {
  LLAMA3_2_1B_SPINQUANT,
  LLAMA3_2_3B_SPINQUANT,
  LFM2_5_350M_QUANTIZED,
  LFM2_5_VL_1_6B_QUANTIZED,
  LFM2_5_VL_450M_QUANTIZED,
  QWEN3_1_7B_QUANTIZED,
  QWEN3_4B_QUANTIZED,
  QWEN3_5_2B_QUANTIZED,
  SMOLLM2_1_135M_QUANTIZED,
  SMOLLM2_1_1_7B_QUANTIZED,
  SMOLLM2_1_360M_QUANTIZED,
  models,
} from "react-native-executorch/legacy";

/** Extra input types a model accepts besides text. */
export type ModelCapability = "vision" | "audio";

/** Sampling settings a model card recommends; applied on top of the tier defaults. */
export interface ModelGenerationOverrides {
  temperature?: number;
  topp?: number;
  minP?: number;
  repetitionPenalty?: number;
}

export interface ModelSpec {
  id: string;
  provider: "qwen" | "smollm" | "llama" | "gemma" | "lfm" | "minicpm";
  family: string;
  size: string;
  quantization: "8da4w" | "int4";
  downloadUrl: string;
  /** Size of the .pte file in MiB, as served by Hugging Face (x-linked-size / 1048576). */
  estimatedSizeMb: number;
  runtime: {
    modelSource: string;
    tokenizerSource: string;
    tokenizerConfigSource: string;
  };
  /** Vision models take an image from the gallery alongside the prompt. */
  capabilities?: readonly ModelCapability[];
  /** Required by models exported with an audio encoder (Gemma 4 multimodal), even when only images are used. */
  audioConfig?: { samplesPerBlock: number; tokensPerBlock: number };
  generationOverrides?: ModelGenerationOverrides;
}

export interface TierSpec {
  key: ModelTier;
  /** Technical tier name (website, store listing, Advanced in Settings). */
  name: "Lite" | "Standard" | "Full";
  /** Plain-language name shown in the app. */
  label: "Light" | "Balanced" | "Smartest";
  /** One everyday sentence on the trade-off, for onboarding and Settings. */
  summary: string;
  targetRam: string;
  estimatedDownload: string;
  primary: ModelSpec;
  alternates: ModelSpec[];
  futureUpgrade?: {
    id: string;
    note: string;
  };
}

// MiniCPM5 and LFM 2.5 2.6B are only published for the new (non-legacy) API in
// react-native-executorch 0.11, so their v0.11.0 assets are referenced directly.
const RNE_HF_PREFIX = "https://huggingface.co/software-mansion/react-native-executorch";
const MINICPM5_BASE_URL = `${RNE_HF_PREFIX}-minicpm-5/resolve/v0.11.0`;
const LFM2_5_BASE_URL = `${RNE_HF_PREFIX}-lfm-2.5/resolve/v0.11.0`;

const smol135m: ModelSpec = {
  id: "smollm2-135m",
  provider: "smollm",
  family: "SmolLM2",
  size: "135M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-smolLm-2",
  estimatedSizeMb: 534,
  runtime: SMOLLM2_1_135M_QUANTIZED,
};

const smol360m: ModelSpec = {
  id: "smollm2-360m",
  provider: "smollm",
  family: "SmolLM2",
  size: "360M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-smolLm-2",
  estimatedSizeMb: 1300,
  runtime: SMOLLM2_1_360M_QUANTIZED,
};

const smol17b: ModelSpec = {
  id: "smollm2-1.7b",
  provider: "smollm",
  family: "SmolLM2",
  size: "1.7B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-smolLm-2",
  estimatedSizeMb: 970,
  runtime: SMOLLM2_1_1_7B_QUANTIZED,
};

const lfm25_350m: ModelSpec = {
  id: "lfm2.5-350m",
  provider: "lfm",
  family: "LFM 2.5",
  size: "350M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5",
  estimatedSizeMb: 432,
  runtime: LFM2_5_350M_QUANTIZED,
};

// Vision-language models: the chat composer can attach a gallery image when one is active.
const lfm25_vl_450m: ModelSpec = {
  id: "lfm2.5-vl-450m",
  provider: "lfm",
  family: "LFM 2.5 VL",
  size: "450M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5",
  estimatedSizeMb: 619,
  runtime: LFM2_5_VL_450M_QUANTIZED,
  capabilities: LFM2_5_VL_450M_QUANTIZED.capabilities,
  generationOverrides: LFM2_5_VL_450M_QUANTIZED.generationConfig,
};

const lfm25_vl_1_6b: ModelSpec = {
  id: "lfm2.5-vl-1.6b",
  provider: "lfm",
  family: "LFM 2.5 VL",
  size: "1.6B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5",
  estimatedSizeMb: 2315,
  runtime: LFM2_5_VL_1_6B_QUANTIZED,
  capabilities: LFM2_5_VL_1_6B_QUANTIZED.capabilities,
  generationOverrides: LFM2_5_VL_1_6B_QUANTIZED.generationConfig,
};

const qwen17b: ModelSpec = {
  id: "qwen3-1.7b",
  provider: "qwen",
  family: "Qwen 3",
  size: "1.7B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3",
  estimatedSizeMb: 1243,
  runtime: QWEN3_1_7B_QUANTIZED,
};

const qwen4b: ModelSpec = {
  id: "qwen3-4b",
  provider: "qwen",
  family: "Qwen 3",
  size: "4B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3",
  estimatedSizeMb: 2557,
  runtime: QWEN3_4B_QUANTIZED,
};

const llama1b: ModelSpec = {
  id: "llama3.2-1b",
  provider: "llama",
  family: "Llama 3.2",
  size: "1B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2",
  estimatedSizeMb: 1083,
  runtime: LLAMA3_2_1B_SPINQUANT,
};

const llama3b: ModelSpec = {
  id: "llama3.2-3b",
  provider: "llama",
  family: "Llama 3.2",
  size: "3B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2",
  estimatedSizeMb: 2435,
  runtime: LLAMA3_2_3B_SPINQUANT,
};

const qwen35_2b: ModelSpec = {
  id: "qwen3.5-2b",
  provider: "qwen",
  family: "Qwen 3.5",
  size: "2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5",
  estimatedSizeMb: 2873,
  runtime: QWEN3_5_2B_QUANTIZED,
};

const gemma4_e2b: ModelSpec = {
  id: "gemma4-e2b",
  provider: "gemma",
  family: "Gemma 4",
  size: "E2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-gemma-4",
  estimatedSizeMb: 2451,
  runtime: models.llm.gemma4_e2b(),
};

// Same Gemma 4 E2B, exported with its vision and audio encoders: a separate, larger file than the
// text-only default, so it is offered on Full where the extra ~1.7 GB of weights fits in RAM.
const gemma4MultimodalRuntime = models.llm.gemma4_e2b_multimodal();
const gemma4_e2b_multimodal: ModelSpec = {
  id: "gemma4-e2b-multimodal",
  provider: "gemma",
  family: "Gemma 4",
  size: "E2B multimodal",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-gemma-4-multimodal",
  estimatedSizeMb: 4169,
  runtime: gemma4MultimodalRuntime,
  capabilities: gemma4MultimodalRuntime.capabilities,
  audioConfig: gemma4MultimodalRuntime.audioConfig,
};

const minicpm5_2b: ModelSpec = {
  id: "minicpm5-2b",
  provider: "minicpm",
  family: "MiniCPM5",
  size: "2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-minicpm-5",
  estimatedSizeMb: 1292,
  runtime: {
    modelSource: `${MINICPM5_BASE_URL}/xnnpack/minicpm_5_2b_xnnpack_8da4w.pte`,
    tokenizerSource: `${MINICPM5_BASE_URL}/tokenizer.json`,
    tokenizerConfigSource: `${MINICPM5_BASE_URL}/tokenizer_config.json`,
  },
};

const lfm25_2_6b: ModelSpec = {
  id: "lfm2.5-2.6b",
  provider: "lfm",
  family: "LFM 2.5",
  size: "2.6B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5",
  estimatedSizeMb: 1706,
  runtime: {
    modelSource: `${LFM2_5_BASE_URL}/2_6b/xnnpack/lfm_2_5_2_6b_xnnpack_8da4w.pte`,
    tokenizerSource: `${LFM2_5_BASE_URL}/2_6b/tokenizer.json`,
    tokenizerConfigSource: `${LFM2_5_BASE_URL}/2_6b/tokenizer_config.json`,
  },
};

export const MODEL_TIERS: TierSpec[] = [
  {
    key: "lite",
    name: "Lite",
    label: "Light",
    summary: "Fastest and the smallest download. Works on older phones; answers are simpler.",
    targetRam: "3-4 GB RAM",
    estimatedDownload: "~430 MB-1.3 GB",
    primary: smol135m,
    alternates: [smol360m, lfm25_350m, lfm25_vl_450m],
    futureUpgrade: {
      id: "qwen3.5-0.8b",
      note: "Exported, but the 8da4w file is ~1.4 GB; too large for Lite until a smaller export ships.",
    },
  },
  {
    key: "standard",
    name: "Standard",
    label: "Balanced",
    summary: "Good answers at a comfortable speed. Suits most phones from the last few years.",
    targetRam: "6-8 GB RAM",
    estimatedDownload: "~2.5 GB",
    primary: gemma4_e2b,
    alternates: [qwen17b, qwen35_2b, minicpm5_2b, smol17b, llama1b, lfm25_vl_1_6b],
    futureUpgrade: {
      id: "qwen3.5-2b",
      note: "Available as a Standard alternate in Settings for side-by-side testing.",
    },
  },
  {
    key: "full",
    name: "Full",
    label: "Smartest",
    summary: "The best answers and the biggest download. Needs a newer phone with plenty of memory.",
    targetRam: "10-12+ GB RAM",
    estimatedDownload: "~2.6 GB",
    primary: qwen4b,
    alternates: [lfm25_2_6b, llama3b, lfm25_vl_1_6b, gemma4_e2b_multimodal],
    futureUpgrade: {
      id: "qwen3.5-4b",
      note: "Not exported for ExecuTorch as of react-native-executorch 0.11.0.",
    },
  },
];

export function getTierSpec(tier: ModelTier): TierSpec {
  return MODEL_TIERS.find((it) => it.key === tier) ?? MODEL_TIERS[1];
}

/** Primary plus alternates for a tier (deduped by id). */
export function getModelsForTier(tier: ModelTier): ModelSpec[] {
  const tierSpec = getTierSpec(tier);
  const seen = new Set<string>();
  const models: ModelSpec[] = [];
  for (const spec of [tierSpec.primary, ...tierSpec.alternates]) {
    if (seen.has(spec.id)) continue;
    seen.add(spec.id);
    models.push(spec);
  }
  return models;
}

/** Resolve the active model for a tier; null/undefined modelId uses the tier primary. */
export function resolveModelForTier(tier: ModelTier, modelId?: string | null): ModelSpec {
  const tierSpec = getTierSpec(tier);
  if (!modelId || modelId === tierSpec.primary.id) {
    return tierSpec.primary;
  }
  return tierSpec.alternates.find((it) => it.id === modelId) ?? tierSpec.primary;
}

/** True when the model accepts an image with the prompt. */
export function modelSupportsVision(spec: ModelSpec): boolean {
  return spec.capabilities?.includes("vision") ?? false;
}

/** Vision models offered for a tier, for "pick one in Settings" hints. */
export function getVisionModelsForTier(tier: ModelTier): ModelSpec[] {
  return getModelsForTier(tier).filter(modelSupportsVision);
}

/**
 * Null when the tier's active model can read images; otherwise a message naming the vision models
 * to pick in Settings for that tier.
 */
export function visionUnsupportedMessage(tier: ModelTier, modelId?: string | null): string | null {
  const spec = resolveModelForTier(tier, modelId);
  if (modelSupportsVision(spec)) return null;
  const tierName = getTierSpec(tier).label;
  const options = getVisionModelsForTier(tier).map((m) => `${m.family} ${m.size}`);
  const pick =
    options.length > 0
      ? `To ask about images, pick ${options.join(" or ")} for ${tierName} in Settings.`
      : `No ${tierName} model can read images yet; choose a model with the image icon in Settings.`;
  return `${spec.family} ${spec.size} can only read text. ${pick}`;
}

function modelFileLabelFromSource(spec: ModelSpec): string {
  const src = spec.runtime.modelSource;
  if (typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"))) {
    const clean = src.split("?")[0];
    const name = clean.substring(clean.lastIndexOf("/") + 1);
    try {
      return decodeURIComponent(name) || spec.id;
    } catch {
      return name || spec.id;
    }
  }
  return spec.id;
}

/** Human-readable active model for UI (plain tier label + family + size). */
export function getActiveModelDisplayName(tier: ModelTier, modelId?: string | null): string {
  const tierSpec = getTierSpec(tier);
  const spec = resolveModelForTier(tier, modelId);
  return `${tierSpec.label} · ${spec.family} ${spec.size}`;
}

/** "Gemma 4 E2B": the model's own name, for pickers and the Advanced section. */
export function modelDisplayName(spec: ModelSpec): string {
  return `${spec.family} ${spec.size}`;
}

/** Human-readable primary model for UI (tier + family + size). */
export function getPrimaryModelDisplayName(tier: ModelTier): string {
  return getActiveModelDisplayName(tier, null);
}

/** Basename of the active LLM weight URL (for UI when ExecuTorch reports download progress). */
export function getActiveModelFileLabel(tier: ModelTier, modelId?: string | null): string {
  return modelFileLabelFromSource(resolveModelForTier(tier, modelId));
}

/** Basename of the primary LLM weight URL (for UI when ExecuTorch reports download progress). */
export function getPrimaryModelFileLabel(tier: ModelTier): string {
  return getActiveModelFileLabel(tier, null);
}

export function getFallbackTier(tier: ModelTier): "standard" | "lite" | null {
  if (tier === "full") return "standard";
  if (tier === "standard") return "lite";
  return null;
}

