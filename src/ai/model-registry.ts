import type { ModelTier } from "@/types/assistant";
import {
  LLAMA3_2_1B_SPINQUANT,
  LLAMA3_2_3B_SPINQUANT,
  LFM2_5_350M_QUANTIZED,
  QWEN3_1_7B_QUANTIZED,
  QWEN3_4B_QUANTIZED,
  QWEN3_5_2B_QUANTIZED,
  SMOLLM2_1_135M_QUANTIZED,
  SMOLLM2_1_1_7B_QUANTIZED,
  SMOLLM2_1_360M_QUANTIZED,
  models,
} from "react-native-executorch/legacy";

export interface ModelSpec {
  id: string;
  provider: "qwen" | "smollm" | "llama" | "gemma" | "lfm" | "minicpm";
  family: string;
  size: string;
  quantization: "8da4w" | "int4";
  downloadUrl: string;
  estimatedSizeMb: number;
  runtime: {
    modelSource: string;
    tokenizerSource: string;
    tokenizerConfigSource: string;
  };
}

export interface TierSpec {
  key: ModelTier;
  name: "Lite" | "Standard" | "Full";
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
  estimatedSizeMb: 90,
  runtime: SMOLLM2_1_135M_QUANTIZED,
};

const smol360m: ModelSpec = {
  id: "smollm2-360m",
  provider: "smollm",
  family: "SmolLM2",
  size: "360M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-smolLm-2",
  estimatedSizeMb: 200,
  runtime: SMOLLM2_1_360M_QUANTIZED,
};

const smol17b: ModelSpec = {
  id: "smollm2-1.7b",
  provider: "smollm",
  family: "SmolLM2",
  size: "1.7B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-smolLm-2",
  estimatedSizeMb: 1024,
  runtime: SMOLLM2_1_1_7B_QUANTIZED,
};

const lfm25_350m: ModelSpec = {
  id: "lfm2.5-350m",
  provider: "lfm",
  family: "LFM 2.5",
  size: "350M",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-lfm-2.5",
  estimatedSizeMb: 435,
  runtime: LFM2_5_350M_QUANTIZED,
};

const qwen17b: ModelSpec = {
  id: "qwen3-1.7b",
  provider: "qwen",
  family: "Qwen 3",
  size: "1.7B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3",
  estimatedSizeMb: 1024,
  runtime: QWEN3_1_7B_QUANTIZED,
};

const qwen4b: ModelSpec = {
  id: "qwen3-4b",
  provider: "qwen",
  family: "Qwen 3",
  size: "4B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3",
  estimatedSizeMb: 2048,
  runtime: QWEN3_4B_QUANTIZED,
};

const llama1b: ModelSpec = {
  id: "llama3.2-1b",
  provider: "llama",
  family: "Llama 3.2",
  size: "1B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2",
  estimatedSizeMb: 700,
  runtime: LLAMA3_2_1B_SPINQUANT,
};

const llama3b: ModelSpec = {
  id: "llama3.2-3b",
  provider: "llama",
  family: "Llama 3.2",
  size: "3B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2",
  estimatedSizeMb: 1800,
  runtime: LLAMA3_2_3B_SPINQUANT,
};

const qwen35_2b: ModelSpec = {
  id: "qwen3.5-2b",
  provider: "qwen",
  family: "Qwen 3.5",
  size: "2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-qwen-3.5",
  estimatedSizeMb: 1100,
  runtime: QWEN3_5_2B_QUANTIZED,
};

const gemma4_e2b: ModelSpec = {
  id: "gemma4-e2b",
  provider: "gemma",
  family: "Gemma 4",
  size: "E2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-gemma-4",
  estimatedSizeMb: 900,
  runtime: models.llm.gemma4_e2b(),
};

const minicpm5_2b: ModelSpec = {
  id: "minicpm5-2b",
  provider: "minicpm",
  family: "MiniCPM5",
  size: "2B",
  quantization: "8da4w",
  downloadUrl: "https://huggingface.co/software-mansion/react-native-executorch-minicpm-5",
  estimatedSizeMb: 1295,
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
  estimatedSizeMb: 1710,
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
    targetRam: "3-4 GB RAM",
    estimatedDownload: "~210-560 MB",
    primary: smol135m,
    alternates: [smol360m, lfm25_350m],
    futureUpgrade: {
      id: "qwen3.5-0.8b",
      note: "Exported, but the 8da4w file is ~1.4 GB; too large for Lite until a smaller export ships.",
    },
  },
  {
    key: "standard",
    name: "Standard",
    targetRam: "6-8 GB RAM",
    estimatedDownload: "~1.2 GB",
    primary: gemma4_e2b,
    alternates: [qwen17b, qwen35_2b, minicpm5_2b, smol17b, llama1b],
    futureUpgrade: {
      id: "qwen3.5-2b",
      note: "Available as a Standard alternate in Settings for side-by-side testing.",
    },
  },
  {
    key: "full",
    name: "Full",
    targetRam: "10-12+ GB RAM",
    estimatedDownload: "~2.2 GB",
    primary: qwen4b,
    alternates: [lfm25_2_6b, llama3b],
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

/** Human-readable active model for UI (tier + family + size). */
export function getActiveModelDisplayName(tier: ModelTier, modelId?: string | null): string {
  const tierSpec = getTierSpec(tier);
  const spec = resolveModelForTier(tier, modelId);
  return `${tierSpec.name} · ${spec.family} ${spec.size}`;
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

