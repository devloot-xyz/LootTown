import { describe, it, expect } from 'vitest';
import {
  deriveAppearanceBand,
  buildSafeGitHubProfileUrl,
  buildCharacterId,
  createContributorDetailState,
} from './contributor';

describe('Contributor Profile Domain (Issue #18)', () => {
  describe('Appearance Band Derivation', () => {
    it('returns unknown if coverage is incomplete, regardless of count', () => {
      expect(deriveAppearanceBand(100, false)).toBe('unknown');
      expect(deriveAppearanceBand(1, false)).toBe('unknown');
      expect(deriveAppearanceBand(0, false)).toBe('unknown');
    });

    it('returns unknown if commit count is null even if coverage claims complete', () => {
      expect(deriveAppearanceBand(null, true)).toBe('unknown');
      expect(deriveAppearanceBand(null, false)).toBe('unknown');
    });

    it('accurately stratifies complete certified counts into bands', () => {
      expect(deriveAppearanceBand(5, true)).toBe('emerging');
      expect(deriveAppearanceBand(15, true)).toBe('active');
      expect(deriveAppearanceBand(120, true)).toBe('core');
    });
  });

  describe('Safe GitHub Profile URL Builder', () => {
    it('builds canonical https://github.com/handle links', () => {
      expect(buildSafeGitHubProfileUrl('torvalds')).toBe('https://github.com/torvalds');
      expect(buildSafeGitHubProfileUrl('@d2diego')).toBe('https://github.com/d2diego');
      expect(buildSafeGitHubProfileUrl('octo-cat')).toBe('https://github.com/octo-cat');
    });

    it('rejects unsafe or invalid handles', () => {
      expect(() => buildSafeGitHubProfileUrl('')).toThrow();
      expect(() => buildSafeGitHubProfileUrl('bad/path')).toThrow();
      expect(() => buildSafeGitHubProfileUrl('javascript:alert(1)')).toThrow();
      expect(() => buildSafeGitHubProfileUrl('user name')).toThrow();
    });
  });

  describe('Character ID Builder', () => {
    it('creates deterministic character id', () => {
      expect(buildCharacterId(7, 1234)).toBe('char-7-1234');
      expect(() => buildCharacterId(-1, 100)).toThrow();
      expect(() => buildCharacterId(1, 0)).toThrow();
    });
  });

  describe('createContributorDetailState', () => {
    it('constructs certified detail state when coverage is complete', () => {
      const state = createContributorDetailState(
        {
          githubId: 42,
          handle: 'senior-dev',
          communityCommitCount: 35,
          eligible: true,
        },
        { id: 10, name: 'Open Web' },
        {
          complete: true,
          lastSyncedAt: '2026-11-04T00:00:00.000Z',
          policyVersion: '1.0.0',
        }
      );

      expect(state.characterId).toBe('char-10-42');
      expect(state.isCoverageComplete).toBe(true);
      expect(state.certifiedCommitCount).toBe(35);
      expect(state.appearanceBand).toBe('active');
      expect(state.gitHubProfileUrl).toBe('https://github.com/senior-dev');
    });

    it('constructs uncertified detail state when coverage is incomplete and preserves null count', () => {
      const state = createContributorDetailState(
        {
          githubId: 88,
          handle: 'new-contributor',
          communityCommitCount: null,
          eligible: true,
        },
        { id: 10, name: 'Open Web' },
        {
          complete: false,
          lastSyncedAt: null,
          policyVersion: '1.0.0',
        }
      );

      expect(state.isCoverageComplete).toBe(false);
      expect(state.certifiedCommitCount).toBeNull();
      expect(state.appearanceBand).toBe('unknown');
    });
  });
});
