/**
 * URL unshortener / redirect-chain expander.
 * Uses the keyless unshorten.me JSON API (pure parsers — the page fetches).
 * Plus defensive client-side heuristics that flag common phishing tricks in
 * the resolved URL. This is a safety inspection of a *link*, never a lookup
 * of a person.
 */

export interface UnshortenResult {
  success: boolean;
  requested: string;
  /** Final destination after all redirects. */
  resolved: string;
  /** HTTP status of the final fetch, e.g. "200". */
  responseCode: string;
  /** Number of hops if the API reports one. */
  redirectCount: number | null;
  /** Full hop list when the API exposes it. */
  hops: string[];
  error: string;
}

interface UnshortenJson {
  success?: boolean;
  requested_url?: string;
  resolved_url?: string;
  response_code?: number | string;
  redirects?: number | string[] | Array<{ url?: string }>;
  error?: string;
  [k: string]: unknown;
}

/** Accept http(s) URLs only — no javascript:, data:, file: schemes. */
export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Keyless unshorten.me JSON endpoint. */
export function buildUnshortenUrl(u: string): string {
  return `https://unshorten.me/json/${encodeURIComponent(u.trim())}`;
}

/**
 * Parse unshorten.me JSON defensively: `redirects` may arrive as a count,
 * an array of URLs, or an array of {url} objects — handle all three.
 */
export function parseUnshorten(json: unknown): UnshortenResult {
  const j = (json ?? {}) as UnshortenJson;
  const requested = typeof j.requested_url === 'string' ? j.requested_url : '';
  const resolved = typeof j.resolved_url === 'string' ? j.resolved_url : '';
  const responseCode = String(j.response_code ?? '');
  let redirectCount: number | null = null;
  let hops: string[] = [];
  if (typeof j.redirects === 'number') {
    redirectCount = j.redirects;
  } else if (Array.isArray(j.redirects)) {
    hops = j.redirects
      .map((r) => (typeof r === 'string' ? r : typeof r?.url === 'string' ? r.url : ''))
      .filter(Boolean);
    redirectCount = hops.length;
  }
  const success = j.success === true && !!resolved;
  return {
    success,
    requested,
    resolved,
    responseCode,
    redirectCount,
    hops,
    error: typeof j.error === 'string' ? j.error : success ? '' : 'Could not expand this URL.',
  };
}

export interface Hop {
  step: number;
  url: string;
  note: string;
}

/**
 * Build the display hop table: requested URL first, any intermediate hops
 * the API reported, then the final destination. When no intermediates are
 * known the table honestly shows just start -> finish.
 */
export function buildHopTable(r: UnshortenResult): Hop[] {
  const rows: Hop[] = [];
  const chain = r.hops.length ? r.hops : [];
  if (r.requested) rows.push({ step: 0, url: r.requested, note: 'Short / starting URL' });
  chain.forEach((u, i) => rows.push({ step: i + 1, url: u, note: 'Redirect hop' }));
  if (r.resolved && r.resolved !== r.requested) {
    rows.push({
      step: chain.length + 1,
      url: r.resolved,
      note: `Final destination${r.responseCode ? ` (HTTP ${r.responseCode})` : ''}`,
    });
  }
  return rows;
}

export interface Flag {
  /** Short label, e.g. "Punycode domain". */
  label: string;
  /** One-line plain-English explanation. */
  detail: string;
}

/**
 * Lightweight phishing heuristics over the resolved URL. These flag
 * *suspicious patterns in a link* (IDN lookalikes, IP hosts, credential
 * smuggling with @, odd ports, excessive query length) — not people.
 */
export function suspiciousFlags(raw: string): Flag[] {
  const flags: Flag[] = [];
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return flags;
  }
  const host = u.hostname.toLowerCase();

  if (host.startsWith('xn--') || host.includes('.xn--')) {
    flags.push({
      label: 'Punycode / lookalike domain',
      detail: 'The domain uses encoded characters that can mimic a real brand name.',
    });
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[[0-9a-f:]+\]$/.test(host)) {
    flags.push({
      label: 'IP address host',
      detail: 'Legitimate sites almost never link you to a bare IP address.',
    });
  }
  if (u.username || u.password || raw.includes('@')) {
    flags.push({
      label: 'Credentials or @ in URL',
      detail: 'Everything before the @ is ignored by browsers — a classic misdirection trick.',
    });
  }
  if (u.port && !['80', '443', ''].includes(u.port)) {
    flags.push({
      label: `Unusual port :${u.port}`,
      detail: 'Normal web links use no port (or 80/443). Odd ports can hide odd servers.',
    });
  }
  if ((u.search + u.hash).length > 200) {
    flags.push({
      label: 'Very long query string',
      detail: 'Excessively long parameters can hide tracking or exploit payloads.',
    });
  }
  const labels = host.split('.');
  if (labels.length > 4) {
    flags.push({
      label: 'Many subdomains',
      detail: 'Deep subdomain chains are often used to look like a trusted site.',
    });
  }
  return flags;
}

/** Host of the resolved URL for the summary line. Empty on bad input. */
export function resolvedHost(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}
