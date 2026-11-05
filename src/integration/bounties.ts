/**
 * DevLoot Bounty Read Model and Monster Integration Adapter
 * Implements Issue #20 specifications for LootTown.
 * Reference: docs/contracts.md (DevLoot bounty read model /api/bounties)
 */

export interface DevLootBountyRecord {
  id: number;
  bountyKey: string;
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  issueUrl: string;
  amount: number; // micro USDC integer (divide by 1_000_000 for display)
  creatorWallet: string;
  status: 'OPEN' | 'IN_REVIEW' | 'CLOSED' | 'EXPIRED' | string;
  winnerId: number | null;
  winner?: {
    id: number;
    username: string;
    wallet: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  reviewUntil?: string | null;
  winningPrUrl?: string | null;
  winningPrAuthor?: string | null;
  openPrCount: number;
  issueTitle: string;
  projectId?: number | null;
}

export type MonsterInteractionState = 'ACTIVE' | 'IN_REVIEW' | 'CLOSED' | 'STALE' | 'EMPTY';

export interface MonsterBountyState {
  monsterId: string;
  communityId: number;
  bountyId: number;
  title: string;
  repo: string;
  issueNumber: number;
  state: MonsterInteractionState;
  isActive: boolean;
  canonicalUrl: string;
  sourceIssueUrl: string;
  openPrCount: number;
  lastSyncedAt: string;
  amountFormatted?: string;
}

export interface MonsterAdapterResult {
  monsters: MonsterBountyState[];
  errors: string[];
  totalParsed: number;
  activeCount: number;
  sourceFreshness: {
    lastUpdatedAt: string | null;
    isFresh: boolean;
  };
}

/**
 * Validates whether a handoff URL is a safe, canonical DevLoot URL.
 * Rejects non-HTTPS schemes, javascript:, file:, data:, or untrusted hostnames.
 */
export function isCanonicalDevLootUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    // Canonical hostnames for DevLoot
    const allowedHosts = ['devloot.xyz', 'www.devloot.xyz', 'app.devloot.xyz', 'staging.devloot.xyz'];
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) return false;
    // Must target bounty detail path
    return /^\/bounty\/\d+$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Generates the canonical DevLoot bounty detail URL.
 */
export function buildCanonicalDevLootBountyUrl(bountyId: number): string {
  if (!Number.isInteger(bountyId) || bountyId <= 0) {
    throw new Error(`Invalid bountyId: ${bountyId}`);
  }
  return `https://devloot.xyz/bounty/${bountyId}`;
}

/**
 * Validates whether an external issue URL is an authentic, safe GitHub issue URL.
 */
export function isSafeIssueUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname.toLowerCase() !== 'github.com') return false;
    return /^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/issues\/\d+$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Formats a raw micro-USDC integer into standard USD display without extrapolation.
 */
