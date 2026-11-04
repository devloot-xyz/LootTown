import { parseFixture, type FixtureBundle } from './format.ts';

export const DEFAULT_SEED = 'loottown-fixture-v1';
export const COMMUNITY_COUNT = 40;
const PERSON_POOL = 6_000;

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function integer(next: () => number, maxExclusive: number): number {
  return Math.floor(next() * maxExclusive);
}

function commitCount(personIndex: number, next: () => number): number {
  switch (personIndex % 5) {
    case 0: return 1 + integer(next, 9);
    case 1: return 10 + integer(next, 40);
    case 2: return 50 + integer(next, 150);
    case 3: return 200 + integer(next, 800);
    default: return 1000 + integer(next, 2001);
  }
}

export function generateFixture(seed = DEFAULT_SEED): FixtureBundle {
  if (!seed.trim() || seed.length > 100) throw new Error('Seed must contain 1–100 characters');
  const venues: FixtureBundle['venues'] = [];
  const repositories: FixtureBundle['repositories'] = [];
  const communityRepositories: FixtureBundle['communityRepositories'] = [];
  let nextRepositoryId = 700_000_001;
  let priorSharedRepositoryId: number | null = null;

  for (let index = 0; index < COMMUNITY_COUNT; index++) {
    const next = random(hash(`${seed}:community:${index}`));
    const communityId = 800_000_001 + index;
    const count = 200 + integer(next, 401);
    const pool = Array.from({ length: PERSON_POOL }, (_, personIndex) => personIndex);
    for (let position = pool.length - 1; position > 0; position--) {
      const swap = integer(next, position + 1);
      [pool[position], pool[swap]] = [pool[swap], pool[position]];
    }
    venues.push({
      schemaVersion: 1,
      community: { id: communityId, name: `Fixture Community ${String(index + 1).padStart(2, '0')}` },
      coverage: { complete: true, lastSyncedAt: null, policyVersion: 'synthetic-fixture-v1' },
      people: pool.slice(0, count).map((personIndex) => ({
        githubId: 900_000_001 + personIndex,
        handle: `loottown-fixture-person-${String(personIndex + 1).padStart(5, '0')}`,
        communityCommitCount: commitCount(personIndex, next),
        eligible: true,
      })),
    });
    if (priorSharedRepositoryId !== null) {
      communityRepositories.push({ communityId, repositoryId: priorSharedRepositoryId });
    }
    const newRepositoryCount = 3 + integer(next, 4);
    for (let slot = 0; slot < newRepositoryCount; slot++) {
      const repositoryId = nextRepositoryId++;
      repositories.push({ id: repositoryId, slug: `fixture-repo-${String(repositoryId).slice(-5)}` });
      communityRepositories.push({ communityId, repositoryId });
      if (slot === newRepositoryCount - 1) priorSharedRepositoryId = repositoryId;
    }
  }
  return parseFixture({ fixtureVersion: 1, seed, venues, repositories, communityRepositories });
}
