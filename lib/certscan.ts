/**
 * Certificate Transparency subdomain extraction (crt.sh public logs).
 * Pure helpers — the page fetches from crt.sh and passes the JSON here.
 */

export interface CrtEntry {
  name_value?: string;
  [k: string]: unknown;
}

/** A sane hostname for CT lookup: labels of letters/digits/hyphens, TLD-ish tail. */
export function isValidDomain(s: string): boolean {
  return /^(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(s.trim());
}

/**
 * Turn crt.sh JSON rows into a sorted unique list of subdomains of `domain`.
 * Strips wildcard prefixes and drops entries from other domains.
 */
export function parseCrtsh(rows: unknown, domain: string): string[] {
  if (!Array.isArray(rows)) return [];
  const base = domain.trim().toLowerCase();
  const out = new Set<string>();
  for (const row of rows) {
    const nv = (row as CrtEntry)?.name_value;
    if (typeof nv !== 'string') continue;
    for (const line of nv.split('\n')) {
      let name = line.trim().toLowerCase();
      if (!name) continue;
      if (name.startsWith('*.')) name = name.slice(2);
      if (name === base || name.endsWith('.' + base)) out.add(name);
    }
  }
  return Array.from(out).sort();
}
