import { parseVenueV1 } from './contracts/venue';

// Fictional fixture. These IDs and names do not denote GitHub accounts.
export const demo = parseVenueV1({
  schemaVersion: 1,
  community: { id: 1, name: 'Sample Sound Collective' },
  coverage: { complete: true, lastSyncedAt: '2026-11-03T00:00:00.000Z', policyVersion: 'synthetic-v1' },
  people: [
    { githubId: 1001, handle: 'Demo Ada', communityCommitCount: 3, eligible: true },
    { githubId: 1002, handle: 'Demo Bo', communityCommitCount: 17, eligible: true },
    { githubId: 1003, handle: 'Demo Cy', communityCommitCount: 230, eligible: true },
  ],
});
