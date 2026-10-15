import type { Place } from '../types';

export type SortKey = 'recent' | 'name' | 'rating';

// リスト画面の検索・並び替え。日付は1件につき1回だけ解析する。
export function filterAndSortPlaces(places: Place[], search: string, sortBy: SortKey): Place[] {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? places.filter((p) =>
        !!(
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q)
        ))
    : places.slice();

  if (sortBy === 'name') return filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  if (sortBy === 'rating') return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const time = new Map<string, number>();
  for (const p of filtered) {
    const t = Date.parse(p.created_at);
    time.set(p.id, Number.isNaN(t) ? 0 : t);
  }
  return filtered.sort((a, b) => time.get(b.id)! - time.get(a.id)!);
}
