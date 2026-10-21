import { describe, expect, it } from 'vitest';
import {
  buildCdxUrl,
  parseCdx,
  earliestCapture,
  latestCapture,
  formatTimestamp,
  snapshotUrl,
  calendarUrl,
  capturesPerYear,
} from '../lib/wayback';

describe('buildCdxUrl', () => {
  it('builds a CDX query for a domain', () => {
    const u = buildCdxUrl('example.com');
    expect(u).toContain('web.archive.org/cdx/search/cdx');
    expect(u).toContain('matchType=domain');
    expect(u).toContain('output=json');
    expect(u).toContain('collapse=digest');
    expect(u).toContain('filter=statuscode%3A200');
    expect(u).toContain('limit=500');
  });

  it('honours options', () => {
    const u = buildCdxUrl('Example.COM', { limit: 50, collapseDigest: false, onlyOk: false });
    expect(u).toContain('example.com');
    expect(u).not.toContain('collapse=digest');
    expect(u).not.toContain('filter=statuscode');
    expect(u).toContain('limit=50');
  });
});

describe('parseCdx', () => {
  const json = [
    ['timestamp', 'original', 'statuscode', 'mimetype', 'digest'],
    ['20210101120000', 'http://example.com/', '200', 'text/html', 'abc'],
    ['20220615103000', 'http://example.com/about', '200', 'text/html', 'def'],
    ['not-a-date', 'http://example.com/bad', '200', 'text/html', 'ghi'], // bad ts — skipped
    ['20230101000000', '', '200', 'text/html', 'jkl'], // empty url — skipped
    'not-an-array', // skipped
  ];

  it('parses captures, skipping malformed rows', () => {
    const caps = parseCdx(json);
    expect(caps).toHaveLength(2);
    expect(caps[0]).toEqual({
      timestamp: '20210101120000',
      original: 'http://example.com/',
      status: '200',
      mimetype: 'text/html',
      digest: 'abc',
    });
  });

  it('returns [] for junk input', () => {
    expect(parseCdx(null)).toEqual([]);
    expect(parseCdx({})).toEqual([]);
    expect(parseCdx([['timestamp']])).toEqual([]); // header only
    expect(parseCdx([['nope'], ['x']])).toEqual([]); // missing columns
  });
});

describe('earliestCapture / latestCapture', () => {
  const caps = [
    { timestamp: '20220615103000', original: 'b', status: '200', mimetype: 't', digest: 'd' },
    { timestamp: '20210101120000', original: 'a', status: '200', mimetype: 't', digest: 'd' },
  ];
  it('finds extremes regardless of order', () => {
    expect(earliestCapture(caps)?.timestamp).toBe('20210101120000');
    expect(latestCapture(caps)?.timestamp).toBe('20220615103000');
  });
  it('returns null for empty input', () => {
    expect(earliestCapture([])).toBeNull();
    expect(latestCapture([])).toBeNull();
  });
});

describe('formatTimestamp', () => {
  it('formats CDX timestamps', () => {
    expect(formatTimestamp('20210415123045')).toBe('2021-04-15 12:30 UTC');
  });
  it('passes through bad input', () => {
    expect(formatTimestamp('garbage')).toBe('garbage');
  });
});

describe('snapshotUrl / calendarUrl', () => {
  it('links to the exact archived snapshot', () => {
    expect(snapshotUrl('20210415123045', 'http://example.com/')).toBe(
      'https://web.archive.org/web/20210415123045id_/http://example.com/'
    );
  });
  it('links to the availability calendar', () => {
    expect(calendarUrl('Example.COM')).toContain('web.archive.org/web/*');
    expect(calendarUrl('Example.COM')).toContain('example.com');
  });
});

describe('capturesPerYear', () => {
  it('buckets by year, ascending', () => {
    const caps = [
      { timestamp: '20220615103000', original: 'b', status: '200', mimetype: 't', digest: 'd' },
      { timestamp: '20210101120000', original: 'a', status: '200', mimetype: 't', digest: 'd' },
      { timestamp: '20211231235959', original: 'c', status: '200', mimetype: 't', digest: 'd' },
    ];
    expect(capturesPerYear(caps)).toEqual([
      { year: '2021', count: 2 },
      { year: '2022', count: 1 },
    ]);
  });
  it('returns [] for empty input', () => {
    expect(capturesPerYear([])).toEqual([]);
  });
});
