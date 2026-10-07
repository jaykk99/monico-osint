'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';

const PLATFORMS: { name: string; url: (u: string) => string }[] = [
  { name: 'GitHub', url: (u) => `https://github.com/${u}` },
  { name: 'X / Twitter', url: (u) => `https://x.com/${u}` },
  { name: 'Instagram', url: (u) => `https://www.instagram.com/${u}/` },
  { name: 'TikTok', url: (u) => `https://www.tiktok.com/@${u}` },
  { name: 'Reddit', url: (u) => `https://www.reddit.com/user/${u}/` },
  { name: 'YouTube', url: (u) => `https://www.youtube.com/@${u}` },
  { name: 'Twitch', url: (u) => `https://www.twitch.tv/${u}` },
  { name: 'Facebook', url: (u) => `https://www.facebook.com/${u}` },
  { name: 'LinkedIn', url: (u) => `https://www.linkedin.com/in/${u}` },
  { name: 'Pinterest', url: (u) => `https://www.pinterest.com/${u}/` },
  { name: 'Snapchat', url: (u) => `https://www.snapchat.com/add/${u}` },
  { name: 'Telegram', url: (u) => `https://t.me/${u}` },
  { name: 'Discord (lookup)', url: (u) => `https://discordlookup.com/user/${u}` },
  { name: 'Steam', url: (u) => `https://steamcommunity.com/id/${u}` },
  { name: 'Spotify', url: (u) => `https://open.spotify.com/user/${u}` },
  { name: 'Medium', url: (u) => `https://medium.com/@${u}` },
  { name: 'Vimeo', url: (u) => `https://vimeo.com/${u}` },
  { name: 'Flickr', url: (u) => `https://www.flickr.com/people/${u}/` },
  { name: 'DeviantArt', url: (u) => `https://www.deviantart.com/${u}` },
  { name: 'Gravatar', url: (u) => `https://en.gravatar.com/${u}` },
];

export default function UsernamePage() {
  const [username, setUsername] = useState('');
  const [searched, setSearched] = useState('');

  const u = searched.trim().replace(/^@/, '');

  return (
    <Shell title="🔎 Username Research" sub="Cross-platform identity hunt">
      <div className="ns-panel">
        <h2>Target username</h2>
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="e.g. jaykk99"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSearched(username); }}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button className="ns-btn" onClick={() => setSearched(username)} disabled={!username.trim()}>
            Hunt
          </button>
        </div>
        <p className="ns-note">
          Opens each platform&apos;s profile URL for the username — a hit means an account exists there.
          For automated enumeration, use the Error Inbox <b>osint_username</b> MCP tool.
        </p>
      </div>

      {u && (
        <div className="ns-panel">
          <h2>Results for “{u}” <span className="ns-tag">{PLATFORMS.length} platforms</span></h2>
          <div className="ns-link-list">
            {PLATFORMS.map((p) => (
              <a key={p.name} href={p.url(encodeURIComponent(u))} target="_blank" rel="noreferrer" className="ns-link">
                <span>{p.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>/ {u}</span></span>
                <span className="arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
