/**
 * DNS record lookup via Cloudflare DNS-over-HTTPS (dns-json).
 * Keyless, CORS-enabled public endpoint. Pure parsers — the page fetches
 * the DoH JSON and passes it here.
 */

export const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA'] as const;
export type DnsType = (typeof DNS_TYPES)[number];

export interface DnsAnswer {
  /** Record type as returned by DoH (numeric or string). */
  type: string;
  /** Record data, e.g. an IP, an MX exchange, a TXT blob. */
  data: string;
  /** TTL in seconds. */
  ttl: number;
}

export interface DnsResult {
  name: string;
  type: DnsType;
  /** Authoritative answer bit from the DoH response. */
  authoritative: boolean;
  answers: DnsAnswer[];
  /** e.g. "NoError", "NXDomain" */
  status: string;
}

/** Cloudflare DoH JSON endpoint. */
export function buildDohUrl(name: string, type: DnsType): string {
  const q = new URLSearchParams({ name: name.trim().toLowerCase(), type });
  return `https://cloudflare-dns.com/dns-query?${q.toString()}`;
}

interface DohJson {
  Status?: number;
  AD?: boolean;
  Question?: Array<{ name?: string }>;
  Answer?: Array<{ type?: number | string; data?: string; TTL?: number }>;
  [k: string]: unknown;
}

const STATUS_NAMES: Record<number, string> = {
  0: 'NoError',
  1: 'FormErr',
  2: 'ServFail',
  3: 'NXDomain',
  4: 'NotImp',
  5: 'Refused',
};

/** Parse a Cloudflare dns-json response into a DnsResult. */
export function parseDoh(json: unknown, type: DnsType): DnsResult {
  const j = (json ?? {}) as DohJson;
  const status = STATUS_NAMES[typeof j.Status === 'number' ? j.Status : -1] ?? 'Unknown';
  const name = j.Question?.[0]?.name ?? '';
  const answers: DnsAnswer[] = [];
  if (Array.isArray(j.Answer)) {
    for (const a of j.Answer) {
      if (typeof a?.data !== 'string') continue;
      answers.push({
        type: String(a.type ?? type),
        data: a.data,
        ttl: typeof a.TTL === 'number' ? a.TTL : 0,
      });
    }
  }
  return { name, type, authoritative: j.AD === true, answers, status };
}

/**
 * Pretty-print one record for display.
 * - TXT: strip the surrounding quotes DoH adds.
 * - MX: split "10 mail.example.com" into priority + exchange.
 */
export function formatRecord(a: DnsAnswer): { label: string; value: string } {
  if (a.type === 'TXT') {
    const unquoted = a.data.replace(/^"(.*)"$/, '$1');
    return { label: 'TXT', value: unquoted };
  }
  if (a.type === 'MX') {
    const m = /^(\d+)\s+(.+)$/.exec(a.data.trim());
    if (m) return { label: `MX (prio ${m[1]})`, value: m[2] };
  }
  if (a.type === 'SOA') {
    const parts = a.data.trim().split(/\s+/);
    // mname rname serial refresh retry expire minimum
    if (parts.length >= 2) {
      return { label: 'SOA', value: `${parts[0]} · admin ${parts[1]} · serial ${parts[2] ?? '?'}` };
    }
  }
  return { label: a.type, value: a.data };
}

/** MX answers sorted by priority (lowest first). Non-MX untouched. */
export function sortMx(answers: DnsAnswer[]): DnsAnswer[] {
  return [...answers].sort((a, b) => {
    const pa = parseInt(a.data, 10);
    const pb = parseInt(b.data, 10);
    if (Number.isNaN(pa) || Number.isNaN(pb)) return 0;
    return pa - pb;
  });
}

/** One-line summary used in the result header. */
export function resultSummary(r: DnsResult): string {
  if (r.status !== 'NoError') return r.status;
  if (!r.answers.length) return 'No records';
  return `${r.answers.length} record${r.answers.length === 1 ? '' : 's'}`;
}
