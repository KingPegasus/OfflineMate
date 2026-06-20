import type { ModelTier } from "@/types/assistant";
import {
  GEMMA4_E2B,
  LLAMA3_2_1B_SPINQUANT,
  LLAMA3_2_3B_SPINQUANT,
  QWEN3_1_7B_QUANTIZED,
  QWEN3_4B_QUANTIZED,
  QWEN3_5_2B_QUANTIZED,
  SMOLLM2_1_135M_QUANTIZED,
  SMOLLM2_1_1_7B_QUANTIZED,
  SMOLLM2_1_360M_QUANTIZED,
} from "react-native-executorch";

export interface ModelSpec {
  id: string;
  provider: "qwen" | "smollm" | "llama" | "gemma";
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
  runtime: GEMMA4_E2B,
};

export const MODEL_TIERS: TierSpec[] = [
  {
    key: "lite",
    name: "Lite",
    targetRam: "3-4 GB RAM",
    estimatedDownload: "~210-320 MB",
    primary: smol135m,
    alternates: [smol360m],
    futureUpgrade: {
      id: "qwen3.5-0.8b",
      note: "Enable when ExecuTorch exports are available.",
    },
  },
  {
    key: "standard",
    name: "Standard",
    targetRam: "6-8 GB RAM",
    estimatedDownload: "~1.2 GB",
    primary: gemma4_e2b,
    alternates: [qwen17b, qwen35_2b, smol17b, llama1b],
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
    alternates: [llama3b],
    futureUpgrade: {
      id: "qwen3.5-4b",
      note: "Enable when ExecuTorch exports are available.",
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

