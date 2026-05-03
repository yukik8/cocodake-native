import { Place } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, options);
  return res;
}

export async function fetchPlaces(session: string): Promise<Place[]> {
  const res = await apiFetch(`/api/places?session=${session}`);
  if (!res.ok) throw new Error(`fetchPlaces failed: ${res.status}`);
  const data = await res.json();
  return data.places ?? [];
}

export async function deletePlace(id: string, session: string): Promise<void> {
  await apiFetch('/api/places', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, session }),
  });
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
}

export async function previewByCoords(lat: number, lng: number, name?: string): Promise<PreviewResult> {
  const nameParam = name ? `&name=${encodeURIComponent(name)}` : '';
  const res = await apiFetch(`/api/places/add?lat=${lat}&lng=${lng}${nameParam}`);
  return res.json();
}

export async function previewByPlaceId(placeId: string): Promise<PreviewResult> {
  const res = await apiFetch(`/api/places/add?place_id=${encodeURIComponent(placeId)}`);
  return res.json();
}

export interface AddPlaceBody {
  session: string;
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

export async function addPlace(body: AddPlaceBody): Promise<{ place?: Place; error?: string; message?: string }> {
  const res = await apiFetch('/api/places/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (res.status === 409) return { error: 'already_exists', message: data.message };
  if (!res.ok) return { error: data.error ?? 'Unknown error' };
  return { place: data.place };
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(q: string, lat?: number, lng?: number): Promise<SearchResult[]> {
  const locParam = lat != null && lng != null ? `&lat=${lat}&lng=${lng}` : '';
  const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}${locParam}`);
  return res.json();
}
