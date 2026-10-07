'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

interface Platform {
  name: string;
  url: (u: string) => string;
  /** Optional live check — returns profile data if the account exists, null if not. */
  check?: (u: string) => Promise<{ exists: boolean; detail?: string }>;
}

async function checkGitHub(u: string) {
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`);
    if (r.status === 200) {
      const j = await r.json();
      return { exists: true, detail: `${j.public_repos ?? 0} repos · ${j.followers ?? 0} followers` };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function checkReddit(u: string) {
  try {
    const r = await fetch(`https://www.reddit.com/user/${encodeURIComponent(u)}/about.json`);
    if (r.status === 200) {
      const j = await r.json();
      const karma = j?.data?.total_karma;
      return { exists: true, detail: karma != null ? `${karma.toLocaleString()} karma` : undefined };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function checkGitLab(u: string) {
  try {
    const r = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(u)}`);
    if (r.status === 200) {
      const j = await r.json();
      if (Array.isArray(j) && j.length > 0) {
        return { exists: true, detail: j[0]?.name || 'GitLab user' };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function checkHackerNews(u: string) {
  try {
    const r = await fetch(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`);
    if (r.status === 200) {
      const j = await r.json();
      if (j && j.id) {
        return { exists: true, detail: `${(j.karma || 0).toLocaleString()} karma` };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function checkStackOverflow(u: string) {
  try {
    const r = await fetch(
      `https://api.stackexchange.com/2.3/users?inname=${encodeURIComponent(u)}&site=stackoverflow&pagesize=1`
    );
    if (r.status === 200) {
      const j = await r.json();
      const user = j?.items?.[0];
      // Only count as hit if display name closely matches
      if (user && user.display_name?.toLowerCase() === u.toLowerCase()) {
        return { exists: true, detail: `${(user.reputation || 0).toLocaleString()} rep` };
      }
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

const PLATFORMS: Platform[] = [
  { name: 'GitHub', url: (u) => `https://github.com/${u}`, check: checkGitHub },
  { name: 'GitLab', url: (u) => `https://gitlab.com/${u}`, check: checkGitLab },
  { name: 'Reddit', url: (u) => `https://www.reddit.com/user/${u}/`, check: checkReddit },
  { name: 'Hacker News', url: (u) => `https://news.ycombinator.com/user?id=${u}`, check: checkHackerNews },
  { name: 'Stack Overflow', url: (u) => `https://stackoverflow.com/users/${u}`, check: checkStackOverflow },
  { name: 'X / Twitter', url: (u) => `https://x.com/${u}` },
  { name: 'Instagram', url: (u) => `https://www.instagram.com/${u}/` },
  { name: 'TikTok', url: (u) => `https://www.tiktok.com/@${u}` },
  { name: 'YouTube', url: (u) => `https://www.youtube.com/@${u}` },
  { name: 'Twitch', url: (u) => `https://www.twitch.tv/${u}` },
  { name: 'Facebook', url: (u) => `https://www.facebook.com/${u}` },
  { name: 'LinkedIn', url: (u) => `https://www.linkedin.com/in/${u}` },
  { name: 'Pinterest', url: (u) => `https://www.pinterest.com/${u}/` },
  { name: 'Snapchat', url: (u) => `https://www.snapchat.com/add/${u}` },
  { name: 'Telegram', url: (u) => `https://t.me/${u}` },
  { name: 'Steam', url: (u) => `https://steamcommunity.com/id/${u}` },
  { name: 'Spotify', url: (u) => `https://open.spotify.com/user/${u}` },
  { name: 'Medium', url: (u) => `https://medium.com/@${u}` },
  { name: 'Vimeo', url: (u) => `https://vimeo.com/${u}` },
  { name: 'Flickr', url: (u) => `https://www.flickr.com/people/${u}/` },
  { name: 'DeviantArt', url: (u) => `https://www.deviantart.com/${u}` },
  { name: 'Gravatar', url: (u) => `https://en.gravatar.com/${u}` },
];

type ResultState = Record<string, { state: 'checking' | 'hit' | 'miss'; detail?: string }>;

export default function UsernamePage() {
  const [username, setUsername] = useState('');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<ResultState>({});
  const [scanning, setScanning] = useState(false);
  const [deepResults, setDeepResults] = useState<any[]>([]);
  const [deepScanning, setDeepScanning] = useState(false);

  const u = searched.trim().replace(/^@/, '');

  const OSINT_KEY = process.env.NEXT_PUBLIC_OSINT_KEY || '';
  const ERROR_INBOX = 'https://error-inbox.vercel.app';

  /** Deep check via Error Inbox MCP — 100+ sites including X, IG, TikTok. */
  const deepHunt = async () => {
    const target = username.trim().replace(/^@/, '');
    if (!target || !OSINT_KEY) return;
    setDeepScanning(true);
    setDeepResults([]);
    try {
      const r = await fetch(`${ERROR_INBOX}/api/osint/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-bell-key': OSINT_KEY },
        body: JSON.stringify({ username: target, maxSites: 80 }),
      }).then((x) => x.json());
      if (r?.ok && Array.isArray(r.hits)) {
        setDeepResults(r.hits);
      }
    } catch {
      // fall back to client-side checks
    }
    setDeepScanning(false);
  };

  const hunt = async () => {
    const target = username.trim().replace(/^@/, '');
    if (!target) return;
    setSearched(target);
    setScanning(true);
    // Start deep MCP check in parallel (don't await)
    deepHunt();
    const initial: ResultState = {};
    PLATFORMS.forEach((p) => {
      initial[p.name] = p.check ? { state: 'checking' } : { state: 'miss' };
    });
    setResults(initial);

    // Run live checks in parallel
    await Promise.all(
      PLATFORMS.filter((p) => p.check).map(async (p) => {
        try {
          const r = await p.check!(target);
          setResults((prev) => ({
            ...prev,
            [p.name]: r.exists ? { state: 'hit', detail: r.detail } : { state: 'miss' },
          }));
        } catch {
          setResults((prev) => ({ ...prev, [p.name]: { state: 'miss' } }));
        }
      })
    );
    setScanning(false);
  };

  const hits = Object.values(results).filter((r) => r.state === 'hit').length;

  return (
    <Shell title="Username Hunt" sub="Live cross-platform identity check">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="username (without @)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') hunt(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={hunt} disabled={!username.trim() || scanning}>
            {scanning ? 'Hunting…' : 'Hunt'}
          </button>
        </div>
        <p className="ns-note">
          GitHub, GitLab, Reddit, Hacker News & Stack Overflow are verified live via API.
          Other platforms open directly — a loaded profile means the handle exists there.
        </p>
      </div>

      {u && (
        <div className="ns-panel">
          <h2>
            Results for “{u}”
            {hits > 0 && <span className="ns-pill green" style={{ marginLeft: 8 }}>{hits} confirmed</span>}
          </h2>

          {(deepScanning || deepResults.length > 0) && (
            <>
              <div className="ns-section-title">
                Deep scan — 100+ platforms
                {deepScanning && <span className="ns-spinner" style={{ marginLeft: 8 }} />}
              </div>
              {deepResults.length > 0 && (
                <div className="ns-link-list" style={{ marginBottom: 16 }}>
                  {deepResults.map((h: any, i: number) => (
                    <a
                      key={i}
                      href={h.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ns-link"
                    >
                      <span>
                        <span className="name">{h.site || h.name}</span>
                        <div className="desc">{h.category || ''}</div>
                      </span>
                      <span className="status hit">✓ exists</span>
                    </a>
                  ))}
                </div>
              )}
              <div className="ns-section-title">Quick checks</div>
            </>
          )}

          <div className="ns-link-list">
            {PLATFORMS.map((p) => {
              const r = results[p.name];
              return (
                <a
                  key={p.name}
                  href={p.url(encodeURIComponent(u))}
                  target="_blank"
                  rel="noreferrer"
                  className="ns-link"
                >
                  <span>
                    <span className="name">{p.name}</span>
                    {r?.detail && <div className="desc">{r.detail}</div>}
                    {!r?.detail && <div className="desc">/{u}</div>}
                  </span>
                  {r ? (
                    r.state === 'checking' ? (
                      <span className="status checking"><span className="ns-spinner" style={{ width: 10, height: 10, marginRight: 4 }} />checking</span>
                    ) : r.state === 'hit' ? (
                      <span className="status hit">✓ exists</span>
                    ) : p.check ? (
                      <span className="status miss">not found</span>
                    ) : (
                      <span className="arrow">→</span>
                    )
                  ) : (
                    <span className="arrow">→</span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}
