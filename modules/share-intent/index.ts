import { requireNativeModule } from 'expo-modules-core';

interface ShareIntentNativeModule {
  getAndClearPendingUrl(): Promise<string | null>;
  setPlaceData(ids: string[], urls: string[]): Promise<void>;
}

const ShareIntent = requireNativeModule<ShareIntentNativeModule>('ShareIntent');

export async function getPendingShareUrl(): Promise<string | null> {
  return ShareIntent.getAndClearPendingUrl();
}

export async function setPlaceData(ids: string[], urls: string[]): Promise<void> {
  return ShareIntent.setPlaceData(ids, urls);
}
