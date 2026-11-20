/**
 * Upstream DevLoot Infrastructure: Prisma / SQL Community Venue Query
 * Target repository: devloot-xyz/devloot (server/src/modules/projects/infrastructure)
 */

import {
  ProjectRecord,
  RepositoryRecord,
  CommitObservation,
  ProjectVenueDataProvider,
} from '../application/get-project-venue-projection.usecase';

/**
 * Concrete Prisma implementation for DevLoot upstream
 */
export class PrismaProjectVenueQuery implements ProjectVenueDataProvider {
  constructor(private readonly prisma: any) {}

  async getProject(projectId: number): Promise<ProjectRecord | null> {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
  }

  async getLinkedRepositories(projectId: number): Promise<RepositoryRecord[]> {
    const records = await this.prisma.projectRepository.findMany({
      where: { projectId },
      take: 10,
      include: {
        repository: {
          select: {
            id: true,
            isPrivate: true,
            syncStatus: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    return records.map((r: any) => ({
      id: r.repository.id,
      visibility: r.repository.isPrivate ? ('private' as const) : ('public' as const),
      syncStatus: r.repository.syncStatus || 'synced',
      lastSyncedAt: r.repository.lastSyncedAt ? new Date(r.repository.lastSyncedAt) : null,
    }));
  }

  async getCommitObservations(
    projectId: number,
    repositoryIds: number[]
  ): Promise<CommitObservation[]> {
    if (repositoryIds.length === 0) return [];

    /**
     * Source-level deduplication SQL query:
     * Selects commit SHAs across all linked public repositories for the project.
     */
    const sql = `
      SELECT DISTINCT
        rcs.repository_id AS "repositoryId",
        rcs.commit_sha AS "sha",
        rcs.github_id AS "githubId",
        rcs.github_handle AS "handle",
        CASE
          WHEN rcs.github_handle ILIKE '%[bot]' OR rcs.author_type = 'bot' THEN true
          ELSE false
        END AS "isBot"
      FROM repository_contributor_sync rcs
      WHERE rcs.repository_id = ANY($1::int[])
        AND rcs.github_id IS NOT NULL
        AND rcs.commit_sha IS NOT NULL
    `;

    return this.prisma.$queryRawUnsafe(sql, repositoryIds);
  }
}
