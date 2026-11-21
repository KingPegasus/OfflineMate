import DeviceInfo from "react-native-device-info";
import type { ModelTier } from "@/types/assistant";
import { recommendTierForDevice } from "@/utils/tier-recommendation";

export async function getDeviceRamGb(): Promise<number> {
  const bytes = await DeviceInfo.getTotalMemory();
  return bytes / 1024 ** 3;
}

export async function getDeviceTierRecommendation(): Promise<ModelTier> {
  const ram = await getDeviceRamGb();
  return recommendTierForDevice(ram);
}
