import { describe, expect, it } from 'vitest';
import { guessChain, formatChainAmount, CHAIN_SYMBOLS } from '../lib/chains';

describe('guessChain', () => {
  it('detects Bitcoin (bech32, P2PKH, P2SH)', () => {
    expect(guessChain('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4').chain).toBe('Bitcoin');
    expect(guessChain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').chain).toBe('Bitcoin');
    expect(guessChain('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy').chain).toBe('Bitcoin');
    expect(guessChain('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4').blockchair).toBe('bitcoin');
  });

  it('detects Ethereum, Tron, XRP, Cardano, Litecoin, Dogecoin', () => {
    expect(guessChain('0x' + 'a'.repeat(40))).toMatchObject({ chain: 'Ethereum', blockchair: 'ethereum' });
    // Tron: 34 chars starting with T that are NOT valid base58, so the
    // earlier Solana check (base58, 32-44 chars) does not shadow it.
    expect(guessChain('T0' + 'A'.repeat(32))).toMatchObject({ chain: 'Tron', blockchair: null });
    expect(guessChain('r' + 'B'.repeat(30))).toMatchObject({ chain: 'XRP', blockchair: 'ripple' });
    expect(guessChain('addr1' + 'q'.repeat(50))).toMatchObject({ chain: 'Cardano', blockchair: 'cardano' });
    expect(guessChain('ltc1' + 'q'.repeat(38))).toMatchObject({ chain: 'Litecoin', blockchair: 'litecoin' });
    expect(guessChain('D0' + 'A'.repeat(32))).toMatchObject({ chain: 'Dogecoin', blockchair: 'dogecoin' });
  });

  it('flags Solana as likely without live lookup', () => {
    // 44-char base58 that is not a BTC/XRP/DOGE shape hits the Solana fallback
    const r = guessChain('E' + '9'.repeat(43));
    expect(r.chain).toBe('Solana (likely)');
    expect(r.blockchair).toBeNull();
  });

  it('returns Unknown for garbage input', () => {
    expect(guessChain('notawallet')).toMatchObject({ chain: 'Unknown', blockchair: null });
    expect(guessChain('')).toMatchObject({ chain: 'Unknown' });
    expect(guessChain('   ')).toMatchObject({ chain: 'Unknown' });
  });

  it('trims surrounding whitespace', () => {
    expect(guessChain('  1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa  ').chain).toBe('Bitcoin');
  });
});

describe('formatChainAmount', () => {
  it('converts satoshis to BTC', () => {
    expect(formatChainAmount(100000000, 'bitcoin')).toBe('1');
  });

  it('converts wei to ETH', () => {
    expect(formatChainAmount('1000000000000000000', 'ethereum')).toBe('1');
  });

  it('falls back to 8 decimals for unknown chains', () => {
    expect(formatChainAmount(250000000, 'mystery')).toBe('2.5');
  });
});

describe('CHAIN_SYMBOLS', () => {
  it('has a symbol for every supported live chain', () => {
    for (const slug of ['bitcoin', 'ethereum', 'ripple', 'cardano', 'litecoin', 'dogecoin']) {
      expect(CHAIN_SYMBOLS[slug]).toBeTruthy();
    }
  });
});
