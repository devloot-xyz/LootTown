/**
 * Upstream DevLoot DTOs: Community Venue Projection
 * Target repository: devloot-xyz/devloot (server/src/modules/projects/http/dto)
 */

export interface TraceableRepositoryDto {
  id: number;
  visibility: 'public';
  syncStatus: 'synced' | 'pending' | 'stale' | 'failed';
  lastSyncedAt: string | null;
}

export interface VenueCoverageDto {
  complete: boolean;
  state: 'complete' | 'partial' | 'stale' | 'empty' | 'unavailable';
  lastSyncedAt: string | null;
  policyVersion: string;
}

export interface VenuePersonDto {
  githubId: number;
  handle: string;
  communityCommitCount: number | null;
  eligible: boolean;
}

export interface VenuePaginationDto {
  page: number;
  limit: number;
  totalPeople: number;
  totalPages: number;
  snapshotId: string;
  nextCursor?: string | null;
}

export interface VenueProjectionResponseDto {
  schemaVersion: 1;
  community: {
    id: number;
    name: string;
  };
  coverage: VenueCoverageDto;
  repositories: TraceableRepositoryDto[];
  pagination: VenuePaginationDto;
  people: VenuePersonDto[];
}

export interface VenueProjectionQueryDto {
  page?: number;
  limit?: number;
  snapshotId?: string;
}
