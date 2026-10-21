'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { guessChain, CHAIN_SYMBOLS, formatChainAmount } from '../../lib/chains';

interface ChainData {
  balance: string;
  txCount: number;
  totalReceived: string;
  totalSent: string;
  symbol: string;
}

interface Tx {
  hash: string;
  time: string;
  value: string;
}

export default function CryptoPage() {
  const [addr, setAddr] = useState('');
  const [searched, setSearched] = useState('');
  const [data, setData] = useState<ChainData | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const a = searched.trim();
  const { chain, blockchair } = a ? guessChain(a) : { chain: '', blockchair: null };

  const trace = async () => {
    const target = addr.trim();
    if (!target) return;
    setSearched(target);
    setData(null);
    setTxs([]);
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
      const fmt = (v: number | string) => formatChainAmount(v, bc);
      setData({
        balance: fmt(info.balance ?? 0),
        txCount: info.transaction_count ?? 0,
        totalReceived: fmt(info.received ?? 0),
        totalSent: fmt(info.spent ?? 0),
        symbol: CHAIN_SYMBOLS[bc] ?? '',
      });
      // Recent transactions
      const txList = (j?.data?.[target]?.transactions || []).slice(0, 5).map((tx: any) => ({
        hash: tx.hash as string,
        time: tx.time ? new Date(tx.time).toLocaleString() : '—',
        value: fmt(tx.balance_change ?? 0),
      }));
      setTxs(txList);
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
            <>
              <div className="ns-result">
                <table>
                  <tbody>
                    <tr><td>Balance</td><td><b>{data.balance} {data.symbol}</b></td></tr>
                    <tr><td>Transactions</td><td>{data.txCount.toLocaleString()}</td></tr>
                    <tr><td>Total received</td><td>{data.totalReceived} {data.symbol}</td></tr>
                    <tr><td>Total sent</td><td>{data.totalSent} {data.symbol}</td></tr>
                    <tr><td>Address</td><td style={{ fontSize: 11 }}>{a}</td></tr>
                  </tbody>
                </table>
              </div>
              {txs.length > 0 && (
                <>
                  <div className="ns-section-title">Recent transactions</div>
                  <div className="ns-link-list">
                    {txs.map((tx) => (
                      <div key={tx.hash} className="ns-link" style={{ cursor: 'default' }}>
                        <span>
                          <span className="name" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                            {tx.hash.slice(0, 16)}…
                          </span>
                          <div className="desc">{tx.time}</div>
                        </span>
                        <span className="status" style={{
                          background: Number(tx.value) >= 0 ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: Number(tx.value) >= 0 ? 'var(--green)' : 'var(--red)',
                        }}>
                          {Number(tx.value) >= 0 ? '+' : ''}{tx.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
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
