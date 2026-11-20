import { z } from 'zod';
import { uniquePeople } from '../domain/community.ts';

// Proposed LootTown projection, not an existing DevLoot endpoint.
export const venueV1 = z.object({
  schemaVersion: z.literal(1),
  community: z.object({ id: z.number().int().positive(), name: z.string().min(1) }),
  coverage: z.object({
    complete: z.boolean(),
    lastSyncedAt: z.iso.datetime().nullable(),
    policyVersion: z.string().min(1),
  }),
  people: z.array(z.object({
    githubId: z.number().int().positive(),
    handle: z.string().min(1),
    communityCommitCount: z.number().int().nonnegative().nullable(),
    eligible: z.boolean(),
  })),
});

export type VenueV1 = z.infer<typeof venueV1>;

export function parseVenueV1(value: unknown): VenueV1 {
  const venue = venueV1.parse(value);
  // Reject conflicting duplicates. A partial projection cannot claim definitive counts.
  uniquePeople(venue.people);
  if (!venue.coverage.complete && venue.people.some((person) => person.communityCommitCount !== null)) {
    throw new Error('Incomplete coverage cannot carry definitive commit counts');
  }
  return venue;
}

// Upstream public community venue projection v1 contract
export const coverageStateSchema = z.enum([
  'complete',
  'partial',
  'stale',
  'empty',
  'unavailable',
]);
export type CoverageState = z.infer<typeof coverageStateSchema>;

export const repositorySyncStatusSchema = z.enum([
  'synced',
  'pending',
  'stale',
  'failed',
]);
export type RepositorySyncStatus = z.infer<typeof repositorySyncStatusSchema>;

export const traceableRepositoryV1Schema = z.object({
  id: z.number().int().positive(),
  visibility: z.literal('public'),
  syncStatus: repositorySyncStatusSchema,
  lastSyncedAt: z.iso.datetime().nullable(),
});
export type TraceableRepositoryV1 = z.infer<typeof traceableRepositoryV1Schema>;

export const venueProjectionPaginationV1Schema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPeople: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  snapshotId: z.string().min(1),
  nextCursor: z.string().nullable().optional(),
});
export type VenueProjectionPaginationV1 = z.infer<typeof venueProjectionPaginationV1Schema>;

export const venueProjectionV1Schema = z.object({
  schemaVersion: z.literal(1),
  community: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  }),
  coverage: z.object({
    complete: z.boolean(),
    state: coverageStateSchema,
    lastSyncedAt: z.iso.datetime().nullable(),
    policyVersion: z.string().min(1),
  }),
  repositories: z.array(traceableRepositoryV1Schema).max(10),
  pagination: venueProjectionPaginationV1Schema,
  people: z.array(
    z.object({
      githubId: z.number().int().positive(),
      handle: z.string().min(1),
      communityCommitCount: z.number().int().nonnegative().nullable(),
      eligible: z.boolean(),
    })
  ),
});
export type VenueProjectionV1 = z.infer<typeof venueProjectionV1Schema>;

export function parseVenueProjectionV1(value: unknown): VenueProjectionV1 {
  const projection = venueProjectionV1Schema.parse(value);

  // Invariant 1: Ensure unique GitHub IDs within the returned community people page
  uniquePeople(projection.people);

  // Invariant 2: Incomplete or partial coverage cannot carry definitive commit counts
  if (
    (!projection.coverage.complete || projection.coverage.state === 'partial') &&
    projection.people.some((person) => person.communityCommitCount !== null)
  ) {
    throw new Error('Incomplete coverage cannot carry definitive commit counts');
  }

  // Invariant 3: Stale coverage cannot carry definitive commit counts
  if (
    projection.coverage.state === 'stale' &&
    projection.people.some((person) => person.communityCommitCount !== null)
  ) {
    throw new Error('Stale coverage cannot carry definitive commit counts');
  }

  // Invariant 4: Empty state must have 0 people and 0 totalPeople
  if (
    projection.coverage.state === 'empty' &&
    (projection.people.length > 0 || projection.pagination.totalPeople > 0)
  ) {
    throw new Error('Empty coverage state must report zero people');
  }

  // Invariant 5: Max 10 linked repositories per DevLoot community rule
  if (projection.repositories.length > 10) {
    throw new Error('Community cannot link more than 10 repositories');
  }

  return projection;
}

/**
 * Migration helper from full upstream projection to core VenueV1 aggregate
 */
export function projectionToVenueV1(projection: VenueProjectionV1): VenueV1 {
  return {
    schemaVersion: projection.schemaVersion,
    community: {
      id: projection.community.id,
      name: projection.community.name,
    },
    coverage: {
      complete: projection.coverage.complete,
      lastSyncedAt: projection.coverage.lastSyncedAt,
      policyVersion: projection.coverage.policyVersion,
    },
    people: projection.people,
  };
}

