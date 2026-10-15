import { describe, expect, it } from 'vitest';
import { filterAndSortPlaces } from '../listing';
import type { Place } from '../../types';

function place(id: string, over: Partial<Place> = {}): Place {
  return {
    id, user_session: 'u', place_id: null, name: id, url: null, lat: 0, lng: 0,
    address: null, category: null, rating: null, photo_url: null, note: null,
    enriched: true, created_at: '2026-01-01T00:00:00Z', ...over,
  };
}

const places = [
  place('a', { name: 'Ramen Ichi', category: 'ラーメン', rating: 3.9, created_at: '2026-01-02T00:00:00Z' }),
  place('b', { name: 'Cafe Ni', address: '渋谷区', rating: 4.5, created_at: '2026-01-03T00:00:00Z' }),
  place('c', { name: null, rating: null, created_at: 'not a date' }),
];

describe('filterAndSortPlaces', () => {
  it('sorts by most recent first, putting unparseable dates last', () => {
    expect(filterAndSortPlaces(places, '', 'recent').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by rating, treating missing ratings as 0', () => {
    expect(filterAndSortPlaces(places, '', 'rating').map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by name, treating missing names as empty', () => {
    expect(filterAndSortPlaces(places, '', 'name').map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('searches name, category and address case-insensitively', () => {
    expect(filterAndSortPlaces(places, 'ramen', 'recent').map((p) => p.id)).toEqual(['a']);
    expect(filterAndSortPlaces(places, 'ラーメン', 'recent').map((p) => p.id)).toEqual(['a']);
    expect(filterAndSortPlaces(places, '渋谷', 'recent').map((p) => p.id)).toEqual(['b']);
  });

  it('does not mutate the input array', () => {
    const copy = places.slice();
    filterAndSortPlaces(places, '', 'name');
    expect(places).toEqual(copy);
  });
});
