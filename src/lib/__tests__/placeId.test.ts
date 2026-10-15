import { describe, expect, it } from 'vitest';
import { extractPlaceIdFromUrl } from '../placeId';

// Web（~/dev/map の parseTakeout）と Share Extension（Swift）と同じテストケース
describe('extractPlaceIdFromUrl', () => {
  it.each([
    ['https://www.google.com/maps/search/?api=1&query=X&query_place_id=ChIJabc123', 'ChIJabc123'],
    ['https://maps.google.com/?q=place_id:ChIJabc123', 'ChIJabc123'],
    ['https://www.google.com/maps/place/?q=place_id=ChIJabc123&foo=1', 'ChIJabc123'],
    ['https://www.google.com/maps/place/X/data=!4m2!3m1!1sChIJabc123!2m1', 'ChIJabc123'],
    ['https://www.google.com/maps/place/X/data=!3m1!1s0x6018:0x1234', null],
    ['', null],
  ])('%s → %s', (url, expected) => {
    expect(extractPlaceIdFromUrl(url)).toBe(expected);
  });

  it('prefers the place_id parameter over a !1s segment', () => {
    expect(extractPlaceIdFromUrl('https://g.co/x/data=!1sChIJfromData?query_place_id=ChIJfromParam')).toBe('ChIJfromParam');
  });

  it('keeps - and _ inside the id and stops at the next separator', () => {
    expect(extractPlaceIdFromUrl('https://x/?query_place_id=ChIJa-b_c&hl=ja')).toBe('ChIJa-b_c');
    expect(extractPlaceIdFromUrl('https://x/data=!1sChIJa-b_c!8m2')).toBe('ChIJa-b_c');
  });
});
