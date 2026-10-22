import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { SECTORS, type Sector } from '../lib/sectors';

const ACCENTS: Sector['accent'][] = [
  'blue', 'green', 'gold', 'red', 'purple', 'cyan', 'orange', 'pink', 'teal',
];

describe('SECTORS registry', () => {
  it('has all 16 sectors with unique ids', () => {
    expect(SECTORS.length).toBe(16);
    const ids = SECTORS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every sector has a name, icon, blurb and valid accent', () => {
    for (const s of SECTORS) {
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.icon.trim().length).toBeGreaterThan(0);
      expect(s.blurb.trim().length).toBeGreaterThan(0);
      expect(ACCENTS).toContain(s.accent);
    }
  });

  it('every sector id maps to a real app route', () => {
    for (const s of SECTORS) {
      expect(existsSync(`app/${s.id}/page.tsx`), `missing route for /${s.id}`).toBe(true);
    }
  });

  it('sector ids are URL-safe slugs', () => {
    for (const s of SECTORS) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