export function formatMicroUsdc(rawAmount: number): string {
  if (typeof rawAmount !== 'number' || isNaN(rawAmount) || rawAmount < 0) {
    return '$0.00';
  }
  const usd = rawAmount / 1_000_000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

/**
 * Validates a single DevLoot bounty record for schema conformance and security.
 */
export function validateBountyRecord(record: unknown): { valid: boolean; error?: string; data?: DevLootBountyRecord } {
  if (!record || typeof record !== 'object') {
    return { valid: false, error: 'Record must be a non-null object' };
  }

  const r = record as Partial<DevLootBountyRecord>;

  if (typeof r.id !== 'number' || !Number.isInteger(r.id) || r.id <= 0) {
    return { valid: false, error: `Invalid or missing bounty id: ${String(r.id)}` };
  }

  if (typeof r.issueTitle !== 'string' || r.issueTitle.trim().length === 0) {
    return { valid: false, error: `Bounty #${r.id} missing valid issueTitle` };
  }

  if (typeof r.repoOwner !== 'string' || typeof r.repoName !== 'string') {
    return { valid: false, error: `Bounty #${r.id} missing repository information` };
  }

  if (typeof r.issueUrl !== 'string' || !isSafeIssueUrl(r.issueUrl)) {
    return { valid: false, error: `Bounty #${r.id} contains invalid or unsafe issueUrl: ${String(r.issueUrl)}` };
  }

  if (typeof r.status !== 'string') {
    return { valid: false, error: `Bounty #${r.id} missing status string` };
  }

  return { valid: true, data: r as DevLootBountyRecord };
}

/**
 * Adapts raw public DevLoot bounties to in-world monster states.
 * Enforces:
 * - 1 eligible bounty -> 1 monster in the community
 * - Stale/closed bounties cannot appear active
 * - Deduplication on bounty ID
 * - Strict URL sanitization and canonical link generation
 * - Visible failure handling without fabrication
 */
export function adaptDevLootBountiesToMonsters(
  rawPayload: unknown,
  targetCommunityId: number,
  staleThresholdMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): MonsterAdapterResult {
  const errors: string[] = [];
  const monsters: MonsterBountyState[] = [];
  const seenBountyIds = new Set<number>();
  let latestUpdateMs = 0;

  if (!rawPayload || typeof rawPayload !== 'object') {
    errors.push('Raw payload is invalid or empty; rendering safe empty state.');
    return {
      monsters: [],
      errors,
      totalParsed: 0,
      activeCount: 0,
      sourceFreshness: { lastUpdatedAt: null, isFresh: false },
    };
  }

  // Support either direct array or standard API envelope { data: [...] }
  let records: unknown[] = [];
  if (Array.isArray(rawPayload)) {
    records = rawPayload;
  } else if ('data' in rawPayload && Array.isArray((rawPayload as { data: unknown[] }).data)) {
    records = (rawPayload as { data: unknown[] }).data;
  } else {
    errors.push('Payload missing "data" array; rendering safe empty state.');
    return {
      monsters: [],
      errors,
      totalParsed: 0,
      activeCount: 0,
      sourceFreshness: { lastUpdatedAt: null, isFresh: false },
    };
  }

  const nowMs = Date.now();

  for (const item of records) {
    const validation = validateBountyRecord(item);
    if (!validation.valid || !validation.data) {
      errors.push(validation.error || 'Unknown validation failure');
      continue;
    }

    const b = validation.data;

    // Filter by community association if specified
    if (b.projectId !== undefined && b.projectId !== null && b.projectId !== targetCommunityId) {
      continue; // Associated with a different community
    }

    // Deduplication check
    if (seenBountyIds.has(b.id)) {
      errors.push(`Duplicate bounty ID ${b.id} detected; skipping duplicate.`);
      continue;
    }
    seenBountyIds.add(b.id);

    // Track latest source update
    const updatedAtMs = Date.parse(b.updatedAt);
    if (!isNaN(updatedAtMs) && updatedAtMs > latestUpdateMs) {
      latestUpdateMs = updatedAtMs;
    }

    // Determine lifecycle state
    const normalizedStatus = b.status.toUpperCase();
    const isStale = !isNaN(updatedAtMs) && nowMs - updatedAtMs > staleThresholdMs;

    let monsterState: MonsterInteractionState = 'CLOSED';
    let isActive = false;

    if (normalizedStatus === 'OPEN' && !b.winnerId) {
      if (isStale) {
        monsterState = 'STALE';
        isActive = false; // Stale bounties cannot appear active
      } else {
        monsterState = 'ACTIVE';
        isActive = true;
      }
    } else if (normalizedStatus === 'IN_REVIEW') {
      monsterState = 'IN_REVIEW';
      isActive = false;
    } else {
      monsterState = 'CLOSED';
      isActive = false;
    }

    const canonicalUrl = buildCanonicalDevLootBountyUrl(b.id);

    monsters.push({
      monsterId: `monster-${targetCommunityId}-${b.id}`,
      communityId: targetCommunityId,
      bountyId: b.id,
      title: b.issueTitle,
      repo: `${b.repoOwner}/${b.repoName}`,
      issueNumber: b.issueNumber,
      state: monsterState,
      isActive,
      canonicalUrl,
      sourceIssueUrl: b.issueUrl,
      openPrCount: typeof b.openPrCount === 'number' ? b.openPrCount : 0,
      lastSyncedAt: b.updatedAt,
      amountFormatted: typeof b.amount === 'number' ? formatMicroUsdc(b.amount) : undefined,
    });
  }

  const activeCount = monsters.filter((m) => m.isActive).length;

  return {
    monsters,
    errors,
    totalParsed: monsters.length,
    activeCount,
    sourceFreshness: {
      lastUpdatedAt: latestUpdateMs > 0 ? new Date(latestUpdateMs).toISOString() : null,
      isFresh: latestUpdateMs > 0 && nowMs - latestUpdateMs <= staleThresholdMs,
    },
  };
}
