/**
 * Contributor Profile Domain & Evidence Model
 * Implements Issue #18 specifications for LootTown.
 * Reference: docs/contracts.md (VenueV1 and Contributor Participation)
 */

export type AppearanceBand = 'unknown' | 'emerging' | 'active' | 'core';

export interface ContributorPerson {
  githubId: number;
  handle: string;
  communityCommitCount: number | null;
  eligible: boolean;
}

export interface CommunityCoverage {
  complete: boolean;
  lastSyncedAt: string | null;
  policyVersion: string;
}

export interface ContributorDetailState {
  characterId: string;
  githubId: number;
  handle: string;
  communityId: number;
  communityName: string;
  appearanceBand: AppearanceBand;
  isCoverageComplete: boolean;
  certifiedCommitCount: number | null;
  lastSyncedAt: string | null;
  gitHubProfileUrl: string;
}

/**
 * Derives the visual appearance band for a contributor avatar.
 * Invariant: Unknown contribution count NEVER renders as 0 or a lower tier.
 */
export function deriveAppearanceBand(commitCount: number | null, isComplete: boolean): AppearanceBand {
  if (!isComplete || commitCount === null) {
    return 'unknown';
  }
  if (commitCount >= 50) return 'core';
  if (commitCount >= 10) return 'active';
  return 'emerging';
}

/**
 * Builds a safe, canonical GitHub profile URL for an inspected character.
 * Strictly sanitizes username and validates character constraints.
 */
export function buildSafeGitHubProfileUrl(handle: string): string {
  if (!handle || typeof handle !== 'string') {
    throw new Error('Invalid GitHub handle');
  }
  const clean = handle.trim().replace(/^@/, '');
  // GitHub usernames are alphanumeric and single hyphens (max 39 chars)
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(clean)) {
    throw new Error(`Unsafe or malformed GitHub handle: ${handle}`);
  }
  return `https://github.com/${clean}`;
}

/**
 * Generates a stable character ID keyed by community and githubId.
 */
export function buildCharacterId(communityId: number, githubId: number): string {
  if (!Number.isInteger(communityId) || communityId <= 0) {
    throw new Error(`Invalid communityId: ${communityId}`);
  }
  if (!Number.isInteger(githubId) || githubId <= 0) {
    throw new Error(`Invalid githubId: ${githubId}`);
  }
  return `char-${communityId}-${githubId}`;
}

/**
 * Prepares the contributor detail state from a person and community context.
 * Guarantees that incomplete coverage yields an explicit uncertified/unknown state.
 */
export function createContributorDetailState(
  person: ContributorPerson,
  community: { id: number; name: string },
  coverage: CommunityCoverage
): ContributorDetailState {
  const isComplete = coverage.complete && person.communityCommitCount !== null;
  const appearanceBand = deriveAppearanceBand(person.communityCommitCount, coverage.complete);
  const gitHubProfileUrl = buildSafeGitHubProfileUrl(person.handle);
  const characterId = buildCharacterId(community.id, person.githubId);

  return {
    characterId,
    githubId: person.githubId,
    handle: person.handle,
    communityId: community.id,
    communityName: community.name,
    appearanceBand,
    isCoverageComplete: isComplete,
    certifiedCommitCount: isComplete ? person.communityCommitCount : null,
    lastSyncedAt: coverage.lastSyncedAt,
    gitHubProfileUrl,
  };
}
