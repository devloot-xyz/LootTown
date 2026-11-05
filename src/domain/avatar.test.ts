import { describe, it, expect } from 'vitest';
import {
  mapPersonToAvatar,
  mapCommunityAvatars,
  deriveOutfit,
  getBandLabel,
  formatCrowdSummary,
} from './avatar.ts';
import type { CommunityPerson } from './community.ts';

describe('avatar - approved commit band boundaries', () => {
  it('maps null and 0 to unknown tier with neutral garb', () => {
    const nullPerson: CommunityPerson = {
      githubId: 1,
      handle: 'dev1',
      communityCommitCount: null,
      eligible: true,
    };
    const avatarNull = mapPersonToAvatar(nullPerson, 10);
    expect(avatarNull.tier).toBe('unknown');
    expect(avatarNull.palette.clothingStyle).toBe('neutral_garb');
    expect(avatarNull.palette.posture).toBe('standard');
    expect(avatarNull.bandLabel).toBe('Unspecified commits');

    const zeroPerson: CommunityPerson = {
      ...nullPerson,
      communityCommitCount: 0,
    };
    const avatarZero = mapPersonToAvatar(zeroPerson, 10);
    expect(avatarZero.tier).toBe('unknown');
  });

  it('maps 1–9 to base tier (base_tunic, standard posture)', () => {
    const p1: CommunityPerson = { githubId: 1, handle: 'dev1', communityCommitCount: 1, eligible: true };
    const p9: CommunityPerson = { githubId: 2, handle: 'dev2', communityCommitCount: 9, eligible: true };

    expect(mapPersonToAvatar(p1, 10).tier).toBe('base');
    expect(deriveOutfit('base').clothingStyle).toBe('base_tunic');
    expect(mapPersonToAvatar(p1, 10).palette.clothingStyle).toBe('base_tunic');
    expect(mapPersonToAvatar(p9, 10).tier).toBe('base');
    expect(getBandLabel('base')).toBe('1–9 commits (Base)');
  });

  it('maps 10–49 to accessory tier (accessory_belt_pack, standard posture)', () => {
    const p10: CommunityPerson = { githubId: 1, handle: 'dev1', communityCommitCount: 10, eligible: true };
    const p49: CommunityPerson = { githubId: 2, handle: 'dev2', communityCommitCount: 49, eligible: true };

    expect(mapPersonToAvatar(p10, 10).tier).toBe('accessory');
    expect(mapPersonToAvatar(p10, 10).palette.clothingStyle).toBe('accessory_belt_pack');
    expect(mapPersonToAvatar(p49, 10).tier).toBe('accessory');
  });

  it('maps 50–199 to elaborate tier (elaborate_cloak, focused posture)', () => {
    const p50: CommunityPerson = { githubId: 1, handle: 'dev1', communityCommitCount: 50, eligible: true };
    const p199: CommunityPerson = { githubId: 2, handle: 'dev2', communityCommitCount: 199, eligible: true };

    expect(mapPersonToAvatar(p50, 10).tier).toBe('elaborate');
    expect(mapPersonToAvatar(p50, 10).palette.clothingStyle).toBe('elaborate_cloak');
    expect(mapPersonToAvatar(p50, 10).palette.posture).toBe('focused');
    expect(mapPersonToAvatar(p199, 10).tier).toBe('elaborate');
  });

  it('maps 200–999 to special tier (distinguished_regalia, veteran_stance)', () => {
    const p200: CommunityPerson = { githubId: 1, handle: 'dev1', communityCommitCount: 200, eligible: true };
    const p999: CommunityPerson = { githubId: 2, handle: 'dev2', communityCommitCount: 999, eligible: true };

    expect(mapPersonToAvatar(p200, 10).tier).toBe('special');
    expect(mapPersonToAvatar(p200, 10).palette.clothingStyle).toBe('distinguished_regalia');
    expect(mapPersonToAvatar(p200, 10).palette.posture).toBe('veteran_stance');
    expect(mapPersonToAvatar(p999, 10).tier).toBe('special');
  });

  it('maps 1000+ to veteran tier (veteran_mantle, veteran_stance)', () => {
    const p1000: CommunityPerson = { githubId: 1, handle: 'dev1', communityCommitCount: 1000, eligible: true };
    const p5000: CommunityPerson = { githubId: 2, handle: 'dev2', communityCommitCount: 5000, eligible: true };

    expect(mapPersonToAvatar(p1000, 10).tier).toBe('veteran');
    expect(mapPersonToAvatar(p1000, 10).palette.clothingStyle).toBe('veteran_mantle');
    expect(mapPersonToAvatar(p1000, 10).palette.posture).toBe('veteran_stance');
    expect(mapPersonToAvatar(p5000, 10).tier).toBe('veteran');
  });
});

describe('avatar - stable identity invariant', () => {
  it('maintains exact identity colors when commit counts change', () => {
    const earlyState: CommunityPerson = {
      githubId: 442,
      handle: 'contributor-x',
      communityCommitCount: 3,
      eligible: true,
    };
    const laterState: CommunityPerson = {
      githubId: 442,
      handle: 'contributor-x',
      communityCommitCount: 250,
      eligible: true,
    };

    const avatarEarly = mapPersonToAvatar(earlyState, 7);
    const avatarLater = mapPersonToAvatar(laterState, 7);

    // Identity colors must be identical
    expect(avatarEarly.palette.primaryColor).toBe(avatarLater.palette.primaryColor);
    expect(avatarEarly.palette.accentColor).toBe(avatarLater.palette.accentColor);

    // But outfit upgrades with the approved band
    expect(avatarEarly.tier).toBe('base');
    expect(avatarLater.tier).toBe('special');
    expect(avatarEarly.palette.clothingStyle).toBe('base_tunic');
    expect(avatarLater.palette.clothingStyle).toBe('distinguished_regalia');
  });

  it('generates different palette colors for different githubIds in the same community', () => {
    const p1: CommunityPerson = { githubId: 100, handle: 'alice', communityCommitCount: 10, eligible: true };
    const p2: CommunityPerson = { githubId: 200, handle: 'bob', communityCommitCount: 10, eligible: true };

    const av1 = mapPersonToAvatar(p1, 5);
    const av2 = mapPersonToAvatar(p2, 5);

    expect(av1.palette.primaryColor).not.toBe(av2.palette.primaryColor);
  });
});

describe('avatar - deduplication & crowd summary', () => {
  it('deduplicates multiple rows for the same GitHub ID to exactly one avatar', () => {
    const duplicateRows: CommunityPerson[] = [
      { githubId: 88, handle: 'lead-dev', communityCommitCount: 45, eligible: true },
      { githubId: 88, handle: 'lead-dev', communityCommitCount: 45, eligible: true },
    ];

    const avatars = mapCommunityAvatars(duplicateRows, 1);
    expect(avatars).toHaveLength(1);
    expect(avatars[0].githubId).toBe(88);
  });

  it('formats crowd summary with honest total vs visible sample representation', () => {
    const sampled = formatCrowdSummary(120, 30);
    expect(sampled.isSampled).toBe(true);
    expect(sampled.totalEligibleCount).toBe(120);
    expect(sampled.visibleSampleCount).toBe(30);
    expect(sampled.label).toBe('Showing 30 of 120 contributors');

    const full = formatCrowdSummary(15, 15);
    expect(full.isSampled).toBe(false);
    expect(full.label).toBe('15 contributors present');
  });
});
