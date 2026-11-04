/**
 * Venue Read Adapter for LootTown.
 *
 * Implements truthful public data reading against DevLoot venue projections
 * while preserving a distinct offline fixture mode for local development.
 *
 * Strictly adheres to LootTown invariants:
 * 1. Never silently fall back from a failed live fetch to fake fixture data.
 * 2. Partial coverage (`complete: false`) renders no definitive commit counts or bands.
 * 3. Read-only: emits zero mutations, tokens, or writes.
 */

import { parseVenueV1, type VenueV1 } from '../contracts/venue.ts';

export type VenueReadSource = 'live' | 'fixture';

export type VenueReadState =
  | { kind: 'loading'; communityId: number }
  | {
      kind: 'success';
      communityId: number;
      venue: VenueV1;
      source: 'live';
      isPartial: boolean;
      totalPeopleCount: number;
    }
  | {
      kind: 'offline_fixture';
      communityId: number;
      venue: VenueV1;
      source: 'fixture';
      notice: string;
      totalPeopleCount: number;
    }
  | {
      kind: 'empty';
      communityId: number;
      source: VenueReadSource;
      message: string;
    }
  | {
      kind: 'schema_mismatch';
      communityId: number;
      source: VenueReadSource;
      error: string;
      details?: string;
    }
  | {
      kind: 'transport_error';
      communityId: number;
      source: 'live';
      statusCode?: number;
      error: string;
      retryable: boolean;
    }
  | {
      kind: 'cancelled';
      communityId: number;
      reason: string;
    };

export interface FetchVenueOptions {
  communityId: number;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

export interface PaginatedVenueResponse {
  schemaVersion: number;
  data: VenueV1[];
  page: number;
  totalPages: number;
  total: number;
}

/**
 * Fetch and validate a single community venue from the public projection.
 */
export async function fetchLiveVenue(options: FetchVenueOptions): Promise<VenueReadState> {
  const { communityId, baseUrl = '', fetchFn = fetch, signal } = options;

  if (!Number.isSafeInteger(communityId) || communityId <= 0) {
    return {
      kind: 'transport_error',
      communityId,
      source: 'live',
      error: `Invalid community ID: ${communityId}`,
      retryable: false,
    };
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/venues/${communityId}`;

  try {
    const response = await fetchFn(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          kind: 'empty',
          communityId,
          source: 'live',
          message: `Venue for community ${communityId} not found upstream`,
        };
      }
      return {
        kind: 'transport_error',
        communityId,
        source: 'live',
        statusCode: response.status,
        error: `Upstream HTTP ${response.status}: ${response.statusText}`,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const json = await response.json();
    return validateVenuePayload(json, communityId, 'live');
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      return {
        kind: 'cancelled',
        communityId,
        reason: signal?.reason ? String(signal.reason) : 'Request was cancelled',
      };
    }
    return {
      kind: 'transport_error',
      communityId,
      source: 'live',
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
}

/**
 * Deliberate offline fixture loader.
 * Explicitly marks source as 'fixture' so the UI never confuses test data with verified live data.
 */
export function loadOfflineVenueFixture(communityId: number, fixturePayload: unknown): VenueReadState {
  if (!fixturePayload || typeof fixturePayload !== 'object') {
    return {
      kind: 'schema_mismatch',
      communityId,
      source: 'fixture',
      error: 'Offline fixture is empty or not an object',
    };
  }

  // Handle envelope ({ venues: VenueV1[] }) or direct VenueV1
  const candidate =
    'venues' in fixturePayload && Array.isArray((fixturePayload as { venues: unknown[] }).venues)
      ? (fixturePayload as { venues: { community?: { id?: number } }[] }).venues.find(
          (v) => v.community?.id === communityId
        )
      : fixturePayload;

  if (!candidate) {
    return {
      kind: 'empty',
      communityId,
      source: 'fixture',
      message: `Community ID ${communityId} is not present in offline fixture`,
    };
  }

  const validated = validateVenuePayload(candidate, communityId, 'fixture');
  if (validated.kind === 'success') {
    return {
      kind: 'offline_fixture',
      communityId,
      venue: validated.venue,
      source: 'fixture',
      notice: 'Rendering synthetic offline fixture. Not verified with live DevLoot projection.',
      totalPeopleCount: validated.totalPeopleCount,
    };
  }
  return validated;
}

/**
 * Validates payload against VenueV1 schema and domain rules.
 */
export function validateVenuePayload(
  payload: unknown,
  communityId: number,
  source: VenueReadSource
): VenueReadState {
  try {
    const venue = parseVenueV1(payload);

    if (venue.community.id !== communityId) {
      return {
        kind: 'schema_mismatch',
        communityId,
        source,
        error: `Payload community ID ${venue.community.id} does not match requested ${communityId}`,
      };
    }

    const isPartial = !venue.coverage.complete;
    const eligibleCount = venue.people.filter((p) => p.eligible).length;

    if (eligibleCount === 0 && venue.people.length === 0) {
      return {
        kind: 'empty',
        communityId,
        source,
        message: `Venue ${venue.community.name} has no participating contributors`,
      };
    }

    return {
      kind: 'success',
      communityId,
      venue,
      source: 'live',
      isPartial,
      totalPeopleCount: eligibleCount,
    };
  } catch (err: unknown) {
    return {
      kind: 'schema_mismatch',
      communityId,
      source,
      error: 'Venue schema mismatch or invalid aggregate',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Collect paginated venue records with snapshot/coverage consistency checks.
 */
export async function collectPaginatedVenues(options: {
  fetchPage: (page: number) => Promise<PaginatedVenueResponse>;
  maxPages?: number;
}): Promise<{
  venues: VenueV1[];
  isComplete: boolean;
  totalCollected: number;
  reportedTotal: number;
}> {
  const { fetchPage, maxPages = 20 } = options;
  const venues: VenueV1[] = [];
  let currentPage = 1;
  let totalPages = 1;
  let reportedTotal = 0;

  while (currentPage <= totalPages && currentPage <= maxPages) {
    const pageData = await fetchPage(currentPage);
    if (!pageData || !Array.isArray(pageData.data)) {
      throw new Error(`Invalid paginated response structure on page ${currentPage}`);
    }

    reportedTotal = pageData.total;
    totalPages = pageData.totalPages;

    for (const rawVenue of pageData.data) {
      const validated = parseVenueV1(rawVenue);
      venues.push(validated);
    }

    currentPage++;
  }

  const isComplete = currentPage > totalPages && venues.length >= reportedTotal;

  return {
    venues,
    isComplete,
    totalCollected: venues.length,
    reportedTotal,
  };
}
