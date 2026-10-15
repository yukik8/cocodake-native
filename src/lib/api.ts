import { Place } from '../types';
import { supabase } from './supabase';
import { API_URL } from './config';
import { parseSseLines, parseSseEvents } from './sse';

export { API_URL };

// トークンが無い・期限切れ（401）のとき
export class AuthError extends Error {
  constructor() {
    super('ログインの有効期限が切れました。ログインし直してください');
    this.name = 'AuthError';
  }
}

// すべての API 呼び出しに Supabase のアクセストークンを付ける。
// サーバーはトークンからユーザーを判定し、session パラメータは見ない。
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AuthError();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) throw new AuthError();
  return res;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error ?? `${fallback} (${res.status})`;
}

export async function fetchPlaces(): Promise<Place[]> {
  const res = await apiFetch('/api/places');
  if (!res.ok) throw new Error(`fetchPlaces failed: ${res.status}`);
  const data = await res.json();
  return data.places ?? [];
}

export async function deletePlace(id: string): Promise<void> {
  const res = await apiFetch('/api/places', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, '削除に失敗しました'));
}

export interface PreviewResult {
  name: string | null;
  address: string | null;
  category: string | null;
  rating: number | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  place_id: string | null;
  url?: string | null;
}

export async function previewByCoords(lat: number, lng: number, name?: string): Promise<PreviewResult> {
  const nameParam = name ? `&name=${encodeURIComponent(name)}` : '';
  const res = await apiFetch(`/api/places/add?lat=${lat}&lng=${lng}${nameParam}`);
  if (!res.ok) throw new Error(await errorMessage(res, 'スポットの取得に失敗しました'));
  return res.json();
}

export async function previewByPlaceId(placeId: string): Promise<PreviewResult> {
  const res = await apiFetch(`/api/places/add?place_id=${encodeURIComponent(placeId)}`);
  if (!res.ok) throw new Error(await errorMessage(res, 'スポットの取得に失敗しました'));
  return res.json();
}

export interface AddPlaceBody {
  lat?: number;
  lng?: number;
  url?: string;
  place_id?: string;
  name?: string;
  address?: string;
  category?: string;
  rating?: number;
  photo_url?: string;
}

export interface AddPlaceResult {
  place?: Place;
  // 'already_exists' | 'unauthorized' | エラーメッセージ
  error?: string;
  message?: string;
}

export async function addPlace(body: AddPlaceBody): Promise<AddPlaceResult> {
  try {
    const res = await apiFetch('/api/places/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) return { error: 'already_exists', message: data.message };
    if (!res.ok) return { error: data.error ?? 'Unknown error' };
    return { place: data.place };
  } catch (e) {
    if (e instanceof AuthError) return { error: 'unauthorized', message: e.message };
    return { error: e instanceof Error ? e.message : '通信エラーが発生しました' };
  }
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  // Google の候補は座標なし（place_id で詳細を取りに行く）。MapTiler / Nominatim は座標あり
  lat: number | null;
  lng: number | null;
  place_id: string | null;
}

export async function updateNote(id: string, note: string | null): Promise<void> {
  const res = await apiFetch('/api/places', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, note }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'メモの保存に失敗しました'));
}

export async function searchPlaces(q: string, lat?: number, lng?: number): Promise<SearchResult[]> {
  const locParam = lat != null && lng != null ? `&lat=${lat}&lng=${lng}` : '';
  const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}${locParam}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function deleteAccount(): Promise<void> {
  const res = await apiFetch('/api/account', { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res, 'アカウント削除に失敗しました'));
}

export interface CreatedShare {
  id: string;
  title: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function createShare(placeIds: string[], title: string | undefined, expiresInDays: number): Promise<CreatedShare> {
  const res = await apiFetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place_ids: placeIds, title, expires_in_days: expiresInDays }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, '共有リンクを作成できませんでした'));
  const data = await res.json();
  return data.share;
}

export type ImportEvent =
  | { type: 'progress'; phase: 'geocoding'; current: number; total: number }
  | { type: 'progress'; phase: 'parsing' | 'saving' }
  | { type: 'done'; imported: number; parsed?: number; geocodeFailed?: number; duplicates?: number }
  | { type: 'error'; message: string };

// Takeout ファイルを取り込む。進捗は Server-Sent Events で届く。
// React Native の fetch はレスポンス本文をストリームで読めないので、
// その場合は全文を受け取ってからまとめてイベントを処理する。
export async function importTakeoutFile(
  file: { uri: string; name: string; type: string },
  onEvent: (event: ImportEvent) => void,
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);

  const res = await apiFetch('/api/import', {
    method: 'POST',
    headers: { 'X-Stream': 'true' },
    body: formData,
  });

  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    onEvent({ type: 'error', message: await errorMessage(res, 'インポートに失敗しました') });
    return;
  }

  const reader = res.body?.getReader?.();
  if (!reader) {
    for (const e of parseSseEvents(await res.text())) onEvent(e as ImportEvent);
    return;
  }

  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const e of parseSseLines(lines)) onEvent(e as ImportEvent);
  }
  for (const e of parseSseEvents(buf)) onEvent(e as ImportEvent);
}

export async function enrichPlaces(limit = 50): Promise<void> {
  await apiFetch('/api/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit }),
  });
}
