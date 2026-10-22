/**
 * IconHash — fetch a site's favicon and fingerprint it.
 * Favicon hashes (Shodan's http.favicon.hash = murmur3 of the base64 bytes)
 * correlate otherwise-unrelated sites sharing one backend. Detection only:
 * reads the public favicon, no probing beyond the icon URLs themselves.
 */

/* ------------------------------------------------------------------ */
/* candidates                                                          */
/* ------------------------------------------------------------------ */

/** Strip a URL down to its origin ("https://example.com"). */
export function originOf(url: string): string | null {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return null;
  }
}

/**
 * Favicon URLs to try, in order. The origin plus the common
 * well-known paths covers ~everything without parsing HTML first.
 */
export function faviconCandidates(url: string): string[] {
  const origin = originOf(url);
  if (!origin) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of ['/favicon.ico', '/apple-touch-icon.png', '/favicon-32x32.png', '/favicon-16x16.png', '/assets/favicon.ico']) {
    const full = origin + p;
    if (!seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* murmurhash3 x86 32-bit — the algorithm Shodan uses for favicons     */
/* ------------------------------------------------------------------ */

function rotl32(x: number, r: number): number {
  return ((x << r) | (x >>> (32 - r))) >>> 0;
}

function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * murmurhash3_x86_32 over a string (UTF-16 code units) or raw bytes.
 * Known vector: murmurhash3_32('hello', 0) === 613153351.
 */
export function murmurhash3_32(data: string | Uint8Array, seed = 0): number {
  const bytes: Uint8Array =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const len = bytes.length;
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  const nblocks = Math.floor(len / 4);
  for (let i = 0; i < nblocks; i++) {
    let k1 =
      (bytes[i * 4] |
        (bytes[i * 4 + 1] << 8) |
        (bytes[i * 4 + 2] << 16) |
        (bytes[i * 4 + 3] << 24)) >>>
      0;
    k1 = Math.imul(k1, c1);
    k1 = rotl32(k1, 15);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
    h1 = rotl32(h1, 13);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }

  // tail
  let k1 = 0;
  const tail = nblocks * 4;
  switch (len & 3) {
    case 3:
      k1 ^= bytes[tail + 2] << 16;
    // falls through
    case 2:
      k1 ^= bytes[tail + 1] << 8;
    // falls through
    case 1:
      k1 ^= bytes[tail];
      k1 = Math.imul(k1, c1);
      k1 = rotl32(k1, 15);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= len;
  return fmix32(h1);
}

/** Chunked base64 encode of raw bytes (btoa chokes on big arrays). */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const part = bytes.subarray(i, i + CHUNK);
    let s = '';
    for (let j = 0; j < part.length; j++) s += String.fromCharCode(part[j]);
    bin += s;
  }
  return btoa(bin);
}

/**
 * Shodan's http.favicon.hash: murmur3_32 of the base64-encoded icon,
 * rendered as a signed 32-bit integer.
 */
export function shodanFaviconHash(iconBytes: Uint8Array): number {
  const unsigned = murmurhash3_32(bytesToBase64(iconBytes), 0);
  return unsigned > 0x7fffffff ? unsigned - 0x100000000 : unsigned;
}

/** SHA-256 hex of raw bytes (Web Crypto, async). */
export async function sha256Hex(iconBytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', iconBytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Shodan search URL for a favicon hash. */
export function shodanSearchUrl(hash: number | string): string {
  return `https://www.shodan.io/search?query=http.favicon.hash%3A${hash}`;
}

/** Censys-style hint text for the UI. */
export function hashSummary(bytes: number): string {
  if (bytes === 0) return 'empty file';
  if (bytes < 1024) return `${bytes} B — tiny, likely a generic icon`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
