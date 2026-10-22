/**
 * MailShield — email authentication posture from public DNS only.
 * Checks SPF, DMARC, MTA-STS, TLS-RPT and BIMI records via Cloudflare
 * DNS-over-HTTPS (keyless, CORS-enabled). Detection only: reads records
 * anyone can look up, never sends mail or probes the target's SMTP.
 */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'missing';

export interface MailCheck {
  /** SPF | DMARC | MTA-STS | TLS-RPT | BIMI */
  name: string;
  status: CheckStatus;
  /** Raw record text (unquoted), or '' when absent. */
  record: string;
  /** Plain-language explanation of what the status means. */
  detail: string;
}

export interface MailShieldResult {
  domain: string;
  checks: MailCheck[];
  /** 0-100 weighted posture score. */
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/* ------------------------------------------------------------------ */
/* query builders                                                      */
/* ------------------------------------------------------------------ */

/** TXT record names to query for one domain's mail posture. */
export function buildMailQueryNames(domain: string): {
  spf: string;
  dmarc: string;
  mtasts: string;
  tlsrpt: string;
  bimi: string;
} {
  const d = domain.trim().toLowerCase().replace(/\.$/, '');
  return {
    spf: d,
    dmarc: `_dmarc.${d}`,
    mtasts: `_mta-sts.${d}`,
    tlsrpt: `_tlsrpt.${d}`,
    bimi: `default._bimi.${d}`,
  };
}

/* ------------------------------------------------------------------ */
/* SPF                                                                 */
/* ------------------------------------------------------------------ */

export interface SpfParsed {
  record: string;
  /** -all, ~all, ?all, +all, or 'none' when no qualifier found */
  qualifier: '-all' | '~all' | '?all' | '+all' | 'none';
  includes: string[];
  ipRanges: string[];
  hasRedirect: boolean;
}

const SPF_ALL = /(^|\s)([-~?+]?)all(\s|$)/;

/** Find the v=spf1 record among TXT blobs and pull out its moving parts. */
export function parseSpf(txts: string[]): SpfParsed | null {
  const raw = txts.map((t) => t.replace(/^"(.*)"$/, '$1').trim());
  const rec = raw.find((t) => /^v=spf1(\s|$)/i.test(t));
  if (!rec) return null;
  const m = SPF_ALL.exec(rec.toLowerCase());
  const qualifier = (m ? (`${m[2] || '+'}all` as SpfParsed['qualifier']) : 'none');
  const includes = Array.from(rec.matchAll(/include:([^\s]+)/gi)).map((x) => x[1]);
  const ipRanges = Array.from(rec.matchAll(/ip[46]:([^\s]+)/gi)).map((x) => x[1]);
  return { record: rec, qualifier, includes, ipRanges, hasRedirect: /redirect=/i.test(rec) };
}

export function spfCheck(txts: string[]): MailCheck {
  const p = parseSpf(txts);
  if (!p) {
    return {
      name: 'SPF',
      status: 'missing',
      record: '',
      detail: 'No SPF record at the domain apex. Any sender can claim to be this domain.',
    };
  }
  if (p.qualifier === '-all') {
    return {
      name: 'SPF',
      status: 'pass',
      record: p.record,
      detail: `Hard fail (-all): receivers reject mail from unlisted senders. ${p.includes.length} include(s), ${p.ipRanges.length} IP range(s).`,
    };
  }
  if (p.qualifier === '~all') {
    return {
      name: 'SPF',
      status: 'warn',
      record: p.record,
      detail: 'Soft fail (~all): receivers flag but often still deliver spoofed mail. Tighten to -all when ready.',
    };
  }
  return {
    name: 'SPF',
    status: 'warn',
    record: p.record,
    detail: `Neutral/permissive ending (${p.qualifier === '+all' ? '+all' : p.qualifier}): offers receivers no signal. Use -all.`,
  };
}

/* ------------------------------------------------------------------ */
/* DMARC                                                               */
/* ------------------------------------------------------------------ */

export interface DmarcParsed {
  record: string;
  policy: 'reject' | 'quarantine' | 'none' | 'unknown';
  pct: number;
  rua: string[];
  ruf: string[];
}

const tag = (rec: string, name: string): string | null => {
  const m = new RegExp(`(?:^|;)\\s*${name}=([^;]+)`, 'i').exec(rec);
  return m ? m[1].trim() : null;
};

/** Parse the _dmarc TXT record. */
export function parseDmarc(txts: string[]): DmarcParsed | null {
  const raw = txts.map((t) => t.replace(/^"(.*)"$/, '$1').trim());
  const rec = raw.find((t) => /^v=dmarc1/i.test(t));
  if (!rec) return null;
  const pRaw = (tag(rec, 'p') ?? '').toLowerCase();
  const policy: DmarcParsed['policy'] =
    pRaw === 'reject' || pRaw === 'quarantine' || pRaw === 'none' ? pRaw : 'unknown';
  const pctRaw = parseInt(tag(rec, 'pct') ?? '100', 10);
  return {
    record: rec,
    policy,
    pct: Number.isNaN(pctRaw) ? 100 : Math.min(100, Math.max(0, pctRaw)),
    rua: (tag(rec, 'rua') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    ruf: (tag(rec, 'ruf') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

export function dmarcCheck(txts: string[]): MailCheck {
  const p = parseDmarc(txts);
  if (!p) {
    return {
      name: 'DMARC',
      status: 'missing',
      record: '',
      detail: 'No DMARC policy at _dmarc. SPF/DKIM results cannot be enforced by receivers.',
    };
  }
  if (p.policy === 'reject' && p.pct === 100) {
    return {
      name: 'DMARC',
      status: 'pass',
      record: p.record,
      detail: `p=reject at 100%: spoofed mail is refused outright.${p.rua.length ? ` Reports to ${p.rua[0]}.` : ''}`,
    };
  }
  if (p.policy === 'reject') {
    return {
      name: 'DMARC',
      status: 'warn',
      record: p.record,
      detail: `p=reject but pct=${p.pct}: only part of spoofed mail is rejected. Raise pct to 100.`,
    };
  }
  if (p.policy === 'quarantine') {
    return {
      name: 'DMARC',
      status: 'warn',
      record: p.record,
      detail: 'p=quarantine: spoofed mail lands in spam instead of being refused. Move to reject when clean.',
    };
  }
  return {
    name: 'DMARC',
    status: 'fail',
    record: p.record,
    detail: 'p=none: monitoring only — receivers take no action on spoofed mail.',
  };
}

/* ------------------------------------------------------------------ */
/* MTA-STS / TLS-RPT / BIMI                                            */
/* ------------------------------------------------------------------ */

export function mtastsCheck(txts: string[]): MailCheck {
  const raw = txts.map((t) => t.replace(/^"(.*)"$/, '$1').trim());
  const rec = raw.find((t) => /^v=sts/i.test(t));
  if (!rec) {
    return {
      name: 'MTA-STS',
      status: 'missing',
      record: '',
      detail: 'No _mta-sts record. Opportunistic TLS can be stripped on the wire.',
    };
  }
  const id = tag(rec, 'id');
  return {
    name: 'MTA-STS',
    status: 'pass',
    record: rec,
    detail: `STS record present${id ? ` (id=${id})` : ''}. Note: also needs an HTTPS policy at mta-sts.${''} to fully enforce.`,
  };
}

export function tlsrptCheck(txts: string[]): MailCheck {
  const raw = txts.map((t) => t.replace(/^"(.*)"$/, '$1').trim());
  const rec = raw.find((t) => /^v=tlsrptv1/i.test(t));
  if (!rec) {
    return {
      name: 'TLS-RPT',
      status: 'missing',
      record: '',
      detail: 'No TLS-RPT record. Delivery/TLS failures go unreported — misconfigurations stay invisible.',
    };
  }
  const rua = tag(rec, 'rua');
  return {
    name: 'TLS-RPT',
    status: 'pass',
    record: rec,
    detail: `TLS failure reports go to${rua ? ` ${rua}` : ' the configured address'}.`,
  };
}

export function bimiCheck(txts: string[]): MailCheck {
  const raw = txts.map((t) => t.replace(/^"(.*)"$/, '$1').trim());
  const rec = raw.find((t) => /^v=bimi1/i.test(t));
  if (!rec) {
    return {
      name: 'BIMI',
      status: 'missing',
      record: '',
      detail: 'No BIMI record. Optional — a verified logo shows in inboxes once DMARC is at reject/quarantine.',
    };
  }
  return {
    name: 'BIMI',
    status: 'pass',
    record: rec,
    detail: 'BIMI record present. Logo mark shows for receivers that support it.',
  };
}

/* ------------------------------------------------------------------ */
/* scoring                                                             */
/* ------------------------------------------------------------------ */

const SCORE: Record<CheckStatus, Record<string, number>> = {
  pass: { DMARC: 40, SPF: 30, 'MTA-STS': 15, 'TLS-RPT': 10, BIMI: 5 },
  warn: { DMARC: 22, SPF: 15, 'MTA-STS': 8, 'TLS-RPT': 5, BIMI: 2 },
  fail: { DMARC: 5, SPF: 5, 'MTA-STS': 0, 'TLS-RPT': 0, BIMI: 0 },
  missing: { DMARC: 0, SPF: 0, 'MTA-STS': 0, 'TLS-RPT': 0, BIMI: 0 },
};

/** Weighted score from the five checks; DMARC+SPF carry 70% of the weight. */
export function scoreShield(checks: MailCheck[]): number {
  return checks.reduce((sum, c) => sum + (SCORE[c.status][c.name] ?? 0), 0);
}

export function gradeFor(score: number): MailShieldResult['grade'] {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 45) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

export function buildResult(domain: string, txtByCheck: Record<string, string[]>): MailShieldResult {
  const checks = [
    spfCheck(txtByCheck.spf ?? []),
    dmarcCheck(txtByCheck.dmarc ?? []),
    mtastsCheck(txtByCheck.mtasts ?? []),
    tlsrptCheck(txtByCheck.tlsrpt ?? []),
    bimiCheck(txtByCheck.bimi ?? []),
  ];
  const score = scoreShield(checks);
  return { domain, checks, score, grade: gradeFor(score) };
}

/** Copy-paste starter records for the failing/missing checks. */
export function fixSuggestions(result: MailShieldResult): string[] {
  const out: string[] = [];
  const byName = Object.fromEntries(result.checks.map((c) => [c.name, c]));
  const spf = byName['SPF'];
  if (spf && spf.status !== 'pass') {
    out.push(
      `SPF — publish at the apex TXT: "v=spf1 include:_spf.google.com -all" (swap the include for your mail provider, then add every service that sends as you before switching -all on).`
    );
  }
  const dmarc = byName['DMARC'];
  if (dmarc && dmarc.status !== 'pass') {
    out.push(
      `DMARC — publish at _dmarc.${result.domain} TXT: "v=DMARC1; p=reject; rua=mailto:dmarc@${result.domain}; fo=1". Start with p=none to read reports, raise to reject after a clean week.`
    );
  }
  const sts = byName['MTA-STS'];
  if (sts && sts.status !== 'pass') {
    out.push(
      `MTA-STS — serve a policy file at https://mta-sts.${result.domain}/.well-known/mta-sts.txt (mode: enforce; max_age: 2592000), then publish _mta-sts.${result.domain} TXT "v=STSv1; id=1".`
    );
  }
  const rpt = byName['TLS-RPT'];
  if (rpt && rpt.status !== 'pass') {
    out.push(
      `TLS-RPT — publish at _tlsrpt.${result.domain} TXT: "v=TLSRPTv1; rua=mailto:tls@${result.domain}" so delivery TLS failures get reported to you.`
    );
  }
  return out;
}
