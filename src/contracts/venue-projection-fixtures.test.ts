import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseVenueProjectionV1,
  projectionToVenueV1,
  type VenueProjectionV1,
} from './venue';

interface FixtureScenario {
  name: string;
  description: string;
  httpStatus: number;
  projection: VenueProjectionV1;
}

interface FixtureFile {
  fixtureVersion: number;
  description: string;
  scenarios: FixtureScenario[];
}

describe('upstream venue projection fixture test suite', () => {
  const raw = readFileSync(
    new URL('../../public/fixtures/venue-projection-v1.json', import.meta.url),
    'utf-8'
  );
  const fixture = JSON.parse(raw) as FixtureFile;

  it('contains valid fixture version and envelope', () => {
    expect(fixture.fixtureVersion).toBe(1);
    expect(fixture.scenarios.length).toBeGreaterThanOrEqual(7);
  });

  for (const scenario of fixture.scenarios) {
    it(`parses scenario: ${scenario.name}`, () => {
      const parsed = parseVenueProjectionV1(scenario.projection);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.community.id).toBe(scenario.projection.community.id);
      expect(parsed.coverage.state).toBe(scenario.projection.coverage.state);
      expect(parsed.repositories.length).toBeLessThanOrEqual(10);
      expect(parsed.repositories.every((r) => r.visibility === 'public')).toBe(true);

      // Verify migration to VenueV1
      const core = projectionToVenueV1(parsed);
      expect(core.schemaVersion).toBe(1);
      expect(core.community.id).toBe(parsed.community.id);
      expect(core.people.length).toBe(parsed.people.length);

      // Verify nullable counts invariant when coverage is not complete or is stale
      if (!parsed.coverage.complete || parsed.coverage.state === 'stale') {
        expect(parsed.people.every((p) => p.communityCommitCount === null)).toBe(true);
      }
    });
  }

  it('validates deduplication in overlapping-shas-deduplicated scenario', () => {
    const overlap = fixture.scenarios.find(
      (s) => s.name === 'overlapping-shas-deduplicated'
    );
    expect(overlap).toBeDefined();
    if (!overlap) return;
    const parsed = parseVenueProjectionV1(overlap.projection);
    expect(parsed.repositories.length).toBe(2);
    expect(parsed.people[0].communityCommitCount).toBe(1);
  });

  it('validates empty state in empty-community scenario', () => {
    const empty = fixture.scenarios.find(
      (s) => s.name === 'empty-community'
    );
    expect(empty).toBeDefined();
    if (!empty) return;
    const parsed = parseVenueProjectionV1(empty.projection);
    expect(parsed.coverage.state).toBe('empty');
    expect(parsed.people.length).toBe(0);
    expect(parsed.pagination.totalPeople).toBe(0);
  });

  it('validates 10 linked repositories in ten-linked-repositories scenario', () => {
    const ten = fixture.scenarios.find(
      (s) => s.name === 'ten-linked-repositories'
    );
    expect(ten).toBeDefined();
    if (!ten) return;
    const parsed = parseVenueProjectionV1(ten.projection);
    expect(parsed.repositories.length).toBe(10);
    expect(parsed.people[0].communityCommitCount).toBe(1500);
  });
});

