import { API_URL } from './config';

// サーバーは写真を /api/photo?ref=… の相対パスで返す（APIキーを端末に渡さないため）。
// <Image> に渡す前に API のオリジンを付ける。
export function resolvePhotoUrl(photoUrl: string | null | undefined, apiUrl: string = API_URL): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('/')) return `${apiUrl.replace(/\/+$/, '')}${photoUrl}`;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return null;
}
