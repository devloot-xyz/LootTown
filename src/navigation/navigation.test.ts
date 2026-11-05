import { describe, expect, test } from 'vitest';
import {
  buildCanonicalUrl,
  parseNavigationUrl,
  resolveNavigationState,
} from './url.ts';

describe('Navigation and Deep Link Integration', () => {
  const venues = [
    {
      id: 1,
      name: 'Algorand Builders',
      people: [
        { githubId: 101, handle: 'alice_algo' },
        { githubId: 102, handle: 'bob_indexer' },
      ],
    },
    {
      id: 2,
      name: 'Solana Speedrunners',
      people: [
        { githubId: 201, handle: 'sol_dev' },
      ],
    },
  ];

  test('direct external navigation to known venue opens venue state', () => {
    const parsed = parseNavigationUrl('?community=1');
    expect(parsed.rawValid).toBe(true);
    const resolved = resolveNavigationState(parsed.target, venues);
    expect(resolved).toEqual({
      view: 'venue',
      communityId: 1,
      contributorId: null,
      isFallback: false,
    });
    expect(buildCanonicalUrl(resolved)).toBe('?community=1');
  });

  test('direct external navigation to known contributor opens contributor state', () => {
    const parsed = parseNavigationUrl('?community=1&contributor=101');
    expect(parsed.rawValid).toBe(true);
    const resolved = resolveNavigationState(parsed.target, venues);
    expect(resolved).toEqual({
      view: 'venue',
      communityId: 1,
      contributorId: 101,
      isFallback: false,
    });
    expect(buildCanonicalUrl(resolved)).toBe('?community=1&contributor=101');
  });

  test('unknown community returns safely to world view', () => {
    const parsed = parseNavigationUrl('?community=999');
    const resolved = resolveNavigationState(parsed.target, venues);
    expect(resolved.view).toBe('world');
    expect(resolved.communityId).toBeNull();
    expect(resolved.contributorId).toBeNull();
    expect(resolved.isFallback).toBe(true);
    expect(resolved.fallbackReason).toBe('unknown_community');
    expect(buildCanonicalUrl(resolved)).toBe('/');
  });

  test('unknown contributor in known venue falls back safely to venue without contributor', () => {
    const parsed = parseNavigationUrl('?community=1&contributor=999');
    const resolved = resolveNavigationState(parsed.target, venues);
    expect(resolved.view).toBe('venue');
    expect(resolved.communityId).toBe(1);
    expect(resolved.contributorId).toBeNull();
    expect(resolved.isFallback).toBe(true);
    expect(resolved.fallbackReason).toBe('unknown_contributor');
    expect(buildCanonicalUrl(resolved)).toBe('?community=1');
  });

  test('back/forward history retention: preserves target parameters without duplicates', () => {
    // Step 1: user visits world
    const step1 = parseNavigationUrl('');
    expect(step1.target).toEqual({ communityId: null, contributorId: null });

    // Step 2: user enters venue 1
    const step2 = parseNavigationUrl('?community=1');
    expect(step2.target).toEqual({ communityId: 1, contributorId: null });

    // Step 3: user selects contributor 101
    const step3 = parseNavigationUrl('?community=1&contributor=101');
    expect(step3.target).toEqual({ communityId: 1, contributorId: 101 });

    // Step 4: user presses back (step2)
    const backToStep2 = resolveNavigationState(step2.target, venues);
    expect(backToStep2).toEqual({
      view: 'venue',
      communityId: 1,
      contributorId: null,
      isFallback: false,
    });

    // Step 5: user presses back to world (step1)
    const backToWorld = resolveNavigationState(step1.target, venues);
    expect(backToWorld).toEqual({
      view: 'world',
      communityId: null,
      contributorId: null,
      isFallback: false,
    });
  });
});
