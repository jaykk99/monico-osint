import { describe, expect, it } from 'vitest';
import {
  originOf,
  faviconCandidates,
  murmurhash3_32,
  bytesToBase64,
  shodanFaviconHash,
  shodanSearchUrl,
  hashSummary,
} from '../lib/iconhash';

describe('originOf', () => {
  it('reduces a URL to its origin', () => {
    expect(originOf('https://example.com/some/path?q=1')).toBe('https://example.com');
  });
  it('returns null for garbage', () => {
    expect(originOf('not a url')).toBeNull();
    expect(originOf('')).toBeNull();
  });
});

describe('faviconCandidates', () => {
  it('lists the well-known icon paths on the origin', () => {
    const c = faviconCandidates('https://example.com/');
    expect(c[0]).toBe('https://example.com/favicon.ico');
    expect(c).toContain('https://example.com/apple-touch-icon.png');
    expect(new Set(c).size).toBe(c.length);
  });
  it('returns [] for bad input', () => {
    expect(faviconCandidates('nope')).toEqual([]);
  });
});

describe('murmurhash3_32', () => {
  it('matches the published "hello" vector', () => {
    // Canonical murmurhash3_x86_32("hello", seed=0) test vector.
    expect(murmurhash3_32('hello', 0)).toBe(613153351);
  });
  it('is deterministic and seed-sensitive', () => {
    expect(murmurhash3_32('abc')).toBe(murmurhash3_32('abc'));
    expect(murmurhash3_32('abc', 1)).not.toBe(murmurhash3_32('abc', 0));
  });
  it('accepts raw bytes and handles empty input', () => {
    const h = murmurhash3_32(new Uint8Array([1, 2, 3, 4, 5]), 0);
    expect(Number.isInteger(h)).toBe(true);
    expect(h >>> 0).toBe(h);
    expect(Number.isInteger(murmurhash3_32(''))).toBe(true);
  });
  it('string and equivalent bytes agree', () => {
    const s = 'icon-bytes-test';
    expect(murmurhash3_32(s)).toBe(murmurhash3_32(new TextEncoder().encode(s)));
  });
});

describe('bytesToBase64', () => {
  it('round-trips through atob', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    expect(atob(bytesToBase64(bytes))).toBe('Hello');
  });
});

describe('shodanFaviconHash', () => {
  it('returns a signed 32-bit int and is deterministic', () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10]);
    const h = shodanFaviconHash(bytes);
    expect(h).toBe(shodanFaviconHash(bytes));
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(-2147483648);
    expect(h).toBeLessThanOrEqual(2147483647);
  });
  it('differs between different icons', () => {
    expect(shodanFaviconHash(new Uint8Array([1]))).not.toBe(
      shodanFaviconHash(new Uint8Array([2]))
    );
  });
});

describe('shodanSearchUrl', () => {
  it('builds the Shodan favicon query', () => {
    expect(shodanSearchUrl(-12345)).toBe(
      'https://www.shodan.io/search?query=http.favicon.hash%3A-12345'
    );
  });
});

describe('hashSummary', () => {
  it('labels sizes', () => {
    expect(hashSummary(0)).toBe('empty file');
    expect(hashSummary(500)).toContain('tiny');
    expect(hashSummary(2048)).toContain('2.0 KB');
  });
});
