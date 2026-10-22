'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import {
  isValidGithubUser,
  buildUserUrl,
  buildReposUrl,
  buildOrgsUrl,
  buildGistsUrl,
  buildMentionSearchUrl,
  parseUser,
  parseRepos,
  parseOrgs,
  parseGists,
  topRepos,
  languageBreakdown,
  accountAgeDays,
  profileCompleteness,
  shortDate,
  type GhUser,
  type GhRepo,
  type GhOrg,
  type GhGist,
} from '../../lib/codetrail';

const SHOWN_REPOS = 12;

export default function CodeTrailPage() {
  const [handle, setHandle] = useState('');
  const [searched, setSearched] = useState('');
  const [user, setUser] = useState<GhUser | null>(null);
  const [repos, setRepos] = useState<GhRepo[]>([]);
  const [orgs, setOrgs] = useState<GhOrg[]>([]);
  const [gists, setGists] = useState<GhGist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = searched.trim();

  const scan = async () => {
    const input = handle.trim();
    if (!input) return;
    setSearched(input);
    setUser(null);
    setRepos([]);
    setOrgs([]);
    setGists([]);
    setError('');
    if (!isValidGithubUser(input)) {
      setError('That does not look like a valid GitHub username.');
      return;
    }
    setLoading(true);
    try {
      const [uR, rR, oR, gR] = await Promise.all([
        fetch(buildUserUrl(input)),
        fetch(buildReposUrl(input)),
        fetch(buildOrgsUrl(input)),
        fetch(buildGistsUrl(input)),
      ]);
      if (uR.status === 404) throw new Error('User not found on GitHub');
      if (uR.status === 403) throw new Error('GitHub API rate limit hit — wait a few minutes and retry');
      if (!uR.ok) throw new Error('GitHub lookup failed');
      const u = parseUser(await uR.json());
      if (!u) throw new Error('Could not read the GitHub profile');
      setUser(u);
      if (rR.ok) setRepos(parseRepos(await rR.json()));
      if (oR.ok) setOrgs(parseOrgs(await oR.json()));
      if (gR.ok) setGists(parseGists(await gR.json()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lookup failed — try again.');
    }
    setLoading(false);
  };

  const top = topRepos(repos, SHOWN_REPOS);
  const langs = languageBreakdown(repos);
  const age = user ? accountAgeDays(user.createdAt) : null;

  return (
    <Shell title="CodeTrail" sub="Public GitHub profile intelligence — no login, public data only">
      <div className="ns-panel">
        <div className="ns-row">
          <input
            className="ns-input"
            placeholder="GitHub username (e.g. torvalds)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') scan(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="ns-btn" onClick={scan} disabled={!handle.trim() || loading}>
            {loading ? 'Tracing…' : 'Trace'}
          </button>
        </div>
        <p className="ns-note">
          Public profile fields only — the same data anyone sees on the GitHub
          profile page. Do not use results to dox or harass.
        </p>
      </div>

      {error && <div className="ns-error">{error}</div>}

      {user && (
        <>
          <div className="ns-panel">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={`${user.login} avatar`}
                  width={64}
                  height={64}
                  style={{ borderRadius: 12 }}
                />
              )}
              <div>
                <h2 style={{ margin: 0 }}>
                  {user.name || user.login}
                  <a
                    href={user.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, marginLeft: 10, color: 'var(--accent)' }}
                  >
                    @{user.login} →
                  </a>
                </h2>
                {user.bio && <p className="ns-note" style={{ margin: '4px 0 0' }}>{user.bio}</p>}
              </div>
            </div>
            <div className="ns-kv" style={{ marginTop: 12 }}>
              <div><span>Repos</span><b>{user.publicRepos}</b></div>
              <div><span>Followers</span><b>{user.followers}</b></div>
              <div><span>Following</span><b>{user.following}</b></div>
              <div><span>Account age</span><b>{age === null ? '—' : `${age.toLocaleString()} days`}</b></div>
              <div><span>Profile completeness</span><b>{profileCompleteness(user)}%</b></div>
              {user.location && <div><span>Location</span><b>{user.location}</b></div>}
              {user.company && <div><span>Company</span><b>{user.company}</b></div>}
              {user.blog && (
                <div>
                  <span>Blog</span>
                  <b>
                    <a
                      href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 12 }}
                    >
                      link →
                    </a>
                  </b>
                </div>
              )}
              {user.twitter && (
                <div>
                  <span>Twitter</span>
                  <b>
                    <a
                      href={`https://x.com/${user.twitter}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent)', fontSize: 12 }}
                    >
                      @{user.twitter} →
                    </a>
                  </b>
                </div>
              )}
              {user.email && <div><span>Public email</span><b>{user.email}</b></div>}
              {user.hireable !== null && (
                <div><span>Hireable</span><b>{user.hireable ? 'yes' : 'no'}</b></div>
              )}
              <div><span>Last active</span><b>{shortDate(user.updatedAt)}</b></div>
            </div>
          </div>

          {langs.length > 0 && (
            <div className="ns-panel">
              <h2>Languages <span className="count">{langs.length}</span></h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {langs.slice(0, 12).map((l) => (
                  <span key={l.language} className="ns-pill">
                    {l.language} · {l.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {top.length > 0 && (
            <div className="ns-panel">
              <h2>
                Top repos
                <span className="count">{top.length} of {repos.length}</span>
              </h2>
              <div className="ns-result">
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Repo</th>
                      <th style={{ textAlign: 'left' }}>Lang</th>
                      <th style={{ textAlign: 'right' }}>★</th>
                      <th style={{ textAlign: 'right' }}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((r) => (
                      <tr key={r.fullName}>
                        <td>
                          <a
                            href={r.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--accent)', fontSize: 12 }}
                          >
                            {r.name}
                          </a>
                          {r.fork && <span style={{ fontSize: 10, color: 'var(--muted)' }}> (fork)</span>}
                          {r.archived && <span style={{ fontSize: 10, color: 'var(--muted)' }}> (archived)</span>}
                          {r.description && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>
                              {r.description}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{r.language || '—'}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{r.stars.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{shortDate(r.pushedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(orgs.length > 0 || gists.length > 0) && (
            <div className="ns-panel">
              <h2>Orgs & gists</h2>
              {orgs.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: gists.length ? 12 : 0 }}>
                  {orgs.map((o) => (
                    <a
                      key={o.login}
                      href={`https://github.com/${o.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ns-pill"
                      style={{ textDecoration: 'none' }}
                      title={o.description}
                    >
                      {o.login}
                    </a>
                  ))}
                </div>
              )}
              {gists.length > 0 && (
                <div className="ns-link-list">
                  {gists.slice(0, 8).map((g) => (
                    <a key={g.id} href={g.htmlUrl} target="_blank" rel="noreferrer" className="ns-link">
                      <span>
                        <span className="name">{g.description || g.files[0] || g.id}</span>
                        <div className="desc">{g.files.slice(0, 3).join(', ')}{g.files.length > 3 ? '…' : ''}</div>
                      </span>
                      <span className="arrow">→</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {t && (
        <div className="ns-panel">
          <h2>Deep-dive tools</h2>
          <div className="ns-link-list">
            <a href={buildMentionSearchUrl(t)} target="_blank" rel="noreferrer" className="ns-link">
              <span>
                <span className="name">Code search</span>
                <div className="desc">Public code mentioning {t}</div>
              </span>
              <span className="arrow">→</span>
            </a>
            <a
              href={`https://github.com/${t}?tab=achievements`}
              target="_blank"
              rel="noreferrer"
              className="ns-link"
            >
              <span>
                <span className="name">Achievements</span>
                <div className="desc">Public badges and highlights</div>
              </span>
              <span className="arrow">→</span>
            </a>
          </div>
        </div>
      )}
    </Shell>
  );
}
