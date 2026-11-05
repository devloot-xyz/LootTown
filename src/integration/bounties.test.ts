import { describe, it, expect } from 'vitest';
import {
  adaptDevLootBountiesToMonsters,
  buildCanonicalDevLootBountyUrl,
  isCanonicalDevLootUrl,
  isSafeIssueUrl,
  formatMicroUsdc,
  validateBountyRecord,
  type DevLootBountyRecord,
} from './bounties';

// Live sample fixture based on authentic GET /api/bounties inspection
const REAL_DEVLOOT_API_SAMPLE = {
  data: [
    {
      id: 3,
      bountyKey: 'edd0ac032304cc2b719d783e4241fcad6780b60528d6c31d76de8fccfd778005',
      repoOwner: 'devloot-xyz',
      repoName: 'devloot_discord_bot',
      issueNumber: 37,
      issueUrl: 'https://github.com/devloot-xyz/devloot_discord_bot/issues/37',
      amount: 6000000,
      creatorWallet: 'Y7BD6LXA5FXUNZTAZN36H6WRDAINHNWZCIBOJUVZZFLMDUC2ERHD5BHMIM',
      status: 'OPEN',
      winnerId: null,
      winner: null,
      createdAt: '2026-11-03T00:47:44.050Z',
      updatedAt: '2026-11-04T07:18:49.304Z',
      openPrCount: 4,
      issueTitle: '[$5 bounty] Make /leaderboard ranks consistent and avoid fetching every user',
      projectId: 1,
    },
    {
      id: 1,
      bountyKey: '1dbf4651e887624da4f3c7e3f5df4bcb5e6b53336aafa11c7138182bbd8dcf3d',
      repoOwner: 'devloot-xyz',
      repoName: 'devloot_discord_bot',
      issueNumber: 33,
      issueUrl: 'https://github.com/devloot-xyz/devloot_discord_bot/issues/33',
      amount: 7000000,
      creatorWallet: 'Y7BD6LXA5FXUNZTAZN36H6WRDAINHNWZCIBOJUVZZFLMDUC2ERHD5BHMIM',
      status: 'IN_REVIEW',
      winnerId: 4245,
      winner: {
        id: 4245,
        username: 'Tusharkhadde',
        wallet: 'XMFKJ3O6JNFR4HN2F5DVPL5CE6KLNFRTIGXHZD6HKWGYLN4HWB4J7FKYVM',
      },
      createdAt: '2026-11-01T06:27:01.967Z',
      updatedAt: '2026-11-04T04:06:19.125Z',
      openPrCount: 2,
      issueTitle: '[$5 bounty] Add a concise README and Discord command reference',
      projectId: 1,
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('DevLoot Bounty Integration & Monster Adapter (Issue #20)', () => {
  describe('Canonical URL and Security Validation', () => {
    it('accepts valid canonical DevLoot bounty URLs', () => {
      expect(isCanonicalDevLootUrl('https://devloot.xyz/bounty/13')).toBe(true);
      expect(isCanonicalDevLootUrl('https://app.devloot.xyz/bounty/42')).toBe(true);
    });

    it('rejects unsafe, non-https, or phishing domains', () => {
      expect(isCanonicalDevLootUrl('http://devloot.xyz/bounty/13')).toBe(false);
      expect(isCanonicalDevLootUrl('javascript:alert(1)')).toBe(false);
      expect(isCanonicalDevLootUrl('https://evil-devloot.xyz/bounty/13')).toBe(false);
      expect(isCanonicalDevLootUrl('https://devloot.xyz/settings')).toBe(false);
      expect(isCanonicalDevLootUrl('')).toBe(false);
    });

    it('builds canonical DevLoot bounty detail URLs deterministically', () => {
      expect(buildCanonicalDevLootBountyUrl(13)).toBe('https://devloot.xyz/bounty/13');
      expect(() => buildCanonicalDevLootBountyUrl(-1)).toThrow();
      expect(() => buildCanonicalDevLootBountyUrl(0)).toThrow();
    });

    it('validates safe GitHub issue links', () => {
      expect(isSafeIssueUrl('https://github.com/devloot-xyz/devloot_discord_bot/issues/37')).toBe(true);
      expect(isSafeIssueUrl('http://github.com/devloot-xyz/devloot_discord_bot/issues/37')).toBe(false);
      expect(isSafeIssueUrl('https://malicious.com/devloot-xyz/devloot_discord_bot/issues/37')).toBe(false);
      expect(isSafeIssueUrl('javascript:void(0)')).toBe(false);
    });
  });

  describe('Micro USDC Formatting', () => {
    it('formats micro-USDC integer accurately', () => {
      expect(formatMicroUsdc(6_000_000)).toBe('$6.00');
      expect(formatMicroUsdc(40_000_000)).toBe('$40.00');
      expect(formatMicroUsdc(500_000)).toBe('$0.50');
      expect(formatMicroUsdc(0)).toBe('$0.00');
    });
  });

  describe('Single Record Validation', () => {
    it('accepts well-formed bounty record', () => {
      const rec = REAL_DEVLOOT_API_SAMPLE.data[0];
      const result = validateBountyRecord(rec);
      expect(result.valid).toBe(true);
      expect(result.data?.id).toBe(3);
    });

    it('rejects missing or malformed fields safely', () => {
      expect(validateBountyRecord(null).valid).toBe(false);
      expect(validateBountyRecord({ id: 'three' }).valid).toBe(false);
      expect(validateBountyRecord({ id: 1, issueTitle: '' }).valid).toBe(false);
      expect(validateBountyRecord({ id: 1, issueTitle: 'Test', issueUrl: 'bad://url' }).valid).toBe(false);
    });
  });

  describe('adaptDevLootBountiesToMonsters', () => {
    it('maps real public DevLoot response to monsters with correct statuses', () => {
      const result = adaptDevLootBountiesToMonsters(REAL_DEVLOOT_API_SAMPLE, 1);

      expect(result.totalParsed).toBe(2);
      expect(result.monsters.length).toBe(2);
      expect(result.errors.length).toBe(0);

      // Bounty 3 (OPEN, no winner) -> ACTIVE monster
      const m3 = result.monsters.find((m) => m.bountyId === 3);
      expect(m3).toBeDefined();
      expect(m3?.isActive).toBe(true);
      expect(m3?.state).toBe('ACTIVE');
      expect(m3?.canonicalUrl).toBe('https://devloot.xyz/bounty/3');
      expect(m3?.amountFormatted).toBe('$6.00');

      // Bounty 1 (IN_REVIEW, has winner) -> IN_REVIEW monster, not active
      const m1 = result.monsters.find((m) => m.bountyId === 1);
      expect(m1).toBeDefined();
      expect(m1?.isActive).toBe(false);
      expect(m1?.state).toBe('IN_REVIEW');
      expect(m1?.canonicalUrl).toBe('https://devloot.xyz/bounty/1');
    });

    it('filters out bounties belonging to another community', () => {
      const result = adaptDevLootBountiesToMonsters(REAL_DEVLOOT_API_SAMPLE, 999);
      expect(result.monsters.length).toBe(0);
      expect(result.activeCount).toBe(0);
    });

    it('deduplicates duplicate bounty records', () => {
      const duplicatePayload = {
        data: [REAL_DEVLOOT_API_SAMPLE.data[0], REAL_DEVLOOT_API_SAMPLE.data[0]],
      };
      const result = adaptDevLootBountiesToMonsters(duplicatePayload, 1);
      expect(result.monsters.length).toBe(1);
      expect(result.errors.some((e) => e.includes('Duplicate bounty ID 3'))).toBe(true);
    });

    it('marks stale bounties as STALE and never active', () => {
      const staleBounty: DevLootBountyRecord = {
        ...REAL_DEVLOOT_API_SAMPLE.data[0],
        id: 99,
        updatedAt: '2020-01-01T00:00:00.000Z', // Long ago
      };
      const result = adaptDevLootBountiesToMonsters([staleBounty], 1, 1000 * 60 * 60); // 1 hour threshold
      expect(result.monsters.length).toBe(1);
      expect(result.monsters[0].state).toBe('STALE');
      expect(result.monsters[0].isActive).toBe(false);
    });

    it('closed bounties cannot appear active', () => {
      const closedBounty: DevLootBountyRecord = {
        ...REAL_DEVLOOT_API_SAMPLE.data[0],
        id: 100,
        status: 'CLOSED',
      };
      const result = adaptDevLootBountiesToMonsters([closedBounty], 1);
      expect(result.monsters.length).toBe(1);
      expect(result.monsters[0].state).toBe('CLOSED');
      expect(result.monsters[0].isActive).toBe(false);
    });

    it('handles empty or corrupted input gracefully without fabricating data', () => {
      const emptyResult = adaptDevLootBountiesToMonsters(null, 1);
      expect(emptyResult.monsters).toEqual([]);
      expect(emptyResult.errors.length).toBeGreaterThan(0);
      expect(emptyResult.activeCount).toBe(0);

      const invalidPayloadResult = adaptDevLootBountiesToMonsters({ random: 'noise' }, 1);
      expect(invalidPayloadResult.monsters).toEqual([]);
      expect(invalidPayloadResult.errors.length).toBeGreaterThan(0);
    });
  });
});
