/**
 * Chain detection from a wallet address string.
 * Pure function (no network) — shared by the Crypto Trace page and unit tests.
 */

export interface ChainGuess {
  chain: string;
  /** blockchair API slug, or null when live lookup isn't supported for the chain */
  blockchair: string | null;
}

export function guessChain(addr: string): ChainGuess {
  const a = addr.trim();
  if (/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(a)) return { chain: 'Bitcoin', blockchair: 'bitcoin' };
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return { chain: 'Ethereum', blockchair: 'ethereum' };
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return { chain: 'Solana (likely)', blockchair: null };
  if (/^T[a-zA-Z0-9]{33}$/.test(a)) return { chain: 'Tron', blockchair: null };
  if (/^r[a-zA-Z0-9]{24,34}$/.test(a)) return { chain: 'XRP', blockchair: 'ripple' };
  if (/^(addr1|stake1)/.test(a)) return { chain: 'Cardano', blockchair: 'cardano' };
  if (/^ltc1|^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(a)) return { chain: 'Litecoin', blockchair: 'litecoin' };
  if (/^D[A-Za-z0-9]{33}$/.test(a)) return { chain: 'Dogecoin', blockchair: 'dogecoin' };
  return { chain: 'Unknown', blockchair: null };
}

export const CHAIN_DECIMALS: Record<string, number> = {
  bitcoin: 8,
  ethereum: 18,
  ripple: 6,
  cardano: 6,
  litecoin: 8,
  dogecoin: 8,
};

export const CHAIN_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  ripple: 'XRP',
  cardano: 'ADA',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
};

/** Convert a raw on-chain integer amount to a human string. */
export function formatChainAmount(raw: number | string, blockchair: string): string {
  const d = CHAIN_DECIMALS[blockchair] ?? 8;
  return (Number(raw) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: 6 });
}
