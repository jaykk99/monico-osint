import { describe, expect, it } from 'vitest';
import {
  isValidGithubUser,
  buildUserUrl,
  buildReposUrl,
  buildOrgsUrl,
  buildGistsUrl,
  parseUser,
  parseRepos,
  parseOrgs,
  parseGists,
  topRepos,
  languageBreakdown,
  accountAgeDays,
  profileCompleteness,
  parseRateLimit,
  shortDate,
} from '../lib/codetrail';

describe('isValidGithubUser', () => {
  it('accepts normal usernames', () => {
    expect(isValidGithubUser('torvalds')).toBe(true);
    expect(isValidGithubUser('a-b-2')).toBe(true);
  });
  it('rejects bad shapes', () => {
    expect(isValidGithubUser('')).toBe(false);
    expect(isValidGithubUser('-lead')).toBe(false);
    expect(isValidGithubUser('trail-')).toBe(false);
    expect(isValidGithubUser('has space')).toBe(false);
    expect(isValidGithubUser('x'.repeat(40))).toBe(false);
  });
});

describe('URL builders', () => {
  it('builds user/repos/orgs/gists URLs', () => {
    expect(buildUserUrl('torvalds')).toBe('https://api.github.com/users/torvalds');
    expect(buildReposUrl('torvalds')).toContain('/users/torvalds/repos');
    expect(buildOrgsUrl('torvalds')).toContain('/users/torvalds/orgs');
    expect(buildGistsUrl('torvalds')).toContain('/users/torvalds/gists');
  });
  it('encodes special characters', () => {
    expect(buildUserUrl('a b')).toContain('a%20b');
  });
});

describe('parseUser', () => {
  const RAW = {
    login: 'octocat',
    name: 'The Octocat',
    avatar_url: 'https://avatars.example/u/1',
    bio: 'bio here',
    company: '@github',
    blog: 'https://example.com',
    location: 'San Francisco',
    email: null,
    twitter_username: 'octo',
    public_repos: 8,
    followers: 100,
    following: 9,
    created_at: '2011-01-25T18:44:36Z',
    updated_at: '2024-01-01T00:00:00Z',
    hireable: null,
    html_url: 'https://github.com/octocat',
  };

  it('maps every field', () => {
    const u = parseUser(RAW)!;
    expect(u.login).toBe('octocat');
    expect(u.name).toBe('The Octocat');
    expect(u.publicRepos).toBe(8);
    expect(u.twitter).toBe('octo');
    expect(u.hireable).toBeNull();
    expect(u.email).toBe('');
  });

  it('returns null without a login', () => {
    expect(parseUser({})).toBeNull();
    expect(parseUser(null)).toBeNull();
  });

  it('coerces non-numbers to 0', () => {
    const u = parseUser({ login: 'x', followers: 'many' })!;
    expect(u.followers).toBe(0);
  });
});

describe('parseRepos', () => {
  const RAW = [
    {
      name: 'linux',
      full_name: 'torvalds/linux',
      html_url: 'https://github.com/torvalds/linux',
      description: 'kernel',
      language: 'C',
      stargazers_count: 170000,
      forks_count: 50000,
      pushed_at: '2026-10-20T00:00:00Z',
      fork: false,
      archived: false,
    },
  ];

  it('parses repo rows', () => {
    const [r] = parseRepos(RAW);
    expect(r.stars).toBe(170000);
    expect(r.language).toBe('C');
    expect(r.fork).toBe(false);
  });

  it('returns [] for non-arrays', () => {
    expect(parseRepos({})).toEqual([]);
    expect(parseRepos(null)).toEqual([]);
  });
});

describe('parseOrgs / parseGists', () => {
  it('parses orgs', () => {
    const [o] = parseOrgs([{ login: 'github', avatar_url: 'x', description: 'd' }]);
    expect(o.login).toBe('github');
  });
  it('parses gists with file names', () => {
    const [g] = parseGists([
      { id: 'abc', html_url: 'u', description: 'd', files: { 'a.txt': {}, 'b.txt': {} }, public: true, created_at: 'x' },
    ]);
    expect(g.files).toEqual(['a.txt', 'b.txt']);
    expect(g.public).toBe(true);
  });
});

describe('analysis helpers', () => {
  const REPOS = [
    { name: 'a', fullName: 'u/a', htmlUrl: 'u', description: '', language: 'TypeScript', stars: 5, forks: 1, pushedAt: '', fork: false, archived: false },
    { name: 'b', fullName: 'u/b', htmlUrl: 'u', description: '', language: 'TypeScript', stars: 50, forks: 2, pushedAt: '', fork: false, archived: false },
    { name: 'c', fullName: 'u/c', htmlUrl: 'u', description: '', language: 'Python', stars: 20, forks: 0, pushedAt: '', fork: true, archived: false },
  ];

  it('topRepos sorts by stars desc', () => {
    const t = topRepos(REPOS, 2);
    expect(t.map((r) => r.name)).toEqual(['b', 'c']);
  });

  it('languageBreakdown counts and sorts', () => {
    const b = languageBreakdown(REPOS);
    expect(b[0]).toEqual({ language: 'TypeScript', count: 2 });
    expect(b[1]).toEqual({ language: 'Python', count: 1 });
  });

  it('accountAgeDays computes whole days', () => {
    const now = Date.parse('2026-10-22T00:00:00Z');
    expect(accountAgeDays('2026-10-20T00:00:00Z', now)).toBe(2);
    expect(accountAgeDays('bogus', now)).toBeNull();
  });

  it('profileCompleteness is 0-100', () => {
    const empty = parseUser({ login: 'x' })!;
    expect(profileCompleteness(empty)).toBe(0);
    const full = parseUser({
      login: 'x', name: 'n', bio: 'b', company: 'c', blog: 'b', location: 'l',
      email: 'e', twitter_username: 't', avatar_url: 'a',
    })!;
    expect(profileCompleteness(full)).toBe(100);
  });
});

describe('parseRateLimit', () => {
  it('parses the three headers', () => {
    const r = parseRateLimit({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': '1700000000',
    })!;
    expect(r.remaining).toBe(42);
    expect(r.resetAt).toBe(1700000000000);
  });
  it('returns null on missing headers', () => {
    expect(parseRateLimit({})).toBeNull();
  });
});

describe('shortDate', () => {
  it('trims ISO datetimes', () => {
    expect(shortDate('2020-05-01T00:00:00Z')).toBe('2020-05-01');
    expect(shortDate('n/a')).toBe('n/a');
  });
});
