import { z } from 'zod';
import { uniquePeople } from '../domain/community';

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
