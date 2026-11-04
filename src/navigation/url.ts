export interface NavigationTarget {
  communityId: number | null;
  contributorId: number | null;
}

export type FallbackReason = 'invalid_query' | 'unknown_community' | 'unknown_contributor';

export interface NavigationState extends NavigationTarget {
  view: 'world' | 'venue';
  isFallback: boolean;
  fallbackReason?: FallbackReason;
}

export interface VenueLookup {
  id: number;
  people?: { githubId: number }[];
}

/**
 * Parses query parameters or URL strings into an unchecked navigation target.
 * Expects `community` and optional `contributor` query parameters.
 */
export function parseNavigationUrl(input: string | URLSearchParams): {
  target: NavigationTarget;
  rawValid: boolean;
} {
  const params = typeof input === 'string'
    ? input.includes('?')
      ? new URLSearchParams(input.slice(input.indexOf('?')))
      : new URLSearchParams(input)
    : input;

  const rawCommunity = params.get('community');
  const rawContributor = params.get('contributor');

  if (!rawCommunity) {
    return {
      target: { communityId: null, contributorId: null },
      rawValid: true,
    };
  }

  const parsedCommunity = Number.parseInt(rawCommunity, 10);
  if (!Number.isSafeInteger(parsedCommunity) || parsedCommunity <= 0) {
    return {
      target: { communityId: null, contributorId: null },
      rawValid: false,
    };
  }

  if (!rawContributor) {
    return {
      target: { communityId: parsedCommunity, contributorId: null },
      rawValid: true,
    };
  }

  const parsedContributor = Number.parseInt(rawContributor, 10);
  if (!Number.isSafeInteger(parsedContributor) || parsedContributor <= 0) {
    return {
      target: { communityId: parsedCommunity, contributorId: null },
      rawValid: false,
    };
  }

  return {
    target: { communityId: parsedCommunity, contributorId: parsedContributor },
    rawValid: true,
  };
}

/**
 * Builds a deterministic canonical URL or query string for the navigation state.
 * Transient state like camera orbit/pan/zoom is intentionally omitted to keep
 * deep links concise and stable across data refreshes.
 */
export function buildCanonicalUrl(target: Partial<NavigationTarget>, origin = ''): string {
  const params = new URLSearchParams();

  if (target.communityId && Number.isSafeInteger(target.communityId) && target.communityId > 0) {
    params.set('community', target.communityId.toString());

    if (target.contributorId && Number.isSafeInteger(target.contributorId) && target.contributorId > 0) {
      params.set('contributor', target.contributorId.toString());
    }
  }

  const queryString = params.toString();
  const searchPart = queryString ? `?${queryString}` : '';

  if (!origin) {
    return searchPart || '/';
  }

  try {
    const url = new URL(origin);
    url.search = queryString;
    return url.toString();
  } catch {
    return `${origin.replace(/\/+$/, '')}/${searchPart}`;
  }
}

/**
 * Validates a navigation target against known venues and contributor lists.
 * Provides safe fallback:
 * - Unknown community -> fallback to world view.
 * - Unknown contributor in known community -> fallback to community venue.
 */
export function resolveNavigationState(
  target: NavigationTarget,
  knownVenues?: VenueLookup[],
): NavigationState {
  if (!target.communityId) {
    return {
      view: 'world',
      communityId: null,
      contributorId: null,
      isFallback: false,
    };
  }

  // If venues are not loaded yet, assume target is pending validation
  if (!knownVenues) {
    return {
      view: 'venue',
      communityId: target.communityId,
      contributorId: target.contributorId,
      isFallback: false,
    };
  }

  const matchingVenue = knownVenues.find((v) => v.id === target.communityId);
  if (!matchingVenue) {
    return {
      view: 'world',
      communityId: null,
      contributorId: null,
      isFallback: true,
      fallbackReason: 'unknown_community',
    };
  }

  if (!target.contributorId) {
    return {
      view: 'venue',
      communityId: matchingVenue.id,
      contributorId: null,
      isFallback: false,
    };
  }

  const hasContributor = matchingVenue.people?.some((p) => p.githubId === target.contributorId);
  if (!hasContributor) {
    return {
      view: 'venue',
      communityId: matchingVenue.id,
      contributorId: null,
      isFallback: true,
      fallbackReason: 'unknown_contributor',
    };
  }

  return {
    view: 'venue',
    communityId: matchingVenue.id,
    contributorId: target.contributorId,
    isFallback: false,
  };
}
