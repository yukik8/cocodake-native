import { requireOptionalNativeModule } from 'expo-modules-core';

interface ShareIntentNativeModule {
  getAndClearPendingUrl?(): Promise<string | null>;
  setUserSession?(userId: string, apiUrl: string, accessToken: string): Promise<void>;
  clearUserSession?(): Promise<void>;
  setPlaceData?(ids: string[], urls: string[]): Promise<void>;
}

// null where the native module isn't built in (Expo Go, or a build without it), so the app
// still starts instead of throwing at import time. Android implements only
// getAndClearPendingUrl: its share intent hands the URL to the app, which adds the place
// itself, so there is no session or place cache to keep on that side.
const ShareIntent = requireOptionalNativeModule<ShareIntentNativeModule>('ShareIntent');

export async function getPendingShareUrl(): Promise<string | null> {
  return (await ShareIntent?.getAndClearPendingUrl?.()) ?? null;
}

// Share Extension が API を呼べるように、ユーザーID・APIのURL・アクセストークンを App Group に置く
export async function setUserSession(userId: string, apiUrl: string, accessToken: string): Promise<void> {
  await ShareIntent?.setUserSession?.(userId, apiUrl, accessToken);
}

export async function clearUserSession(): Promise<void> {
  await ShareIntent?.clearUserSession?.();
}

export async function setPlaceData(ids: string[], urls: string[]): Promise<void> {
  await ShareIntent?.setPlaceData?.(ids, urls);
}
