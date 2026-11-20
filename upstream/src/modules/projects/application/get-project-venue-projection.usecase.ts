import {
  VenueProjectionResponseDto,
  VenueProjectionQueryDto,
  TraceableRepositoryDto,
  VenueCoverageDto,
  VenuePersonDto,
} from '../dto/venue-projection.dto';

export interface ProjectRecord {
  id: number;
  name: string;
}

export interface RepositoryRecord {
  id: number;
  visibility: 'public' | 'private';
  syncStatus: 'synced' | 'pending' | 'stale' | 'failed';
  lastSyncedAt: Date | null;
}

export interface CommitObservation {
  repositoryId: number;
  sha: string;
  githubId: number;
  handle: string;
  isBot: boolean;
}

export interface ProjectVenueDataProvider {
  getProject(projectId: number): Promise<ProjectRecord | null>;
  getLinkedRepositories(projectId: number): Promise<RepositoryRecord[]>;
  getCommitObservations(projectId: number, repositoryIds: number[]): Promise<CommitObservation[]>;
}

export class GetProjectVenueProjectionUseCase {
  private readonly POLICY_VERSION = '1.0.0';
  private readonly STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

  constructor(private readonly dataProvider: ProjectVenueDataProvider) {}

  async execute(
    projectId: number,
    query: VenueProjectionQueryDto
  ): Promise<VenueProjectionResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const snapshotId = query.snapshotId || `snap-${Date.now()}`;

    // 1. Resolve project
    const project = await this.dataProvider.getProject(projectId);
    if (!project) {
      const error: any = new Error(`Project ${projectId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // 2. Resolve linked repositories (capped at 10 per community rule)
    const linkedRepos = await this.dataProvider.getLinkedRepositories(projectId);
    if (linkedRepos.length > 10) {
      throw new Error(`Project ${projectId} exceeds maximum limit of 10 linked repositories`);
    }

    // Only public repositories are exposed publicly
    const publicRepos = linkedRepos.filter((r) => r.visibility === 'public');
    const hasPrivateOrMissing = publicRepos.length < linkedRepos.length;

    // Check freshness and sync status
    const now = Date.now();
    let isStale = false;
    let isPendingOrFailed = false;
    let latestSyncAt: Date | null = null;

    const traceableRepos: TraceableRepositoryDto[] = publicRepos.map((r) => {
      let status: 'synced' | 'pending' | 'stale' | 'failed' = r.syncStatus;
      if (r.lastSyncedAt) {
        if (now - r.lastSyncedAt.getTime() > this.STALE_THRESHOLD_MS) {
          status = 'stale';
          isStale = true;
        }
        if (!latestSyncAt || r.lastSyncedAt.getTime() > latestSyncAt.getTime()) {
          latestSyncAt = r.lastSyncedAt;
        }
      } else {
        isPendingOrFailed = true;
      }
      if (status === 'pending' || status === 'failed') {
        isPendingOrFailed = true;
      }

      return {
        id: r.id,
        visibility: 'public' as const,
        syncStatus: status,
        lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null,
      };
    });

    // 3. Determine coverage state
    let isComplete = true;
    let coverageState: 'complete' | 'partial' | 'stale' | 'empty' | 'unavailable' = 'complete';

    if (hasPrivateOrMissing || isPendingOrFailed || publicRepos.length === 0) {
      isComplete = false;
      coverageState = 'partial';
    } else if (isStale) {
      isComplete = false;
      coverageState = 'stale';
    }

    // 4. Fetch observations across linked public repos
    const repoIds = publicRepos.map((r) => r.id);
    const observations = repoIds.length > 0
      ? await this.dataProvider.getCommitObservations(projectId, repoIds)
      : [];

    // Filter bots and unlinked authors
    const validObservations = observations.filter(
      (obs) => !obs.isBot && !obs.handle.endsWith('[bot]') && obs.githubId > 0
    );

    // 5. Deduplicate commit SHAs across repositories for this community
    // Key: githubId -> Set of distinct commit SHAs
    const contributorShas = new Map<number, { handle: string; shas: Set<string> }>();

    for (const obs of validObservations) {
      let entry = contributorShas.get(obs.githubId);
      if (!entry) {
        entry = { handle: obs.handle, shas: new Set<string>() };
        contributorShas.set(obs.githubId, entry);
      } else {
        // Retain latest valid handle
        entry.handle = obs.handle;
      }
      entry.shas.add(obs.sha);
    }

    if (contributorShas.size === 0 && isComplete) {
      coverageState = 'empty';
    }

    // 6. Build contributor list with policy-enforced count semantics
    const allPeople: VenuePersonDto[] = Array.from(contributorShas.entries()).map(
      ([githubId, data]) => {
        // Invariant: If coverage is incomplete, partial, or stale, counts MUST be null
        const count = isComplete && coverageState === 'complete' ? data.shas.size : null;
        return {
          githubId,
          handle: data.handle,
          communityCommitCount: count,
          eligible: data.shas.size > 0,
        };
      }
    );

    // Deterministic sorting: count DESC NULLS LAST, githubId ASC
    allPeople.sort((a, b) => {
      if (a.communityCommitCount !== null && b.communityCommitCount !== null) {
        if (b.communityCommitCount !== a.communityCommitCount) {
          return b.communityCommitCount - a.communityCommitCount;
        }
      } else if (a.communityCommitCount !== null) {
        return -1;
      } else if (b.communityCommitCount !== null) {
        return 1;
      }
      return a.githubId - b.githubId;
    });

    // 7. Paginate results deterministically
    const totalPeople = allPeople.length;
    const totalPages = Math.ceil(totalPeople / limit);
    const startIndex = (page - 1) * limit;
    const paginatedPeople = allPeople.slice(startIndex, startIndex + limit);

    const coverage: VenueCoverageDto = {
      complete: isComplete,
      state: coverageState,
      lastSyncedAt: latestSyncAt ? latestSyncAt.toISOString() : null,
      policyVersion: this.POLICY_VERSION,
    };

    return {
      schemaVersion: 1,
      community: {
        id: project.id,
        name: project.name,
      },
      coverage,
      repositories: traceableRepos,
      pagination: {
        page,
        limit,
        totalPeople,
        totalPages,
        snapshotId,
        nextCursor: page < totalPages ? `${snapshotId}:${page + 1}` : null,
      },
      people: paginatedPeople,
    };
  }
}
