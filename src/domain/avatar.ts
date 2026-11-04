/**
 * Avatar Appearance & Identity Mapping Domain.
 *
 * Implements deterministic avatar mapping for LootTown contributors according to
 * approved commit bands (Issue #15):
 * - 1–9: base
 * - 10–49: accessory
 * - 50–199: elaborate
 * - 200–999: special details / posture
 * - 1000+: veteran
 * - null / 0: unknown (neutral, no inactivity downgrade)
 *
 * Invariants:
 * 1. Palette & identity colors derive deterministically from (githubId, communityId)
 *    and remain stable across commit count changes and reloads.
 * 2. Deduplication enforces strictly one character per unique GitHub identity.
 * 3. Person count is reported independently from the visible sample.
 * 4. No online presence or qualitative superiority is implied.
 */

import { avatarTier, type AvatarTier, type CommunityPerson, uniquePeople } from './community.ts';

export interface AvatarPalette {
  primaryColor: string;
  accentColor: string;
  clothingStyle: 'base_tunic' | 'accessory_belt_pack' | 'elaborate_cloak' | 'distinguished_regalia' | 'veteran_mantle' | 'neutral_garb';
  posture: 'standard' | 'focused' | 'veteran_stance';
}

export interface AvatarAppearance {
  githubId: number;
  communityId: number;
  handle: string;
  tier: AvatarTier;
  bandLabel: string;
  commitCount: number | null;
  palette: AvatarPalette;
  accessibleDescription: string;
}

export interface CrowdSummary {
  totalEligibleCount: number;
  visibleSampleCount: number;
  isSampled: boolean;
  label: string;
}

/**
 * Approved commit band human-readable label.
 */
export function getBandLabel(tier: AvatarTier): string {
  switch (tier) {
    case 'base':
      return '1–9 commits (Base)';
    case 'accessory':
      return '10–49 commits (Accessory)';
    case 'elaborate':
      return '50–199 commits (Elaborate)';
    case 'special':
      return '200–999 commits (Special)';
    case 'veteran':
      return '1,000+ commits (Veteran)';
    case 'unknown':
    default:
      return 'Unspecified commits';
  }
}

/**
 * Deterministically generates a stable HSL color from numeric seeds.
 */
function generateDeterministicHsl(seed1: number, seed2: number, offset = 0): string {
  // Simple 32-bit integer hash combination
  let hash = (seed1 * 2654435761) ^ (seed2 * 2246822519) ^ offset;
  hash = Math.abs(hash);
  const hue = hash % 360;
  const saturation = 55 + (hash % 30); // 55% - 85%
  const lightness = 45 + ((hash >> 4) % 25); // 45% - 70%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Derives clothing style and posture from approved avatar tier.
 */
export function deriveOutfit(tier: AvatarTier): {
  clothingStyle: AvatarPalette['clothingStyle'];
  posture: AvatarPalette['posture'];
} {
  switch (tier) {
    case 'base':
      return { clothingStyle: 'base_tunic', posture: 'standard' };
    case 'accessory':
      return { clothingStyle: 'accessory_belt_pack', posture: 'standard' };
    case 'elaborate':
      return { clothingStyle: 'elaborate_cloak', posture: 'focused' };
    case 'special':
      return { clothingStyle: 'distinguished_regalia', posture: 'veteran_stance' };
    case 'veteran':
      return { clothingStyle: 'veteran_mantle', posture: 'veteran_stance' };
    case 'unknown':
    default:
      return { clothingStyle: 'neutral_garb', posture: 'standard' };
  }
}

/**
 * Maps a community person to a complete, deterministic AvatarAppearance.
 */
export function mapPersonToAvatar(person: CommunityPerson, communityId: number): AvatarAppearance {
  const tier = avatarTier(person.communityCommitCount);
  const { clothingStyle, posture } = deriveOutfit(tier);

  // Identity colors depend strictly on githubId and communityId, NOT commitCount,
  // guaranteeing identity continuity if commit counts increment.
  const primaryColor = generateDeterministicHsl(person.githubId, communityId, 0);
  const accentColor = generateDeterministicHsl(person.githubId, communityId, 180);

  const bandLabel = getBandLabel(tier);
  const accessibleDescription = `${person.handle} (${bandLabel})`;

  return {
    githubId: person.githubId,
    communityId,
    handle: person.handle,
    tier,
    bandLabel,
    commitCount: person.communityCommitCount,
    palette: {
      primaryColor,
      accentColor,
      clothingStyle,
      posture,
    },
    accessibleDescription,
  };
}

/**
 * Deduplicates and maps a list of community person records into avatar appearances.
 * Guarantees exactly one avatar per unique GitHub ID.
 */
export function mapCommunityAvatars(people: CommunityPerson[], communityId: number): AvatarAppearance[] {
  const unique = uniquePeople(people);
  return unique.map((person) => mapPersonToAvatar(person, communityId));
}

/**
 * Computes crowd summary preserving explicit distinction between total and visible sample.
 */
export function formatCrowdSummary(totalEligible: number, visibleSample: number): CrowdSummary {
  const isSampled = visibleSample < totalEligible;
  const label = isSampled
    ? `Showing ${visibleSample} of ${totalEligible} contributors`
    : `${totalEligible} contributors present`;

  return {
    totalEligibleCount: totalEligible,
    visibleSampleCount: visibleSample,
    isSampled,
    label,
  };
}
