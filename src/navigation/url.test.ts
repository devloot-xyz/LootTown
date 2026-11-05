import { describe, expect, test } from 'vitest';
import {
  buildCanonicalUrl,
  parseNavigationUrl,
  resolveNavigationState,
} from './url.ts';

describe('parseNavigationUrl', () => {
  test('parses empty query string to world view', () => {
    const { target, rawValid } = parseNavigationUrl('');
    expect(target).toEqual({ communityId: null, contributorId: null });
    expect(rawValid).toBe(true);
  });

  test('parses single community ID', () => {
    const { target, rawValid } = parseNavigationUrl('?community=7');
    expect(target).toEqual({ communityId: 7, contributorId: null });
    expect(rawValid).toBe(true);
  });

  test('parses full URL with community and contributor', () => {
    const { target, rawValid } = parseNavigationUrl('https://example.com/loottown?community=42&contributor=987');
    expect(target).toEqual({ communityId: 42, contributorId: 987 });
    expect(rawValid).toBe(true);
  });

  test('rejects non-numeric community as invalid query', () => {
    const { target, rawValid } = parseNavigationUrl('?community=bad-id');
    expect(target).toEqual({ communityId: null, contributorId: null });
    expect(rawValid).toBe(false);
  });

  test('falls back to community if contributor is non-numeric', () => {
    const { target, rawValid } = parseNavigationUrl('?community=12&contributor=invalid');
    expect(target).toEqual({ communityId: 12, contributorId: null });
    expect(rawValid).toBe(false);
  });
});

describe('buildCanonicalUrl', () => {
  test('builds root path for world view', () => {
    expect(buildCanonicalUrl({})).toBe('/');
  });

  test('builds query string for venue', () => {
    expect(buildCanonicalUrl({ communityId: 5 })).toBe('?community=5');
  });

  test('builds query string for venue and contributor', () => {
    expect(buildCanonicalUrl({ communityId: 5, contributorId: 101 })).toBe('?community=5&contributor=101');
  });

  test('attaches query params to full origin URL', () => {
    expect(buildCanonicalUrl({ communityId: 7 }, 'https://loottown.devloot.xyz/town'))
      .toBe('https://loottown.devloot.xyz/town?community=7');
  });
});

describe('resolveNavigationState', () => {
  const mockVenues = [
    {
      id: 1,
      people: [{ githubId: 100 }, { githubId: 101 }],
    },
    {
      id: 2,
      people: [{ githubId: 200 }],
    },
  ];

  test('resolves default world view', () => {
    const state = resolveNavigationState({ communityId: null, contributorId: null }, mockVenues);
    expect(state).toEqual({
      view: 'world',
      communityId: null,
      contributorId: null,
      isFallback: false,
    });
  });

  test('resolves known venue and contributor', () => {
    const state = resolveNavigationState({ communityId: 1, contributorId: 100 }, mockVenues);
    expect(state).toEqual({
      view: 'venue',
      communityId: 1,
      contributorId: 100,
      isFallback: false,
    });
  });

  test('falls back to world on unknown community ID', () => {
    const state = resolveNavigationState({ communityId: 999, contributorId: 100 }, mockVenues);
    expect(state).toEqual({
      view: 'world',
      communityId: null,
      contributorId: null,
      isFallback: true,
      fallbackReason: 'unknown_community',
    });
  });

  test('falls back to venue on unknown contributor ID', () => {
    const state = resolveNavigationState({ communityId: 1, contributorId: 999 }, mockVenues);
    expect(state).toEqual({
      view: 'venue',
      communityId: 1,
      contributorId: null,
      isFallback: true,
      fallbackReason: 'unknown_contributor',
    });
  });
});
