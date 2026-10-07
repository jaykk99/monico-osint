'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

function guessChain(addr: string): { chain: string; blockchair: string | null } {
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

interface ChainData {
  balance: string;
  txCount: number;
  totalReceived: string;
  totalSent: string;
}

export default function CryptoPage() {
  const [addr, setAddr] = useState('');
  const [searched, setSearched] = useState('');
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const a = searched.trim();
  const { chain, blockchair } = a ? guessChain(a) : { chain: '', blockchair: null };

  const trace = async () => {
    const target = addr.trim();
    if (!target) return;
    setSearched(target);
    setData(null);
    setError('');
    const { blockchair: bc } = guessChain(target);
    if (!bc) {
      setError('Live balance lookup isn\'t supported for this chain yet — use the explorers below.');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(
        `https://api.blockchair.com/${bc}/dashboards/address/${encodeURIComponent(target)}?limit=1`
      );
      if (!r.ok) throw new Error('lookup failed');
      const j = await r.json();
      const info = j?.data?.[target]?.address;
      if (!info) throw new Error('no data');
      const decimals = { bitcoin: 8, ethereum: 18, ripple: 6, cardano: 6, litecoin: 8, dogecoin: 8 } as Record<string, number>;
      const d = decimals[bc] ?? 8;
      const fmt = (v: number | string) => (Number(v) / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: 6 });
      setData({
        balance: fmt(info.balance ?? 0),
        txCount: info.transaction_count ?? 0,
        totalReceived: fmt(info.received ?? 0),
        totalSent: fmt(info.spent ?? 0),
      });
    } catch {
      setError('Could not fetch live data — the address may be invalid or the API is rate-limited.');
    }
    setLoading(false);
  };

  const EXPLORERS = [
    { name: 'Mempool.space', desc: 'Bitcoin mempool & blocks', url: `https://mempool.space/address/${a}` },
    { name: 'Etherscan', desc: 'Ethereum transactions & tokens', url: `https://etherscan.io/address/${a}` },
    { name: 'Solscan', desc: 'Solana accounts & activity', url: `https://solscan.io/account/${a}` },
    { name: 'Blockchair', desc: 'Multi-chain search', url: `https://blockchair.com/search?q=${a}` },
  ];

  return (
    <Shell title="Crypto Trace" sub="Live wallet intelligence">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="Paste wallet address"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') trace(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={trace} disabled={!addr.trim() || loading}>
            {loading ? 'Tracing…' : 'Trace'}
          </button>
        </div>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {a && !error && (
        <div className="ns-panel">
          <h2>
            {chain}
            <span className="ns-pill" style={{ marginLeft: 8 }}>live</span>
          </h2>
          {loading ? (
            <div className="ns-loading"><span className="ns-spinner" />Fetching on-chain data…</div>
          ) : data ? (
            <div className="ns-result">
              <table>
                <tbody>
                  <tr><td>Balance</td><td><b>{data.balance}</b></td></tr>
                  <tr><td>Transactions</td><td>{data.txCount.toLocaleString()}</td></tr>
                  <tr><td>Total received</td><td>{data.totalReceived}</td></tr>
                  <tr><td>Total sent</td><td>{data.totalSent}</td></tr>
                  <tr><td>Address</td><td style={{ fontSize: 11 }}>{a}</td></tr>
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="ns-section-title">Deep-dive explorers</div>
          <div className="ns-link-list">
            {EXPLORERS.map((e) => (
              <a key={e.name} href={e.url} target="_blank" rel="noreferrer" className="ns-link">
                <span>
                  <span className="name">{e.name}</span>
                  <div className="desc">{e.desc}</div>
                </span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
