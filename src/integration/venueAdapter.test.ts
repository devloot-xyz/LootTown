import { describe, it, expect, vi } from 'vitest';
import {
  fetchLiveVenue,
  loadOfflineVenueFixture,
  validateVenuePayload,
  collectPaginatedVenues,
} from './venueAdapter.ts';

const validCompleteVenue = {
  schemaVersion: 1,
  community: { id: 10, name: 'Open Web Collective' },
  coverage: {
    complete: true,
    lastSyncedAt: '2026-11-04T00:00:00.000Z',
    policyVersion: '1.0.0',
  },
  people: [
    { githubId: 101, handle: 'alice', communityCommitCount: 15, eligible: true },
    { githubId: 102, handle: 'bob', communityCommitCount: 4, eligible: true },
  ],
};

const validPartialVenue = {
  schemaVersion: 1,
  community: { id: 10, name: 'Open Web Collective' },
  coverage: {
    complete: false,
    lastSyncedAt: null,
    policyVersion: '1.0.0',
  },
  people: [
    { githubId: 101, handle: 'alice', communityCommitCount: null, eligible: true },
    { githubId: 102, handle: 'bob', communityCommitCount: null, eligible: true },
  ],
};

describe('venueAdapter - validateVenuePayload', () => {
  it('validates a compatible complete venue projection', () => {
    const res = validateVenuePayload(validCompleteVenue, 10, 'live');
    expect(res.kind).toBe('success');
    if (res.kind === 'success') {
      expect(res.source).toBe('live');
      expect(res.isPartial).toBe(false);
      expect(res.totalPeopleCount).toBe(2);
      expect(res.venue.community.name).toBe('Open Web Collective');
    }
  });

  it('validates a partial venue where commit counts are correctly null', () => {
    const res = validateVenuePayload(validPartialVenue, 10, 'live');
    expect(res.kind).toBe('success');
    if (res.kind === 'success') {
      expect(res.isPartial).toBe(true);
      expect(res.venue.coverage.complete).toBe(false);
    }
  });

  it('rejects partial coverage when any person carries a non-null commit count', () => {
    const invalidPartial = {
      ...validPartialVenue,
      people: [{ githubId: 101, handle: 'alice', communityCommitCount: 5, eligible: true }],
    };
    const res = validateVenuePayload(invalidPartial, 10, 'live');
    expect(res.kind).toBe('schema_mismatch');
    if (res.kind === 'schema_mismatch') {
      expect(res.details).toContain('Incomplete coverage cannot carry definitive commit counts');
    }
  });

  it('rejects incompatible schema versions', () => {
    const oldVersion = { ...validCompleteVenue, schemaVersion: 2 };
    const res = validateVenuePayload(oldVersion, 10, 'live');
    expect(res.kind).toBe('schema_mismatch');
  });

  it('rejects conflicting duplicate GitHub IDs with different aggregates', () => {
    const duplicateConflict = {
      ...validCompleteVenue,
      people: [
        { githubId: 101, handle: 'alice', communityCommitCount: 15, eligible: true },
        { githubId: 101, handle: 'alice', communityCommitCount: 99, eligible: true },
      ],
    };
    const res = validateVenuePayload(duplicateConflict, 10, 'live');
    expect(res.kind).toBe('schema_mismatch');
    if (res.kind === 'schema_mismatch') {
      expect(res.details).toContain('Conflicting community aggregate');
    }
  });

  it('rejects community ID mismatch with requested community', () => {
    const res = validateVenuePayload(validCompleteVenue, 999, 'live');
    expect(res.kind).toBe('schema_mismatch');
    if (res.kind === 'schema_mismatch') {
      expect(res.error).toContain('does not match requested 999');
    }
  });
});

describe('venueAdapter - fetchLiveVenue', () => {
  it('fetches and validates live venue over HTTP successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => validCompleteVenue,
    } as Response);

    const res = await fetchLiveVenue({
      communityId: 10,
      baseUrl: 'https://devloot.xyz',
      fetchFn: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith('https://devloot.xyz/api/venues/10', expect.any(Object));
    expect(res.kind).toBe('success');
    if (res.kind === 'success') {
      expect(res.source).toBe('live');
    }
  });

  it('returns empty state on 404 not found without silent fallback', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const res = await fetchLiveVenue({
      communityId: 99,
      baseUrl: 'https://devloot.xyz',
      fetchFn: mockFetch,
    });

    expect(res.kind).toBe('empty');
    if (res.kind === 'empty') {
      expect(res.source).toBe('live');
    }
  });

  it('returns transport_error on 500 and flags it retryable', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const res = await fetchLiveVenue({
      communityId: 10,
      fetchFn: mockFetch,
    });

    expect(res.kind).toBe('transport_error');
    if (res.kind === 'transport_error') {
      expect(res.statusCode).toBe(500);
      expect(res.retryable).toBe(true);
    }
  });

  it('handles abort signal cleanly with cancelled state', async () => {
    const controller = new AbortController();
    controller.abort('User unmounted scene');

    const mockFetch = vi.fn().mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'));

    const res = await fetchLiveVenue({
      communityId: 10,
      fetchFn: mockFetch,
      signal: controller.signal,
    });

    expect(res.kind).toBe('cancelled');
    if (res.kind === 'cancelled') {
      expect(res.reason).toContain('User unmounted scene');
    }
  });
});

describe('venueAdapter - loadOfflineVenueFixture', () => {
  it('loads offline fixture and marks state distinctly as offline_fixture', () => {
    const envelope = {
      fixtureVersion: 1,
      venues: [validCompleteVenue],
    };

    const res = loadOfflineVenueFixture(10, envelope);
    expect(res.kind).toBe('offline_fixture');
    if (res.kind === 'offline_fixture') {
      expect(res.source).toBe('fixture');
      expect(res.notice).toContain('synthetic offline fixture');
      expect(res.venue.community.id).toBe(10);
    }
  });

  it('returns empty when requested community is not in fixture envelope', () => {
    const envelope = {
      fixtureVersion: 1,
      venues: [validCompleteVenue],
    };

    const res = loadOfflineVenueFixture(99, envelope);
    expect(res.kind).toBe('empty');
    if (res.kind === 'empty') {
      expect(res.source).toBe('fixture');
    }
  });
});

describe('venueAdapter - collectPaginatedVenues', () => {
  it('collects multiple pages consistently', async () => {
    const page1 = {
      schemaVersion: 1,
      data: [validCompleteVenue],
      page: 1,
      totalPages: 2,
      total: 2,
    };
    const page2 = {
      schemaVersion: 1,
      data: [
        {
          ...validCompleteVenue,
          community: { id: 20, name: 'Frontend Guild' },
        },
      ],
      page: 2,
      totalPages: 2,
      total: 2,
    };

    const fetchPage = vi.fn().mockImplementation((page: number) => {
      if (page === 1) return Promise.resolve(page1);
      return Promise.resolve(page2);
    });

    const result = await collectPaginatedVenues({ fetchPage });
    expect(result.venues).toHaveLength(2);
    expect(result.isComplete).toBe(true);
    expect(result.totalCollected).toBe(2);
    expect(result.reportedTotal).toBe(2);
  });
});
