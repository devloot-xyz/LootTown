import { describe, expect, it } from 'vitest';
import {
  GetProjectVenueProjectionUseCase,
  ProjectVenueDataProvider,
  ProjectRecord,
  RepositoryRecord,
  CommitObservation,
} from '../application/get-project-venue-projection.usecase';
import { ProjectVenueProjectionController } from '../http/project-venue-projection.controller';
import { parseVenueProjectionV1 } from '../../../../../src/contracts/venue';

class MockProjectVenueDataProvider implements ProjectVenueDataProvider {
  projects: Map<number, ProjectRecord> = new Map();
  repositories: Map<number, RepositoryRecord[]> = new Map();
  observations: Map<number, CommitObservation[]> = new Map();

  async getProject(projectId: number): Promise<ProjectRecord | null> {
    return this.projects.get(projectId) || null;
  }

  async getLinkedRepositories(projectId: number): Promise<RepositoryRecord[]> {
    return this.repositories.get(projectId) || [];
  }

  async getCommitObservations(
    projectId: number,
    repositoryIds: number[]
  ): Promise<CommitObservation[]> {
    const list = this.observations.get(projectId) || [];
    return list.filter((obs) => repositoryIds.includes(obs.repositoryId));
  }
}

describe('Upstream DevLoot Project Venue Projection Backend Suite', () => {
  const setup = () => {
    const provider = new MockProjectVenueDataProvider();
    const useCase = new GetProjectVenueProjectionUseCase(provider);
    const controller = new ProjectVenueProjectionController(useCase);
    return { provider, useCase, controller };
  };

  it('1. Deduplicates overlapping commit SHAs across repositories within a community', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Cross-Repo Project' });
    provider.repositories.set(1, [
      { id: 10, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
      { id: 20, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);

    // Contributor authoring the EXACT same SHA across two repos (e.g. cherry-pick or fork)
    provider.observations.set(1, [
      { repositoryId: 10, sha: 'sha-alpha-001', githubId: 9001, handle: 'alice', isBot: false },
      { repositoryId: 20, sha: 'sha-alpha-001', githubId: 9001, handle: 'alice', isBot: false },
      { repositoryId: 10, sha: 'sha-alpha-002', githubId: 9001, handle: 'alice', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    expect(res.people).toHaveLength(1);
    expect(res.people[0].githubId).toBe(9001);
    // 2 unique SHAs total, NOT 3
    expect(res.people[0].communityCommitCount).toBe(2);

    // Verify valid against LootTown contract
    expect(parseVenueProjectionV1(res).coverage.complete).toBe(true);
  });

  it('2. Maintains independent attribution for shared repositories across communities', async () => {
    const { provider, controller } = setup();

    // Two distinct projects sharing repository 30
    provider.projects.set(1, { id: 1, name: 'Project Alpha' });
    provider.projects.set(2, { id: 2, name: 'Project Beta' });

    provider.repositories.set(1, [
      { id: 30, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);
    provider.repositories.set(2, [
      { id: 30, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
      { id: 40, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);

    provider.observations.set(1, [
      { repositoryId: 30, sha: 'sha-100', githubId: 9002, handle: 'bob', isBot: false },
    ]);
    provider.observations.set(2, [
      { repositoryId: 30, sha: 'sha-100', githubId: 9002, handle: 'bob', isBot: false },
      { repositoryId: 40, sha: 'sha-200', githubId: 9002, handle: 'bob', isBot: false },
    ]);

    const resAlpha = await controller.getVenueProjection(1, {});
    const resBeta = await controller.getVenueProjection(2, {});

    expect(resAlpha.people[0].communityCommitCount).toBe(1);
    expect(resBeta.people[0].communityCommitCount).toBe(2);
  });

  it('3. Filters out bot accounts and unlinked authors from eligible people roster', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Bot Test Project' });
    provider.repositories.set(1, [
      { id: 50, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);

    provider.observations.set(1, [
      { repositoryId: 50, sha: 'sha-bot-1', githubId: 9999, handle: 'dependabot[bot]', isBot: true },
      { repositoryId: 50, sha: 'sha-bot-2', githubId: 9998, handle: 'github-actions[bot]', isBot: true },
      { repositoryId: 50, sha: 'sha-human', githubId: 9003, handle: 'carol', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    expect(res.people).toHaveLength(1);
    expect(res.people[0].handle).toBe('carol');
    expect(res.people[0].communityCommitCount).toBe(1);
  });

  it('4. Correctly distinguishes empty community state with HTTP 200 and state "empty"', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Empty Project' });
    provider.repositories.set(1, [
      { id: 60, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);
    provider.observations.set(1, []);

    const res = await controller.getVenueProjection(1, {});
    expect(res.coverage.state).toBe('empty');
    expect(res.people).toHaveLength(0);
    expect(res.pagination.totalPeople).toBe(0);

    expect(parseVenueProjectionV1(res).coverage.state).toBe('empty');
  });

  it('5. Enforces null commit counts when repository synchronization is partial', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Partial Project' });
    provider.repositories.set(1, [
      { id: 70, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
      { id: 71, visibility: 'public', syncStatus: 'pending', lastSyncedAt: null },
    ]);

    provider.observations.set(1, [
      { repositoryId: 70, sha: 'sha-p1', githubId: 9004, handle: 'dave', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    expect(res.coverage.complete).toBe(false);
    expect(res.coverage.state).toBe('partial');
    expect(res.people[0].communityCommitCount).toBeNull();

    expect(parseVenueProjectionV1(res).people[0].communityCommitCount).toBeNull();
  });

  it('6. Enforces null commit counts when synchronization is stale (> 48 hours)', async () => {
    const { provider, controller } = setup();

    const staleDate = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 hours old
    provider.projects.set(1, { id: 1, name: 'Stale Project' });
    provider.repositories.set(1, [
      { id: 80, visibility: 'public', syncStatus: 'synced', lastSyncedAt: staleDate },
    ]);

    provider.observations.set(1, [
      { repositoryId: 80, sha: 'sha-s1', githubId: 9005, handle: 'eve', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    expect(res.coverage.complete).toBe(false);
    expect(res.coverage.state).toBe('stale');
    expect(res.people[0].communityCommitCount).toBeNull();

    expect(parseVenueProjectionV1(res).coverage.state).toBe('stale');
  });

  it('7. Enforces maximum allowable 10 linked repositories per community', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: '10 Repo Project' });
    const tenRepos: RepositoryRecord[] = Array.from({ length: 10 }, (_, i) => ({
      id: 100 + i,
      visibility: 'public',
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    }));
    provider.repositories.set(1, tenRepos);
    provider.observations.set(1, [
      { repositoryId: 100, sha: 'sha-10-1', githubId: 9006, handle: 'frank', isBot: false },
      { repositoryId: 109, sha: 'sha-10-2', githubId: 9006, handle: 'frank', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    expect(res.repositories).toHaveLength(10);
    expect(res.people[0].communityCommitCount).toBe(2);

    expect(parseVenueProjectionV1(res).repositories).toHaveLength(10);
  });

  it('8. Excludes private repositories from public payload and triggers partial coverage', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Mixed Visibility Project' });
    provider.repositories.set(1, [
      { id: 90, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
      { id: 91, visibility: 'private', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);

    provider.observations.set(1, [
      { repositoryId: 90, sha: 'sha-pub', githubId: 9007, handle: 'grace', isBot: false },
    ]);

    const res = await controller.getVenueProjection(1, {});
    // Private repo 91 is NOT exposed in the public repositories array
    expect(res.repositories).toHaveLength(1);
    expect(res.repositories[0].id).toBe(90);
    // Coverage is marked partial because public set does not reflect entire community
    expect(res.coverage.complete).toBe(false);
    expect(res.coverage.state).toBe('partial');
    expect(res.people[0].communityCommitCount).toBeNull();
  });

  it('9. Supports snapshot cursor pagination without count drift across pages', async () => {
    const { provider, controller } = setup();

    provider.projects.set(1, { id: 1, name: 'Large Project' });
    provider.repositories.set(1, [
      { id: 95, visibility: 'public', syncStatus: 'synced', lastSyncedAt: new Date() },
    ]);

    // Create 75 distinct contributors
    const obs: CommitObservation[] = [];
    for (let i = 1; i <= 75; i++) {
      obs.push({
        repositoryId: 95,
        sha: `sha-person-${i}`,
        githubId: 10000 + i,
        handle: `user-${i}`,
        isBot: false,
      });
    }
    provider.observations.set(1, obs);

    // Page 1 (limit 50)
    const page1 = await controller.getVenueProjection(1, { page: 1, limit: 50, snapshotId: 'snap-fixed' });
    expect(page1.pagination.page).toBe(1);
    expect(page1.pagination.totalPeople).toBe(75);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.people).toHaveLength(50);
    expect(page1.pagination.snapshotId).toBe('snap-fixed');
    expect(page1.pagination.nextCursor).toBe('snap-fixed:2');

    // Page 2
    const page2 = await controller.getVenueProjection(1, { page: 2, limit: 50, snapshotId: 'snap-fixed' });
    expect(page2.pagination.page).toBe(2);
    expect(page2.people).toHaveLength(25);
    expect(page2.pagination.nextCursor).toBeNull();

    // Verify disjoint sets across pages
    const idsPage1 = new Set(page1.people.map((p) => p.githubId));
    const idsPage2 = new Set(page2.people.map((p) => p.githubId));
    for (const id of idsPage2) {
      expect(idsPage1.has(id)).toBe(false);
    }
  });

  it('10. Throws 404 for nonexistent community', async () => {
    const { controller } = setup();
    await expect(controller.getVenueProjection(99999, {})).rejects.toThrow(/not found/);
  });
});
