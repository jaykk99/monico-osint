/**
 * Wayback Machine (Internet Archive) CDX API helpers.
 * Keyless, CORS-enabled public endpoint. Pure parsers — the page fetches
 * the CDX JSON and passes it here.
 */

export interface Capture {
  /** CDX timestamp: YYYYMMDDhhmmss */
  timestamp: string;
  /** Original URL as crawled */
  original: string;
  /** HTTP status code as string (e.g. "200") */
  status: string;
  /** MIME type reported by the crawler */
  mimetype: string;
  /** Content digest — used for collapse=digest dedupe */
  digest: string;
}

const CDX = 'https://web.archive.org/cdx/search/cdx';

export interface CdxOptions {
  /** Max rows returned (default 500). */
  limit?: number;
  /** Collapse duplicate digests (default true) so each row is a distinct page version. */
  collapseDigest?: boolean;
  /** Only 2xx captures (default true). */
  onlyOk?: boolean;
}

/**
 * Build a CDX query URL for every captured URL under `domain`.
 * `matchType=domain` covers the bare domain plus all subdomains/paths.
 */
export function buildCdxUrl(domain: string, opts: CdxOptions = {}): string {
  const { limit = 500, collapseDigest = true, onlyOk = true } = opts;
  const q = new URLSearchParams({
    url: domain.trim().toLowerCase() + '/*',
    matchType: 'domain',
    output: 'json',
    fl: 'timestamp,original,statuscode,mimetype,digest',
    limit: String(limit),
  });
  if (collapseDigest) q.set('collapse', 'digest');
  if (onlyOk) q.set('filter', 'statuscode:200');
  return `${CDX}?${q.toString()}`;
}

/**
 * Parse a CDX JSON response. Row 0 is the header (field names);
 * every following row is one capture.
 */
export function parseCdx(json: unknown): Capture[] {
  if (!Array.isArray(json) || json.length < 2) return [];
  const header = json[0];
  if (!Array.isArray(header)) return [];
  const idx = (name: string) => header.indexOf(name);
  const iTs = idx('timestamp');
  const iUrl = idx('original');
  const iStatus = idx('statuscode');
  const iMime = idx('mimetype');
  const iDigest = idx('digest');
  if (iTs < 0 || iUrl < 0) return [];
  const out: Capture[] = [];
  for (const row of json.slice(1)) {
    if (!Array.isArray(row)) continue;
    const timestamp = String(row[iTs] ?? '');
    const original = String(row[iUrl] ?? '');
    if (!/^\d{14}$/.test(timestamp) || !original) continue;
    out.push({
      timestamp,
      original,
      status: String(row[iStatus] ?? ''),
      mimetype: String(row[iMime] ?? ''),
      digest: String(row[iDigest] ?? ''),
    });
  }
  return out;
}

/** Oldest capture (CDX returns oldest-first, but be explicit). */
export function earliestCapture(caps: Capture[]): Capture | null {
  if (!caps.length) return null;
  return caps.reduce((a, b) => (a.timestamp <= b.timestamp ? a : b));
}

/** Newest capture. */
export function latestCapture(caps: Capture[]): Capture | null {
  if (!caps.length) return null;
  return caps.reduce((a, b) => (a.timestamp >= b.timestamp ? a : b));
}

/** "20210415123045" -> "2021-04-15 12:30 UTC". Returns input on bad shape. */
export function formatTimestamp(ts: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts);
  if (!m) return ts;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]} UTC`;
}

/** Direct link to the archived page snapshot (`id_` = original HTML). */
export function snapshotUrl(timestamp: string, url: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${url}`;
}

/** Direct link to the Wayback availability calendar for a domain. */
export function calendarUrl(domain: string): string {
  return `https://web.archive.org/web/*/https://${domain.trim().toLowerCase()}/*`;
}

/** Year -> capture count, sorted ascending. Drives a small history bar. */
export function capturesPerYear(caps: Capture[]): Array<{ year: string; count: number }> {
  const map = new Map<string, number>();
  for (const c of caps) {
    const y = c.timestamp.slice(0, 4);
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
