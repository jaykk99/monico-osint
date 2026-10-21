import { describe, expect, it } from 'vitest';
import { isValidDomain, parseCrtsh } from '../lib/certscan';

describe('isValidDomain', () => {
  it('accepts normal domains', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.example.co.uk')).toBe(true);
    expect(isValidDomain('my-site123.io')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('com')).toBe(false);
    expect(isValidDomain('-bad.com')).toBe(false);
    expect(isValidDomain('has space.com')).toBe(false);
    expect(isValidDomain('http://example.com')).toBe(false);
    expect(isValidDomain('example')).toBe(false);
  });
});

describe('parseCrtsh', () => {
  const rows = [
    { name_value: 'a.example.com\n*.b.example.com' },
    { name_value: 'A.EXAMPLE.COM' }, // dup, different case
    { name_value: 'other.com' }, // different domain — dropped
    { name_value: 'deep.sub.example.com' },
    { name_value: 42 }, // malformed row — skipped
    {},
  ];

  it('extracts, dedupes and sorts subdomains', () => {
    expect(parseCrtsh(rows, 'example.com')).toEqual([
      'a.example.com',
      'b.example.com',
      'deep.sub.example.com',
    ]);
  });

  it('strips wildcard prefixes', () => {
    expect(parseCrtsh([{ name_value: '*.wild.example.com' }], 'example.com')).toEqual([
      'wild.example.com',
    ]);
  });

  it('returns [] for non-array input', () => {
    expect(parseCrtsh(null, 'example.com')).toEqual([]);
    expect(parseCrtsh({ data: [] }, 'example.com')).toEqual([]);
  });
});
