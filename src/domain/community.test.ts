import { describe, expect, it } from 'vitest';
import { avatarTier, proposedVenue, uniquePeople } from './community';

describe('approved avatar boundaries', () => {
  it.each([
    [null, 'unknown'], [0, 'unknown'], [1, 'base'], [9, 'base'],
    [10, 'accessory'], [49, 'accessory'], [50, 'elaborate'], [199, 'elaborate'],
    [200, 'special'], [999, 'special'], [1000, 'veteran'],
  ] as const)('%s commits => %s', (count, tier) => expect(avatarTier(count)).toBe(tier));
  it('rejects invalid counts', () => expect(() => avatarTier(-1)).toThrow());
});

describe('community identity', () => {
  const person = { githubId: 42, handle: 'sample', communityCommitCount: 10, eligible: true };
  it('collapses repeated rows by stable GitHub ID', () => expect(uniquePeople([person, { ...person }])).toEqual([person]));
  it('does not add potentially overlapping per-repo counts', () =>
    expect(() => uniquePeople([person, { ...person, communityCommitCount: 12 }])).toThrow());
  it('excludes a backend-marked ineligible identity', () =>
    expect(uniquePeople([{ ...person, eligible: false }])).toEqual([]));
  it('keeps venue thresholds separate from avatar tiers', () => {
    expect(proposedVenue(9)).toBe('plaza');
    expect(proposedVenue(10)).toBe('hall');
  });
});
