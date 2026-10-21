import { describe, expect, it } from 'vitest';
import {
  DNS_TYPES,
  buildDohUrl,
  parseDoh,
  formatRecord,
  sortMx,
  resultSummary,
} from '../lib/dnsrecords';

describe('DNS_TYPES', () => {
  it('covers the common public record types', () => {
    expect(DNS_TYPES).toContain('A');
    expect(DNS_TYPES).toContain('MX');
    expect(DNS_TYPES).toContain('TXT');
    expect(DNS_TYPES).toContain('NS');
  });
});

describe('buildDohUrl', () => {
  it('builds a Cloudflare DoH query', () => {
    const u = buildDohUrl('Example.COM.', 'MX');
    expect(u).toContain('cloudflare-dns.com/dns-query');
    expect(u).toContain('name=example.com.');
    expect(u).toContain('type=MX');
  });
});

describe('parseDoh', () => {
  const json = {
    Status: 0,
    AD: true,
    Question: [{ name: 'example.com' }],
    Answer: [
      { type: 'MX', data: '10 mail.example.com', TTL: 3600 },
      { type: 'MX', data: '20 backup.example.com', TTL: 3600 },
      { data: 'no-type-field', TTL: 60 },
      { type: 'MX' }, // no data — skipped
    ],
  };

  it('parses answers with status and AA bit', () => {
    const r = parseDoh(json, 'MX');
    expect(r.name).toBe('example.com');
    expect(r.type).toBe('MX');
    expect(r.status).toBe('NoError');
    expect(r.authoritative).toBe(true);
    expect(r.answers).toHaveLength(3);
    expect(r.answers[0]).toEqual({ type: 'MX', data: '10 mail.example.com', ttl: 3600 });
  });

  it('names DNS error statuses', () => {
    expect(parseDoh({ Status: 3 }, 'A').status).toBe('NXDomain');
    expect(parseDoh({ Status: 2 }, 'A').status).toBe('ServFail');
  });

  it('handles missing Answer gracefully', () => {
    const r = parseDoh({ Status: 0 }, 'TXT');
    expect(r.answers).toEqual([]);
    expect(r.status).toBe('NoError');
  });

  it('handles junk input', () => {
    const r = parseDoh(null, 'A');
    expect(r.answers).toEqual([]);
    expect(r.status).toBe('Unknown');
  });
});

describe('formatRecord', () => {
  it('strips TXT quotes', () => {
    expect(formatRecord({ type: 'TXT', data: '"v=spf1 include:x.com ~all"', ttl: 300 })).toEqual({
      label: 'TXT',
      value: 'v=spf1 include:x.com ~all',
    });
  });

  it('splits MX priority and exchange', () => {
    expect(formatRecord({ type: 'MX', data: '10 mail.example.com', ttl: 3600 })).toEqual({
      label: 'MX (prio 10)',
      value: 'mail.example.com',
    });
  });

  it('summarises SOA records', () => {
    const f = formatRecord({
      type: 'SOA',
      data: 'ns1.example.com admin.example.com 2021010101 7200 3600 1209600 3600',
      ttl: 3600,
    });
    expect(f.label).toBe('SOA');
    expect(f.value).toContain('serial 2021010101');
  });

  it('passes A records through', () => {
    expect(formatRecord({ type: 'A', data: '93.184.216.34', ttl: 300 })).toEqual({
      label: 'A',
      value: '93.184.216.34',
    });
  });
});

describe('sortMx', () => {
  it('sorts MX by priority ascending', () => {
    const in_ = [
      { type: 'MX', data: '20 backup.example.com', ttl: 1 },
      { type: 'MX', data: '10 mail.example.com', ttl: 1 },
    ];
    expect(sortMx(in_).map((a) => a.data)).toEqual([
      '10 mail.example.com',
      '20 backup.example.com',
    ]);
  });

  it('does not reorder malformed entries', () => {
    const in_ = [
      { type: 'MX', data: 'no-priority-here', ttl: 1 },
      { type: 'MX', data: '10 mail.example.com', ttl: 1 },
    ];
    expect(sortMx(in_).map((a) => a.data)[1]).toBe('10 mail.example.com');
  });
});

describe('resultSummary', () => {
  it('summarises counts and errors', () => {
    const ok = (n: number) =>
      resultSummary({ name: 'x', type: 'A', authoritative: false, status: 'NoError', answers: Array(n).fill({ type: 'A', data: '1.2.3.4', ttl: 1 }) });
    expect(ok(1)).toBe('1 record');
    expect(ok(3)).toBe('3 records');
    expect(ok(0)).toBe('No records');
    expect(
      resultSummary({ name: 'x', type: 'A', authoritative: false, status: 'NXDomain', answers: [] })
    ).toBe('NXDomain');
  });
});
