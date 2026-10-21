import { describe, expect, it } from 'vitest';
import {
  isValidUrl,
  buildUnshortenUrl,
  parseUnshorten,
  buildHopTable,
  suspiciousFlags,
  resolvedHost,
} from '../lib/unshorten';

describe('isValidUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isValidUrl('https://bit.ly/abc123')).toBe(true);
    expect(isValidUrl('http://t.co/x')).toBe(true);
  });

  it('rejects dangerous or malformed schemes', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('data:text/html,hi')).toBe(false);
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('buildUnshortenUrl', () => {
  it('encodes the URL into the API path', () => {
    const u = buildUnshortenUrl('https://bit.ly/abc?x=1&y=2');
    expect(u).toBe(
      'https://unshorten.me/json/' + encodeURIComponent('https://bit.ly/abc?x=1&y=2')
    );
  });
});

describe('parseUnshorten', () => {
  it('parses a success response', () => {
    const r = parseUnshorten({
      success: true,
      requested_url: 'https://bit.ly/abc',
      resolved_url: 'https://example.com/long/path',
      response_code: 200,
      redirects: 3,
    });
    expect(r.success).toBe(true);
    expect(r.requested).toBe('https://bit.ly/abc');
    expect(r.resolved).toBe('https://example.com/long/path');
    expect(r.responseCode).toBe('200');
    expect(r.redirectCount).toBe(3);
    expect(r.error).toBe('');
  });

  it('accepts redirects as a URL array', () => {
    const r = parseUnshorten({
      success: true,
      requested_url: 'https://t.co/x',
      resolved_url: 'https://example.com/',
      redirects: ['https://t.co/x', 'https://mid.example/'],
    });
    expect(r.redirectCount).toBe(2);
    expect(r.hops).toEqual(['https://t.co/x', 'https://mid.example/']);
  });

  it('accepts redirects as {url} objects', () => {
    const r = parseUnshorten({
      success: true,
      requested_url: 'a',
      resolved_url: 'b',
      redirects: [{ url: 'https://mid.example/' }, {}],
    });
    expect(r.hops).toEqual(['https://mid.example/']);
  });

  it('surfaces failures', () => {
    const r = parseUnshorten({ success: false, error: 'rate limited' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('rate limited');
  });

  it('fails when no resolved URL', () => {
    const r = parseUnshorten({ success: true });
    expect(r.success).toBe(false);
  });

  it('handles junk input', () => {
    expect(parseUnshorten(null).success).toBe(false);
    expect(parseUnshorten({}).error).toContain('Could not expand');
  });
});

describe('buildHopTable', () => {
  it('builds start -> hops -> final', () => {
    const rows = buildHopTable({
      success: true,
      requested: 'https://bit.ly/abc',
      resolved: 'https://example.com/',
      responseCode: '200',
      redirectCount: 2,
      hops: ['https://bit.ly/abc', 'https://mid.example/'],
      error: '',
    });
    expect(rows.map((r) => r.url)).toEqual([
      'https://bit.ly/abc',
      'https://bit.ly/abc',
      'https://mid.example/',
      'https://example.com/',
    ]);
    expect(rows[0].note).toContain('start');
    expect(rows[rows.length - 1].note).toContain('Final');
  });

  it('works when no intermediates are known', () => {
    const rows = buildHopTable({
      success: true,
      requested: 'https://bit.ly/abc',
      resolved: 'https://example.com/',
      responseCode: '',
      redirectCount: null,
      hops: [],
      error: '',
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].note).toBe('Final destination');
  });
});

describe('suspiciousFlags', () => {
  it('flags punycode lookalikes', () => {
    const f = suspiciousFlags('https://xn--pple-43d.com/login');
    expect(f.some((x) => x.label.includes('Punycode'))).toBe(true);
  });

  it('flags bare IP hosts', () => {
    expect(suspiciousFlags('http://192.0.2.1/login')).toHaveLength(1);
  });

  it('flags @ credential smuggling', () => {
    const f = suspiciousFlags('https://real-bank.com@evil.example/login');
    expect(f.some((x) => x.label.includes('@'))).toBe(true);
  });

  it('flags unusual ports and deep subdomains', () => {
    const f = suspiciousFlags('https://a.b.c.d.example.com:8443/x');
    expect(f.some((x) => x.label.includes('port'))).toBe(true);
    expect(f.some((x) => x.label.includes('subdomain'))).toBe(true);
  });

  it('flags very long query strings', () => {
    const f = suspiciousFlags('https://example.com/?q=' + 'x'.repeat(250));
    expect(f.some((x) => x.label.includes('query'))).toBe(true);
  });

  it('stays quiet on a clean URL', () => {
    expect(suspiciousFlags('https://example.com/about')).toEqual([]);
  });

  it('handles bad input', () => {
    expect(suspiciousFlags('not a url')).toEqual([]);
  });
});

describe('resolvedHost', () => {
  it('extracts the hostname', () => {
    expect(resolvedHost('https://sub.example.com/path?q=1')).toBe('sub.example.com');
  });
  it('returns empty on bad input', () => {
    expect(resolvedHost('junk')).toBe('');
  });
});
