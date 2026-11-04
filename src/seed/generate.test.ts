import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { avatarTier, uniquePeople } from '../domain/community';
import { parseFixture } from './format';
import { COMMUNITY_COUNT, DEFAULT_SEED, generateFixture } from './generate';

const fixture = generateFixture();

describe('large synthetic fixture', () => {
  it('is reproducible from its seed and matches the committed JSON', () => {
    expect(generateFixture(DEFAULT_SEED)).toEqual(fixture);
    const checkedIn = readFileSync(new URL('../../public/fixtures/large.json', import.meta.url), 'utf8');
    expect(checkedIn).toBe(`${JSON.stringify(fixture)}\n`);
    expect(generateFixture('another-seed').venues[0].people).not.toEqual(fixture.venues[0].people);
  });

  it('has hundreds of distinct members in every one of 40 communities', () => {
    expect(fixture.venues).toHaveLength(COMMUNITY_COUNT);
    for (const venue of fixture.venues) {
      expect(venue.people.length).toBeGreaterThanOrEqual(200);
      expect(venue.people.length).toBeLessThanOrEqual(600);
      expect(uniquePeople(venue.people)).toHaveLength(venue.people.length);
      expect(venue.coverage.policyVersion).toBe('synthetic-fixture-v1');
    }
  });

  it('reuses fictional identities between communities without duplicating them inside one', () => {
    const memberships = fixture.venues.flatMap((venue) => venue.people.map((person) => person.githubId));
    const distinct = new Set(memberships);
    expect(memberships.length).toBeGreaterThan(10_000);
    expect(distinct.size).toBeLessThan(memberships.length);
    expect(distinct.size).toBeGreaterThan(3_000);
  });

  it('covers every approved commit band with community aggregate counts', () => {
    const tiers = new Set(fixture.venues.flatMap((venue) => venue.people.map((person) => avatarTier(person.communityCommitCount))));
    expect(tiers).toEqual(new Set(['base', 'accessory', 'elaborate', 'special', 'veteran']));
  });

  it('links only existing fictional repositories and shares some across communities', () => {
    expect(parseFixture(fixture)).toEqual(fixture);
    const repositoryIds = new Set(fixture.repositories.map((repository) => repository.id));
    const usage = new Map<number, number>();
    for (const link of fixture.communityRepositories) {
      expect(repositoryIds.has(link.repositoryId)).toBe(true);
      usage.set(link.repositoryId, (usage.get(link.repositoryId) ?? 0) + 1);
    }
    expect([...usage.values()].some((count) => count > 1)).toBe(true);
    expect(() => parseFixture({ ...fixture, communityRepositories: [...fixture.communityRepositories, { communityId: fixture.venues[0].community.id, repositoryId: -1 }] })).toThrow();
  });
});
