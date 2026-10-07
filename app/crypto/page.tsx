'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

function guessChain(addr: string): string {
  const a = addr.trim();
  if (/^(bc1|1|3)[a-zA-Z0-9]{25,62}$/.test(a)) return 'Bitcoin';
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return 'Ethereum / EVM';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return 'Solana (likely)';
  if (/^T[a-zA-Z0-9]{33}$/.test(a)) return 'Tron';
  if (/^r[a-zA-Z0-9]{24,34}$/.test(a)) return 'XRP';
  if (/^(addr1|stake1)/.test(a)) return 'Cardano';
  if (/^ltc1|^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(a)) return 'Litecoin';
  if (/^D[A-Za-z0-9]{33}$/.test(a)) return 'Dogecoin';
  return 'Unknown';
}

const EXPLORERS = [
  { name: 'Blockchain.com (BTC)', url: (a: string) => `https://www.blockchain.com/explorer/addresses/btc/${a}` },
  { name: 'Mempool.space (BTC)', url: (a: string) => `https://mempool.space/address/${a}` },
  { name: 'Etherscan (ETH)', url: (a: string) => `https://etherscan.io/address/${a}` },
  { name: 'Solscan (SOL)', url: (a: string) => `https://solscan.io/account/${a}` },
  { name: 'Tronscan (TRX)', url: (a: string) => `https://tronscan.org/#/address/${a}` },
  { name: 'XRPScan (XRP)', url: (a: string) => `https://xrpscan.com/account/${a}` },
  { name: 'Cardanoscan (ADA)', url: (a: string) => `https://cardanoscan.io/address/${a}` },
  { name: 'Blockchair (multi-chain)', url: (a: string) => `https://blockchair.com/search?q=${a}` },
];

export default function CryptoPage() {
  const [addr, setAddr] = useState('');
  const [searched, setSearched] = useState('');
  const a = searched.trim();

  return (
    <Shell title="₿ Crypto Tracing" sub="Multi-chain wallet lookups">
      <div className="ns-panel">
        <h2>Wallet address</h2>
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Paste a wallet address"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSearched(addr); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={() => setSearched(addr)} disabled={!addr.trim()}>
            Trace
          </button>
        </div>
        {a && (
          <p className="ns-kv" style={{ marginTop: 12 }}>
            Detected chain: <b>{guessChain(a)}</b>
          </p>
        )}
      </div>

      {a && (
        <div className="ns-panel">
          <h2>Block explorers</h2>
          <div className="ns-link-list">
            {EXPLORERS.map((e) => (
              <a key={e.name} href={e.url(encodeURIComponent(a))} target="_blank" rel="noreferrer" className="ns-link">
                <span>{e.name}</span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
          <p className="ns-note">Always verify the address on at least two explorers before acting on what you find.</p>
        </div>
      )}
    </Shell>
  );
}
