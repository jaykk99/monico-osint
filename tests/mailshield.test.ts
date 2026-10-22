import { describe, expect, it } from 'vitest';
import {
  buildMailQueryNames,
  parseSpf,
  spfCheck,
  parseDmarc,
  dmarcCheck,
  mtastsCheck,
  tlsrptCheck,
  bimiCheck,
  scoreShield,
  gradeFor,
  buildResult,
  fixSuggestions,
} from '../lib/mailshield';

describe('buildMailQueryNames', () => {
  it('builds the five record names from a domain', () => {
    const q = buildMailQueryNames('Example.COM.');
    expect(q.spf).toBe('example.com');
    expect(q.dmarc).toBe('_dmarc.example.com');
    expect(q.mtasts).toBe('_mta-sts.example.com');
    expect(q.tlsrpt).toBe('_tlsrpt.example.com');
    expect(q.bimi).toBe('default._bimi.example.com');
  });
});

describe('parseSpf / spfCheck', () => {
  const GOOD = ['"v=spf1 include:_spf.google.com ip4:1.2.3.4 -all"'];
  const SOFT = ['"v=spf1 include:mailgun.org ~all"'];
  const NONE = ['"some other txt"'];

  it('parses includes, ranges and hard-fail qualifier', () => {
    const p = parseSpf(GOOD)!;
    expect(p.qualifier).toBe('-all');
    expect(p.includes).toEqual(['_spf.google.com']);
    expect(p.ipRanges).toEqual(['1.2.3.4']);
  });

  it('passes on hard fail, warns on soft fail', () => {
    expect(spfCheck(GOOD).status).toBe('pass');
    expect(spfCheck(SOFT).status).toBe('warn');
    expect(spfCheck(SOFT).record).toContain('~all');
  });

  it('reports missing when no v=spf1 record exists', () => {
    const c = spfCheck(NONE);
    expect(c.status).toBe('missing');
    expect(c.record).toBe('');
  });

  it('flags +all as permissive', () => {
    expect(spfCheck(['"v=spf1 +all"']).status).toBe('warn');
  });
});

describe('parseDmarc / dmarcCheck', () => {
  const REJECT = ['"v=DMARC1; p=reject; rua=mailto:dmarc@example.com; fo=1"'];
  const NONE = ['"v=DMARC1; p=none; pct=50"'];

  it('parses policy, pct and rua', () => {
    const p = parseDmarc(REJECT)!;
    expect(p.policy).toBe('reject');
    expect(p.pct).toBe(100);
    expect(p.rua).toEqual(['mailto:dmarc@example.com']);
  });

  it('passes on full reject, fails on none', () => {
    expect(dmarcCheck(REJECT).status).toBe('pass');
    expect(dmarcCheck(NONE).status).toBe('fail');
  });

  it('warns when reject is not at 100%', () => {
    const c = dmarcCheck(['"v=DMARC1; p=reject; pct=25"']);
    expect(c.status).toBe('warn');
    expect(c.detail).toContain('pct=25');
  });

  it('reports missing when no record', () => {
    expect(dmarcCheck(['"hello"']).status).toBe('missing');
  });
});

describe('mtastsCheck / tlsrptCheck / bimiCheck', () => {
  it('passes when the record exists', () => {
    expect(mtastsCheck(['"v=STSv1; id=20260101"']).status).toBe('pass');
    expect(tlsrptCheck(['"v=TLSRPTv1; rua=mailto:tls@example.com"']).status).toBe('pass');
    expect(bimiCheck(['"v=BIMI1; l=https://example.com/logo.svg"']).status).toBe('pass');
  });

  it('reports missing when absent', () => {
    expect(mtastsCheck([]).status).toBe('missing');
    expect(tlsrptCheck([]).status).toBe('missing');
    expect(bimiCheck([]).status).toBe('missing');
  });
});

describe('scoring', () => {
  it('perfect posture scores 100 and grades A', () => {
    const r = buildResult('example.com', {
      spf: ['"v=spf1 -all"'],
      dmarc: ['"v=DMARC1; p=reject"'],
      mtasts: ['"v=STSv1; id=1"'],
      tlsrpt: ['"v=TLSRPTv1; rua=mailto:x@y.z"'],
      bimi: ['"v=BIMI1; l=https://x/y.svg"'],
    });
    expect(r.score).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.checks).toHaveLength(5);
  });

  it('empty posture scores 0 and grades F', () => {
    const r = buildResult('example.com', {});
    expect(r.score).toBe(0);
    expect(r.grade).toBe('F');
  });

  it('gradeFor buckets', () => {
    expect(gradeFor(95)).toBe('A');
    expect(gradeFor(70)).toBe('B');
    expect(gradeFor(45)).toBe('C');
    expect(gradeFor(20)).toBe('D');
    expect(gradeFor(0)).toBe('F');
  });

  it('scoreShield weights DMARC+SPF at 70', () => {
    expect(scoreShield([])).toBe(0);
  });

  it('fixSuggestions names the missing checks', () => {
    const r = buildResult('example.com', {});
    const fixes = fixSuggestions(r);
    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes.join('\n')).toContain('example.com');
  });

  it('fixSuggestions is empty for a perfect record', () => {
    const r = buildResult('example.com', {
      spf: ['"v=spf1 -all"'],
      dmarc: ['"v=DMARC1; p=reject"'],
      mtasts: ['"v=STSv1; id=1"'],
      tlsrpt: ['"v=TLSRPTv1; rua=mailto:x@y.z"'],
    });
    expect(fixSuggestions(r)).toHaveLength(0);
  });
});
