import { requireNativeModule } from 'expo-modules-core';

interface ShareIntentNativeModule {
  getAndClearPendingUrl(): Promise<string | null>;
  setUserSession(userId: string, apiUrl: string, accessToken: string): Promise<void>;
  clearUserSession(): Promise<void>;
  setPlaceData(ids: string[], urls: string[]): Promise<void>;
}

const ShareIntent = requireNativeModule<ShareIntentNativeModule>('ShareIntent');

export async function getPendingShareUrl(): Promise<string | null> {
  return ShareIntent.getAndClearPendingUrl();
}

// Share Extension が API を呼べるように、ユーザーID・APIのURL・アクセストークンを App Group に置く
export async function setUserSession(userId: string, apiUrl: string, accessToken: string): Promise<void> {
  return ShareIntent.setUserSession(userId, apiUrl, accessToken);
}

export async function clearUserSession(): Promise<void> {
  return ShareIntent.clearUserSession();
}

export async function setPlaceData(ids: string[], urls: string[]): Promise<void> {
  return ShareIntent.setPlaceData(ids, urls);
}
