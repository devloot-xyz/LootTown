# Upstream Public Community Venue Projection Specification (v1)

**Status: Proposed Upstream Read Contract & Implementation Design.**
**Target Repository:** `devloot-xyz/devloot` (tracked in LootTown issue [#4](https://github.com/devloot-xyz/LootTown/issues/4), depending on policy [#3](https://github.com/devloot-xyz/LootTown/issues/3)).
**Owning Module:** `server/src/modules/projects` (DevLoot NestJS backend).

---

## 1. Product Context & Outcome

LootTown requires a truthful, versioned, public read projection for each DevLoot community (`Project`):
- Exactly one venue projection per community.
- Unique eligible contributors identified by stable numeric GitHub IDs across up to 10 linked repositories.
- Deduplicated community commit totals (counting unique commit SHAs across all linked repositories, never summing per-repository numbers).
- Incomplete, partial, stale, unavailable, and empty states explicitly modeled and distinguished.
- Snapshot cursor pagination ensuring counts and avatar bands do not drift between pages during continuous background sync.
- Strict public-data privacy: no wallet-as-identity fields, private repo details, or authentication credentials.

This specification documents the wire contract, invariants, upstream NestJS implementation, synthetic response fixtures, and source-level query tests.

---

## 2. Wire Contract Specification

### Endpoint Definition

```http
GET /api/projects/:projectId/venue
Accept: application/json
```

### Request Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | integer (`>= 1`) | No | `1` | Page index for paginated contributor list. |
| `limit` | integer (`1..100`) | No | `50` | Maximum number of contributors returned per page. |
| `snapshotId` | string | No | `auto` | Consistent snapshot identifier (e.g. `snap-1732104000000`). Freezes query view across pages. |

### HTTP Status Codes

- `200 OK`: Valid venue projection returned (including empty community state `coverage.state: "empty"`).
- `400 Bad Request`: Invalid `projectId` parameter or query values.
- `404 Not Found`: Community (`Project`) does not exist in DevLoot.
- `429 Too Many Requests`: Standard public API rate limit exceeded (60 requests/minute).
- `503 Service Unavailable`: Synchronization engine or underlying database temporarily unavailable.

### Response Schema (`VenueProjectionV1`)

```typescript
export interface VenueProjectionResponseDto {
  schemaVersion: 1;
  community: {
    id: number;
    name: string;
  };
  coverage: {
    complete: boolean;
    state: 'complete' | 'partial' | 'stale' | 'empty' | 'unavailable';
    lastSyncedAt: string | null; // ISO 8601
    policyVersion: string;       // e.g. "1.0.0"
  };
  repositories: Array<{
    id: number;
    visibility: 'public';
    syncStatus: 'synced' | 'pending' | 'stale' | 'failed';
    lastSyncedAt: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalPeople: number;
    totalPages: number;
    snapshotId: string;
    nextCursor: string | null;
  };
  people: Array<{
    githubId: number;
    handle: string;
    communityCommitCount: number | null;
    eligible: boolean;
  }>;
}
```

---

## 3. Core Invariants and Policy Rules

1. **Unique Stable Identity**:
   Contributors are identified strictly by their positive numeric `githubId` scoped to the community. Usernames and handles are mutable display fields; renames do not split or duplicate character identities.

2. **Deduplicated Commit Attribution**:
   `communityCommitCount` counts unique commit SHAs across all linked public repositories for the given community. If a contributor commits or cherry-picks the identical SHA to multiple repositories within the community, it is counted exactly once. Commits across different communities remain independent.

3. **Strict Null on Incomplete or Stale Coverage**:
   If `coverage.complete === false` or `coverage.state === 'stale'` (> 48 hours since last successful sync), `communityCommitCount` MUST be `null` for every person. LootTown never infers zero or assigns a lower avatar band from partial data.

4. **Maximum 10 Linked Repositories**:
   In alignment with DevLoot's community cap, a projection supports up to 10 linked repositories (`repositories.length <= 10`).

5. **Public-Only Repository Visibility**:
   Private or unverified repositories are excluded from the public `repositories` list. If a community contains private or inaccessible repositories, their contributor data is withheld and `coverage.complete` is set to `false` (`coverage.state: 'partial'`).

6. **Bot and Ghost Author Exclusion**:
   Automated accounts (e.g. `dependabot[bot]`, `actions-user`) and unresolved authors are excluded from the eligible people list (`eligible: true`).

7. **Snapshot Pagination Consistency**:
   When paginating large communities across multiple requests, passing `snapshotId` ensures contributor ordering and total counts remain frozen during the traversal, preventing page drift.

8. **Zero Leaked Credentials or Identifiers**:
   The projection excludes GitHub OAuth tokens, private email addresses, and blockchain wallet addresses.

---

## 4. Upstream DevLoot Reference Implementation

The complete upstream reference implementation is provided in [`upstream/`](../upstream/):

- **DTOs (`upstream/src/modules/projects/dto/venue-projection.dto.ts`)**: Defines wire contract types with strict schema validation.
- **Controller (`upstream/src/modules/projects/http/project-venue-projection.controller.ts`)**: NestJS controller exposing `GET /api/projects/:projectId/venue`.
- **Application Use Case (`upstream/src/modules/projects/application/get-project-venue-projection.usecase.ts`)**: Implements project resolution, repository cap, coverage evaluation, SHA deduplication, bot filtering, and snapshot pagination.
- **Prisma SQL Query (`upstream/src/modules/projects/infrastructure/prisma-project-venue.query.ts`)**: Source-level SQL query deduplicating commit SHAs:
  ```sql
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
  ```

---

## 5. Synthetic Response Fixtures & Test Coverage

Synthetic fixtures demonstrating all expected wire scenarios are checked into [`public/fixtures/venue-projection-v1.json`](../public/fixtures/venue-projection-v1.json) and [`docs/fixtures/venue-projection-v1.json`](fixtures/venue-projection-v1.json):

1. `complete-standard`: Standard 2-repository community with complete coverage and active pagination.
2. `shared-repositories`: Independent attribution for repositories linked across multiple communities.
3. `bot-and-unlinked-filtered`: Exclusion of bots and ghost accounts from eligible contributors.
4. `overlapping-shas-deduplicated`: Identical commit SHA in multiple repos deduplicated to 1 count.
5. `empty-community`: Valid 200 response with `coverage.state: "empty"` and 0 contributors.
6. `partial-sync`: Repository sync pending, mandating `null` commit counts.
7. `stale-sync`: Sync older than 48 hours, mandating `null` commit counts.
8. `ten-linked-repositories`: Maximum community capacity test with 10 repositories.

### Verified Test Suites

- Contract validation: [`src/contracts/venue.test.ts`](../src/contracts/venue.test.ts)
- Fixture integrity tests: [`src/contracts/venue-projection-fixtures.test.ts`](../src/contracts/venue-projection-fixtures.test.ts)
- Source-level backend tests: [`upstream/src/modules/projects/tests/project-venue-projection.spec.ts`](../upstream/src/modules/projects/tests/project-venue-projection.spec.ts)

All tests pass deterministically (`npm test`).

---

## 6. Migration from Proposed VenueV1

`src/contracts/venue.ts` provides `projectionToVenueV1(projection)` to seamlessly convert the full upstream projection to the core `VenueV1` aggregate consumed by LootTown's internal scenes and avatars. Existing offline fixtures remain functional.
