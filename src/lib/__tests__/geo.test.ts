import { describe, expect, it } from 'vitest';
import { isInBounds, placesInBounds, padBounds, nextClusterRegion, type Bounds } from '../geo';

const tokyo: Bounds = [139.6, 35.6, 139.8, 35.8];

describe('isInBounds', () => {
  it('includes points on every edge', () => {
    expect(isInBounds({ lng: 139.6, lat: 35.7 }, tokyo)).toBe(true);
    expect(isInBounds({ lng: 139.8, lat: 35.7 }, tokyo)).toBe(true);
    expect(isInBounds({ lng: 139.7, lat: 35.6 }, tokyo)).toBe(true);
    expect(isInBounds({ lng: 139.7, lat: 35.8 }, tokyo)).toBe(true);
  });

  it('excludes points just outside', () => {
    expect(isInBounds({ lng: 139.59999, lat: 35.7 }, tokyo)).toBe(false);
    expect(isInBounds({ lng: 139.7, lat: 35.80001 }, tokyo)).toBe(false);
  });

  it('filters a list of places', () => {
    const places = [{ id: 'a', lng: 139.7, lat: 35.7 }, { id: 'b', lng: 135.5, lat: 34.7 }];
    expect(placesInBounds(places, tokyo).map((p) => p.id)).toEqual(['a']);
  });
});

describe('padBounds', () => {
  it('widens by the ratio and clamps latitude', () => {
    expect(padBounds([0, 0, 10, 10], 0.5)).toEqual([-5, -5, 15, 15]);
    expect(padBounds([0, 80, 10, 89], 1)[3]).toBe(90);
  });
});

describe('nextClusterRegion', () => {
  it('computes a padded region the first time', () => {
    expect(nextClusterRegion(null, [0, 0, 10, 10], 12.7)).toEqual({ zoom: 12, bounds: [-5, -5, 15, 15] });
  });

  it('skips small pans that stay inside the padded region', () => {
    const prev = nextClusterRegion(null, [0, 0, 10, 10], 12.2)!;
    expect(nextClusterRegion(prev, [2, 2, 12, 12], 12.9)).toBeNull();
  });

  it('recomputes when the view leaves the padded region', () => {
    const prev = nextClusterRegion(null, [0, 0, 10, 10], 12)!;
    expect(nextClusterRegion(prev, [10, 0, 20, 10], 12)).not.toBeNull();
  });

  it('recomputes when the integer zoom changes', () => {
    const prev = nextClusterRegion(null, [0, 0, 10, 10], 12.9)!;
    expect(nextClusterRegion(prev, [1, 1, 9, 9], 13.1)?.zoom).toBe(13);
  });
});
