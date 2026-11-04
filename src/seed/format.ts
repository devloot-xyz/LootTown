import { z } from 'zod';
import { parseVenueV1, type VenueV1 } from '../contracts/venue.ts';

const envelope = z.object({
  fixtureVersion: z.literal(1),
  seed: z.string().min(1),
  venues: z.array(z.unknown()).min(1),
  repositories: z.array(z.object({ id: z.number().int().positive(), slug: z.string().min(1) })),
  communityRepositories: z.array(z.object({ communityId: z.number().int().positive(), repositoryId: z.number().int().positive() })),
});

export type FixtureBundle = Omit<z.infer<typeof envelope>, 'venues'> & { venues: VenueV1[] };

export function parseFixture(value: unknown): FixtureBundle {
  const parsed = envelope.parse(value);
  const venues = parsed.venues.map(parseVenueV1);
  const communityIds = new Set(venues.map((venue) => venue.community.id));
  const repositoryIds = new Set(parsed.repositories.map((repository) => repository.id));
  if (communityIds.size !== venues.length || repositoryIds.size !== parsed.repositories.length) {
    throw new Error('Duplicate community or repository ID');
  }
  const links = new Set<string>();
  const counts = new Map<number, number>();
  for (const link of parsed.communityRepositories) {
    if (!communityIds.has(link.communityId) || !repositoryIds.has(link.repositoryId)) throw new Error('Dangling repository link');
    const key = `${link.communityId}:${link.repositoryId}`;
    if (links.has(key)) throw new Error('Duplicate repository link');
    links.add(key);
    counts.set(link.communityId, (counts.get(link.communityId) ?? 0) + 1);
  }
  for (const id of communityIds) {
    const count = counts.get(id) ?? 0;
    if (count < 2 || count > 10) throw new Error('Fixture community must link 2–10 repositories');
  }
  return { ...parsed, venues };
}
