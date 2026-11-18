import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const CHAT_IMAGES_DIR = `${FileSystem.documentDirectory}chat-images`;
/** Vision encoders downscale to a few hundred px anyway; this keeps memory and storage small. */
const MAX_IMAGE_SIDE_PX = 1024;

export type PickedChatImage = { uri: string; width: number; height: number };

export type PickChatImageResult =
  | { status: "picked"; image: PickedChatImage }
  | { status: "cancelled" }
  | { status: "error"; message: string };

async function ensureChatImagesDirectory() {
  const info = await FileSystem.getInfoAsync(CHAT_IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CHAT_IMAGES_DIR, { intermediates: true });
  }
}

/** Longest side capped at MAX_IMAGE_SIDE_PX; undefined when the image is already small enough. */
export function resizeForVision(width: number, height: number): { width: number } | { height: number } | undefined {
  if (!width || !height || Math.max(width, height) <= MAX_IMAGE_SIDE_PX) return undefined;
  return width >= height ? { width: MAX_IMAGE_SIDE_PX } : { height: MAX_IMAGE_SIDE_PX };
}

/**
 * Opens the system photo picker (Android Photo Picker / iOS PHPicker). Neither needs a storage or
 * photo-library permission: the user chooses one image and the app only gets that file, so no
 * permission prompt is shown and none is declared. The copy is re-encoded as JPEG, which also drops
 * EXIF metadata such as GPS location, and stays in the app's private storage.
 */
export async function pickChatImage(): Promise<PickChatImageResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      allowsEditing: false,
      exif: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return { status: "cancelled" };
    const asset = result.assets[0];
    const resize = resizeForVision(asset.width, asset.height);
    const encoded = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: 0.85,
      format: SaveFormat.JPEG,
    });
    await ensureChatImagesDirectory();
    const destination = `${CHAT_IMAGES_DIR}/img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.moveAsync({ from: encoded.uri, to: destination });
    return { status: "picked", image: { uri: destination, width: encoded.width, height: encoded.height } };
  } catch (err) {
    console.warn("[OfflineMate] Image pick failed:", err);
    return {
      status: "error",
      message: "Could not open that image. Try a different photo (JPEG or PNG work best).",
    };
  }
}

/** Only files inside our own chat-images folder are ever deleted. */
function isOwnChatImage(uri: string) {
  return uri.startsWith(`${CHAT_IMAGES_DIR}/`);
}

export async function deleteChatImages(uris: (string | undefined)[]) {
  for (const uri of uris) {
    if (!uri || !isOwnChatImage(uri)) continue;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (err) {
      console.warn("[OfflineMate] Could not delete chat image:", err);
    }
  }
}

/**
 * Deletes copies no saved message points to: a photo attached but never sent (the app was closed
 * first), or chats that weren't kept because "Keep chat history" is off. Run only once the saved
 * chats have loaded, or it would delete photos that are still in a chat.
 */
export async function pruneUnreferencedChatImages(referencedUris: (string | undefined)[]): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(CHAT_IMAGES_DIR);
    if (!info.exists) return 0;
    const referenced = new Set(referencedUris.filter(Boolean));
    const names = await FileSystem.readDirectoryAsync(CHAT_IMAGES_DIR);
    const orphans = names.map((name) => `${CHAT_IMAGES_DIR}/${name}`).filter((uri) => !referenced.has(uri));
    await deleteChatImages(orphans);
    return orphans.length;
  } catch (err) {
    console.warn("[OfflineMate] Could not prune chat images:", err);
    return 0;
  }
}
