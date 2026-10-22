/**
 * CodeTrail — public GitHub profile intelligence.
 * Keyless, CORS-enabled api.github.com endpoints. Pure parsers — the page
 * fetches the JSON and passes it here. Reads only public profile data,
 * never private repos, commits-as-email harvesting, or auth.
 */

const API = 'https://api.github.com';

export interface GhUser {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  twitter: string;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
  updatedAt: string;
  hireable: boolean | null;
  htmlUrl: string;
}

export interface GhRepo {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  pushedAt: string;
  fork: boolean;
  archived: boolean;
}

export interface GhOrg {
  login: string;
  avatarUrl: string;
  description: string;
}

export interface GhGist {
  id: string;
  htmlUrl: string;
  description: string;
  files: string[];
  public: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* query builders                                                      */
/* ------------------------------------------------------------------ */

/** GitHub usernames: 1-39 chars, alnum and hyphens, no leading/trailing hyphen. */
export function isValidGithubUser(u: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(u.trim());
}

export function buildUserUrl(username: string): string {
  return `${API}/users/${encodeURIComponent(username.trim())}`;
}

export function buildReposUrl(username: string, perPage = 100): string {
  return `${API}/users/${encodeURIComponent(username.trim())}/repos?per_page=${perPage}&sort=pushed`;
}

export function buildOrgsUrl(username: string): string {
  return `${API}/users/${encodeURIComponent(username.trim())}/orgs?per_page=100`;
}

export function buildGistsUrl(username: string): string {
  return `${API}/users/${encodeURIComponent(username.trim())}/gists?per_page=30`;
}

/** Code-search URL for a username (commits / issues mentioning them). */
export function buildMentionSearchUrl(username: string): string {
  return `https://github.com/search?q=${encodeURIComponent(username.trim())}&type=code`;
}

/* ------------------------------------------------------------------ */
/* parsers                                                             */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function parseUser(json: unknown): GhUser | null {
  const j = (json ?? {}) as Record<string, unknown>;
  if (!str(j.login)) return null;
  return {
    login: str(j.login),
    name: str(j.name),
    avatarUrl: str(j.avatar_url),
    bio: str(j.bio),
    company: str(j.company),
    blog: str(j.blog),
    location: str(j.location),
    email: str(j.email),
    twitter: str(j.twitter_username),
    publicRepos: num(j.public_repos),
    followers: num(j.followers),
    following: num(j.following),
    createdAt: str(j.created_at),
    updatedAt: str(j.updated_at),
    hireable: typeof j.hireable === 'boolean' ? j.hireable : null,
    htmlUrl: str(j.html_url),
  };
}

export function parseRepos(json: unknown): GhRepo[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((r) => {
      const j = (r ?? {}) as Record<string, unknown>;
      return {
        name: str(j.name),
        fullName: str(j.full_name),
        htmlUrl: str(j.html_url),
        description: str(j.description),
        language: str(j.language),
        stars: num(j.stargazers_count),
        forks: num(j.forks_count),
        pushedAt: str(j.pushed_at),
        fork: j.fork === true,
        archived: j.archived === true,
      } as GhRepo;
    })
    .filter((r) => r.name);
}

export function parseOrgs(json: unknown): GhOrg[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((o) => {
      const j = (o ?? {}) as Record<string, unknown>;
      return { login: str(j.login), avatarUrl: str(j.avatar_url), description: str(j.description) };
    })
    .filter((o) => o.login);
}

export function parseGists(json: unknown): GhGist[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((g) => {
      const j = (g ?? {}) as Record<string, unknown>;
      const files = j.files && typeof j.files === 'object'
        ? Object.keys(j.files as Record<string, unknown>)
        : [];
      return {
        id: str(j.id),
        htmlUrl: str(j.html_url),
        description: str(j.description),
        files,
        public: j.public === true,
        createdAt: str(j.created_at),
      } as GhGist;
    })
    .filter((g) => g.id);
}

/* ------------------------------------------------------------------ */
/* analysis                                                            */
/* ------------------------------------------------------------------ */

/** Top N repos by stars, originals before forks on ties. */
export function topRepos(repos: GhRepo[], n = 10): GhRepo[] {
  return [...repos]
    .sort((a, b) => b.stars - a.stars || Number(a.fork) - Number(b.fork))
    .slice(0, n);
}

/** Language -> repo count, descending. */
export function languageBreakdown(repos: GhRepo[]): Array<{ language: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    map.set(r.language, (map.get(r.language) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}

/** Account age in whole days. Returns null on bad dates. */
export function accountAgeDays(createdAt: string, nowMs = Date.now()): number | null {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

/** Profile completeness 0-100 from filled optional fields. */
export function profileCompleteness(u: GhUser): number {
  const fields = [u.name, u.bio, u.company, u.blog, u.location, u.email, u.twitter, u.avatarUrl];
  const filled = fields.filter((f) => f.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

/** Parse GitHub API rate-limit headers from a plain header record. */
export function parseRateLimit(headers: Record<string, string | null>): {
  limit: number;
  remaining: number;
  resetAt: number;
} | null {
  const limit = parseInt(headers['x-ratelimit-limit'] ?? '', 10);
  const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '', 10);
  const reset = parseInt(headers['x-ratelimit-reset'] ?? '', 10);
  if ([limit, remaining, reset].some((n) => Number.isNaN(n))) return null;
  return { limit, remaining, resetAt: reset * 1000 };
}

/** "2020-05-01T00:00:00Z" -> "2020-05-01". Returns input on bad shape. */
export function shortDate(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : iso;
}
