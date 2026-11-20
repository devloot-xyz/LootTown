import { describe, expect, it } from 'vitest';
import {
  parseVenueV1,
  parseVenueProjectionV1,
  projectionToVenueV1,
  type VenueProjectionV1,
} from './venue';

const valid = {
  schemaVersion: 1,
  community: { id: 1, name: 'Demo' },
  coverage: { complete: true, lastSyncedAt: null, policyVersion: 'fixture' },
  people: [{ githubId: 10, handle: 'Demo person', communityCommitCount: 10, eligible: true }],
};

const validProjection: VenueProjectionV1 = {
  schemaVersion: 1,
  community: { id: 101, name: 'DevLoot Core Collective' },
  coverage: {
    complete: true,
    state: 'complete',
    lastSyncedAt: '2026-11-20T12:00:00.000Z',
    policyVersion: '1.0.0',
  },
  repositories: [
    {
      id: 201,
      visibility: 'public',
      syncStatus: 'synced',
      lastSyncedAt: '2026-11-20T12:00:00.000Z',
    },
    {
      id: 202,
      visibility: 'public',
      syncStatus: 'synced',
      lastSyncedAt: '2026-11-20T12:00:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    totalPeople: 2,
    totalPages: 1,
    snapshotId: 'snap-2026-11-20-001',
    nextCursor: null,
  },
  people: [
    {
      githubId: 1001,
      handle: 'lead-dev',
      communityCommitCount: 120,
      eligible: true,
    },
    {
      githubId: 1002,
      handle: 'contributor-two',
      communityCommitCount: 15,
      eligible: true,
    },
  ],
};

describe('proposed venue contract', () => {
  it('accepts a complete versioned aggregate', () =>
    expect(parseVenueV1(valid).schemaVersion).toBe(1));
  it('rejects incompatible versions', () =>
    expect(() => parseVenueV1({ ...valid, schemaVersion: 2 })).toThrow());
  it('does not turn partial coverage into a definite band', () =>
    expect(() =>
      parseVenueV1({ ...valid, coverage: { ...valid.coverage, complete: false } })
    ).toThrow());
  it('accepts unknown counts for partial coverage', () =>
    expect(
      parseVenueV1({
        ...valid,
        coverage: { ...valid.coverage, complete: false },
        people: [{ ...valid.people[0], communityCommitCount: null }],
      }).people[0].communityCommitCount
    ).toBeNull());
});

describe('upstream venue projection v1 contract', () => {
  it('accepts a valid complete upstream projection', () => {
    const res = parseVenueProjectionV1(validProjection);
    expect(res.schemaVersion).toBe(1);
    expect(res.community.id).toBe(101);
    expect(res.coverage.state).toBe('complete');
    expect(res.repositories).toHaveLength(2);
    expect(res.pagination.snapshotId).toBe('snap-2026-11-20-001');
    expect(res.people).toHaveLength(2);
  });

  it('migrates projection cleanly to VenueV1', () => {
    const core = projectionToVenueV1(validProjection);
    expect(core.schemaVersion).toBe(1);
    expect(core.community.id).toBe(101);
    expect(core.people).toHaveLength(2);
    expect(parseVenueV1(core).schemaVersion).toBe(1);
  });

  it('rejects incompatible schema versions', () => {
    expect(() =>
      parseVenueProjectionV1({ ...validProjection, schemaVersion: 2 })
    ).toThrow();
  });

  it('rejects more than 10 linked repositories per community rule', () => {
    const tooManyRepos = Array.from({ length: 11 }, (_, i) => ({
      id: 300 + i,
      visibility: 'public' as const,
      syncStatus: 'synced' as const,
      lastSyncedAt: '2026-11-20T12:00:00.000Z',
    }));
    expect(() =>
      parseVenueProjectionV1({ ...validProjection, repositories: tooManyRepos })
    ).toThrow(/too_big|<=10 items/);
  });


  it('rejects non-public repository records', () => {
    const privateRepo = {
      ...validProjection,
      repositories: [
        {
          id: 201,
          visibility: 'private',
          syncStatus: 'synced',
          lastSyncedAt: '2026-11-20T12:00:00.000Z',
        },
      ],
    };
    expect(() => parseVenueProjectionV1(privateRepo)).toThrow();
  });

  it('enforces null commit counts when coverage is partial', () => {
    const partialWithCounts = {
      ...validProjection,
      coverage: {
        ...validProjection.coverage,
        complete: false,
        state: 'partial' as const,
      },
    };
    expect(() => parseVenueProjectionV1(partialWithCounts)).toThrow(
      /Incomplete coverage cannot carry definitive commit counts/
    );

    const validPartial = {
      ...partialWithCounts,
      people: validProjection.people.map((p) => ({
        ...p,
        communityCommitCount: null,
      })),
    };
    const parsed = parseVenueProjectionV1(validPartial);
    expect(parsed.coverage.complete).toBe(false);
    expect(parsed.people[0].communityCommitCount).toBeNull();
  });

  it('enforces null commit counts when coverage is stale (> 48h)', () => {
    const staleWithCounts = {
      ...validProjection,
      coverage: {
        ...validProjection.coverage,
        complete: false,
        state: 'stale' as const,
      },
    };
    expect(() => parseVenueProjectionV1(staleWithCounts)).toThrow(
      /cannot carry definitive commit counts/
    );

    const validStale = {
      ...staleWithCounts,
      people: validProjection.people.map((p) => ({
        ...p,
        communityCommitCount: null,
      })),
    };
    expect(parseVenueProjectionV1(validStale).coverage.state).toBe('stale');
  });

  it('accepts and verifies empty community state', () => {
    const emptyProjection = {
      ...validProjection,
      coverage: {
        ...validProjection.coverage,
        complete: true,
        state: 'empty' as const,
      },
      pagination: {
        ...validProjection.pagination,
        totalPeople: 0,
        totalPages: 0,
      },
      people: [],
    };
    const parsed = parseVenueProjectionV1(emptyProjection);
    expect(parsed.coverage.state).toBe('empty');
    expect(parsed.people).toHaveLength(0);
    expect(parsed.pagination.totalPeople).toBe(0);
  });

  it('rejects empty state that erroneously contains contributors', () => {
    const invalidEmpty = {
      ...validProjection,
      coverage: {
        ...validProjection.coverage,
        state: 'empty' as const,
      },
    };
    expect(() => parseVenueProjectionV1(invalidEmpty)).toThrow(
      /Empty coverage state must report zero people/
    );
  });

  it('rejects duplicate GitHub IDs within the returned community projection', () => {
    const dupes = {
      ...validProjection,
      people: [
        {
          githubId: 1001,
          handle: 'user-a',
          communityCommitCount: 5,
          eligible: true,
        },
        {
          githubId: 1001,
          handle: 'user-a-renamed',
          communityCommitCount: 10,
          eligible: true,
        },
      ],
    };
    expect(() => parseVenueProjectionV1(dupes)).toThrow(
      /Conflicting community aggregate/
    );

  });
});

