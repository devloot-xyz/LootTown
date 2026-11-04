import { describe, expect, it } from 'vitest';
import { parseVenueV1 } from './venue';

const valid = {
  schemaVersion: 1,
  community: { id: 1, name: 'Demo' },
  coverage: { complete: true, lastSyncedAt: null, policyVersion: 'fixture' },
  people: [{ githubId: 10, handle: 'Demo person', communityCommitCount: 10, eligible: true }],
};

describe('proposed venue contract', () => {
  it('accepts a complete versioned aggregate', () => expect(parseVenueV1(valid).schemaVersion).toBe(1));
  it('rejects incompatible versions', () => expect(() => parseVenueV1({ ...valid, schemaVersion: 2 })).toThrow());
  it('does not turn partial coverage into a definite band', () =>
    expect(() => parseVenueV1({ ...valid, coverage: { ...valid.coverage, complete: false } })).toThrow());
  it('accepts unknown counts for partial coverage', () =>
    expect(parseVenueV1({ ...valid, coverage: { ...valid.coverage, complete: false }, people: [{ ...valid.people[0], communityCommitCount: null }] }).people[0].communityCommitCount).toBeNull());
});
