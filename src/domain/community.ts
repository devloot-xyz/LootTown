export type AvatarTier = 'base' | 'accessory' | 'elaborate' | 'special' | 'veteran' | 'unknown';

export interface CommunityPerson {
  githubId: number;
  handle: string;
  communityCommitCount: number | null;
  eligible: boolean;
}

export function avatarTier(commits: number | null): AvatarTier {
  if (commits === null) return 'unknown';
  if (!Number.isSafeInteger(commits) || commits < 0) throw new Error('Invalid commit count');
  if (commits < 1) return 'unknown';
  if (commits < 10) return 'base';
  if (commits < 50) return 'accessory';
  if (commits < 200) return 'elaborate';
  if (commits < 1000) return 'special';
  return 'veteran';
}

// The backend must already deduplicate commits across linked repositories.
// Repeated person rows may be collapsed only when their aggregate agrees.
export function uniquePeople(rows: CommunityPerson[]): CommunityPerson[] {
  const people = new Map<number, CommunityPerson>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.githubId) || row.githubId <= 0) throw new Error('Invalid GitHub ID');
    const prior = people.get(row.githubId);
    if (prior && (prior.communityCommitCount !== row.communityCommitCount || prior.eligible !== row.eligible)) {
      throw new Error(`Conflicting community aggregate for GitHub ID ${row.githubId}`);
    }
    if (!prior) people.set(row.githubId, row);
  }
  return [...people.values()].filter((person) => person.eligible);
}
