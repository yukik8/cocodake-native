import { describe, expect, it } from 'vitest';
import { resolvePhotoUrl } from '../photo';

describe('resolvePhotoUrl', () => {
  const api = 'https://cocodake.example';

  it('prefixes server-relative photo paths with the API origin', () => {
    expect(resolvePhotoUrl('/api/photo?ref=abc', api)).toBe('https://cocodake.example/api/photo?ref=abc');
  });

  it('does not double the slash when the API URL ends with /', () => {
    expect(resolvePhotoUrl('/api/photo?ref=abc', `${api}/`)).toBe('https://cocodake.example/api/photo?ref=abc');
  });

  it('passes absolute http(s) URLs through', () => {
    expect(resolvePhotoUrl('https://lh3.googleusercontent.com/p/x', api)).toBe('https://lh3.googleusercontent.com/p/x');
  });

  it('returns null for empty or unsupported values', () => {
    expect(resolvePhotoUrl(null, api)).toBeNull();
    expect(resolvePhotoUrl(undefined, api)).toBeNull();
    expect(resolvePhotoUrl('', api)).toBeNull();
    expect(resolvePhotoUrl('javascript:alert(1)', api)).toBeNull();
  });
});
