# Community contributor and commit attribution policy v1

**Status: proposed for DevLoot maintainer review; not adopted or implemented.** This decision record is intended to resolve LootTown tracking issue #3 and guide a future DevLoot public projection. It does not describe a deployed endpoint or prove that the current provider can supply complete history.

## Objective and boundary

Define one stable contributor identity per DevLoot community and a defensible count of that person's distinct attributed commits. The result is a participation signal for LootTown's approved avatar bands, not a measure of quality, value, employment, or online presence. One GitHub ID represents one GitHub account; GitHub cannot prove that one account equals one real person or that multiple accounts belong to one person.

This policy concerns publicly linked repositories only. It does not grant additional GitHub permissions, authorize direct browser access, include bounty/support/ownership events as commits, or define venue-size thresholds.

## Proposed policy decisions

### Community and repository scope

- A community is one DevLoot `Project`, identified by its stable database ID. The repository set is the set linked to that Project when a snapshot is created; DevLoot currently caps this set at 10.
- Include a repository only when it is public at snapshot time. If a linked repository is private, inaccessible, deleted, or cannot be checked for visibility, do not expose its identity or contributors. Mark community coverage partial because the public set no longer proves full community coverage.
- Record the stable DevLoot repository ID for each source. Do not identify a repository by a mutable URL or owner/name slug alone.
- A public fork or mirror explicitly linked to the community is in scope. Identical commit SHAs across linked repositories are deduplicated within the community. A repository linked to two communities contributes independently to each; deduplication never crosses community IDs.
- Each snapshot is scoped to a precise repository-set version. Adding a repository makes history coverage unavailable until it is fully scanned. When a repository is unlinked, recalculate the current totals from the remaining linked repositories and remove that repository's SHA provenance from the active calculation. Do not lower an already-earned avatar tier for a contributor who is still represented by at least one remaining eligible attribution in the community; if they are no longer represented, remove them from the public display. A later re-link is scanned again, with SHA de-duplication across the then-current repository set.

### Contributor identity and eligibility

- The identity key is GitHub's stable account ID, scoped by community. A username or email is never an identity key. Renames update the display handle for future snapshots without changing the ID; retain the last known handle only while the account remains public and active.
- A person is eligible when at least one in-scope commit has been attributed to a resolvable GitHub user ID that is not classified as a bot. Repository owner, supporter, and bounty-winner roles alone do not make a person eligible.
- Exclude an author when GitHub identifies the account as a bot (`type=Bot` or an explicit bot marker). Do not classify an account as a bot based only on commit volume, organization membership, or an unverified name pattern. If bot status cannot be resolved, coverage is partial; do not silently include or exclude that author's contribution as known.
- An unlinked author (no stable GitHub ID) is not returned as a person and is not assigned to a guessed account by email, handle, or commit message. Record the SHA and an unresolved-attribution reason separately, so it cannot suppress attribution already resolved for other authors of that SHA.
- A deleted account is removed from public display. Its retained internal stable ID may be used only for deduplication and correction during the applicable retention period; never display a last-known handle for a deleted account.
- A commit's co-authors count only when provider data explicitly resolves them to stable GitHub IDs. Do not infer identity from email addresses or treat a parsed trailer as identity proof. Each resolved eligible co-author receives one attribution for that SHA. Record each unresolved claimed co-author separately; it does not hide the resolved author's or other resolved co-authors' count.

### Commit attribution and deduplication

- The attribution window is lifetime history available from the provider for in-scope public repositories, with no rolling cutoff. Attribution is based on commits exposed by the provider's documented history source; it must not be inferred from the current `RepositoryContributorSync.contributions` aggregate.
- A commit is eligible when it is part of the provider's documented repository history and has a stable SHA and at least one resolved eligible author. Exclude bounty records, pull-request counts, issue activity, and repository-level contribution totals.
- Count a SHA at most once per `(communityId, githubId)`. The same SHA seen in two linked repositories adds one commit for that person, not two. One SHA with two resolved eligible co-authors contributes one to each co-author's personal count; therefore the sum of per-person counts is not a count of globally unique community SHAs.
- Persist a community-scoped seen-SHA attribution ledger for the current linked repository set so overlaps, forks, mirrors, and later syncs cannot inflate totals. For each SHA, preserve every resolved author ID and unresolved-attribution marker returned by the canonical provider observation; duplicate observations add repository provenance but do not add another count. Conflicting metadata for the same SHA must be surfaced for review. Unlinking removes that repository's provenance; retain a SHA only while it remains reachable through another linked repository.
- Preserve source provenance for each attribution: community ID, repository ID(s) where the SHA was observed, SHA, resolved GitHub ID(s), provider observation time, and policy version. Do not expose the SHA ledger in the public response by default; use it for deduplication and audit only.

### Coverage, freshness, and unknown values

Coverage describes whether the projection can make a complete claim for the current community, not whether a provider request merely returned successfully.

| State | Meaning | Person counts |
| --- | --- | --- |
| Complete and fresh | Every currently linked public repository is in the snapshot; its full default-branch-reachable history is scanned; snapshot is within the freshness target. | Exact nonnegative counts. A truly empty, fully scanned community has no people and a known zero-person result. |
| History incomplete | A repository is missing, newly linked, inaccessible, its default branch or reachable history cannot be enumerated, a scan failed, or a force-push cannot be reconciled. | `null` for every returned person's community count; do not emit a partial lower bound as exact. |
| Attribution unresolved | History is complete and fresh, but one or more author/co-author identities or bot classifications cannot be resolved. | Exact counts for the resolved eligible people, plus an unresolved-attribution count/status. Do not guess missing identities or call the person set complete. |
| Stale | Last complete snapshot is older than the freshness limit. Its timestamp and prior provenance may be retained, but it is not current coverage. | `null` for current counts. A stale result must be visibly distinguishable from a fresh empty community. |
| Unavailable | No usable snapshot can be produced, such as provider outage or no successful baseline. | No people/counts; report unavailable explicitly. Never encode this as an empty complete community. |

Proposed operating target for maintainer review: attempt a full or incremental refresh at least every 24 hours and mark a snapshot stale after 48 hours without a successful history-complete refresh. These are starting targets, not verified provider limits. A failed refresh must not advance `lastSyncedAt` or erase the last successful provenance. The API design must expose freshness/staleness separately from history and attribution completeness; proposed `VenueV1` has only `coverage.complete` and `lastSyncedAt`, so an upstream implementation must extend or migrate that contract before representing these states without ambiguity.

An empty result is a known zero only after a complete scan of the full linked public repository set finds no eligible attributed people. No linked repositories, an uninitialized sync, a failed provider call, a partially scanned repository, or an empty current contributor cache is not evidence of zero. `communityCommitCount` is `null` whenever history is missing, incomplete, or stale; zero is valid only after that complete scan confirms zero eligible commits for that person.

### Retention and public fields

- The public contributor view is limited to the current GitHub handle, the nullable count when available, and sync status. It must not expose GitHub numeric IDs, repository membership, historical handles, eligibility flags, unresolved-attribution details, or ledger data.
- Do not return private repository IDs, private affiliations, access tokens, wallet addresses/IDs, commit author emails, raw commit messages, internal provider credentials, or internal GitHub IDs. Do not use wallet identity, DevLoot account ID, or email to merge GitHub identities.
- Retain only fields needed for the deduplication/provenance ledger and public projection. Proposed minimum ledger: community ID, SHA, resolved GitHub ID set, source repository IDs, first-observed timestamp, and policy version. Do not persist raw commit payloads or messages for this feature.
- Keep the active ledger only while the venue is enabled; delete it and its provenance within 30 days of venue removal, unless an applicable legal retention obligation requires otherwise. A removal/correction request must have a documented DevLoot contact path, identity verification proportionate to the request, acknowledgement, and a correction/removal outcome or reason for refusal. Deleting or losing the GitHub account, or losing all qualifying public activity, removes the contributor from public display.
- Public contribution data can reveal a person's association with a community even when the underlying repository is public. The product must disclose that public GitHub contribution metadata is used for the venue projection and link to the correction/removal process. Do not claim public source data has no privacy impact.

## GitHub public-repository validation (2026-11-21)

This is a feasibility check for the future DevLoot worker, not an endpoint implementation. Anonymous, read-only REST requests confirmed that `octocat/Hello-World` is public, declares `master` as `default_branch`, and returns the default-branch head commit `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d` with `author.login: "octocat"` and `author.id: 583231`. A second request to the public `github/docs` default branch found commit `a31bc7f982e83a59138c9d9fb68744dbbda2aa52`, whose message has two `Co-authored-by` trailers. Its REST response has no `coauthors` property. This confirms that REST is sufficient to establish public/default-branch scope and a primary resolved author, but is not sufficient to resolve co-authors.

Use GitHub GraphQL for commit enumeration: `Repository.defaultBranchRef.target` establishes the branch tip; `CommitHistoryConnection` supplies the default-branch-reachable commit `oid`s; and each `Commit.authors` connection returns the Git author plus recognized `Co-authored-by` trailers. For every author node, accept attribution only when `user.id` is non-null; retain `user.login` only as the current public handle. `oid` is the de-duplication key. Classify a bot only from GitHub's account classification returned by the provider, and separately validate that field during implementation. The Git author name/email, commit message, REST `author.login`, and a trailer string are evidence to request provider resolution, never substitute identity keys. GitHub's GraphQL reference explicitly defines `Commit.authors` as the author list derived from the Git author and `Co-authored-by` trailer; GitHub's REST list-commits documentation exposes only the primary `author`/`committer` account objects.

### Request budget and freshness assessment

Let `R` be the linked public repositories (at most 10 under the currently inspected DevLoot source) and `Hᵢ` the number of commits reachable from repository `i`'s default branch. Fetch history in pages of 100, the documented REST maximum and the GraphQL worker's proposed page size. A conservative, easy-to-audit initial GraphQL scan is `Σ ceil(Hᵢ / 100) + A` HTTP requests when it scans one repository page at a time, where `A` is any extra request needed to exhaust an `authors` connection with more than the selected first-page size. An implementation can batch the first pages for multiple repositories, but must record the measured GraphQL point cost and stop before GitHub's returned rate-limit budget. The initial scan must not claim completion until every page and every `authors` connection is exhausted. This intentionally does not use GitHub's repository-contributors aggregate because it cannot represent the SHA/person de-duplication rule.

For an incremental refresh, first batch the current default-branch tip lookup for all `R` repositories in one GraphQL request. If all stored tips match, the refresh costs one request. For each changed branch, page backwards from the new tip until the stored tip is found, processing and de-duplicating every intervening SHA; its additional cost is `ceil(new-or-rewritten-commits / 100)` requests in the same conservative model. A missing stored tip, rewritten history, or any failed page makes history coverage incomplete and therefore makes counts `null`; it schedules a full rescan rather than silently treating the result as zero.

The 24-hour refresh target and 48-hour stale threshold look practical for unchanged or normally active communities: unchanged communities need one batched tip request per refresh, while the observed public REST allowance was 60 unauthenticated core requests per hour. The production worker should use an authenticated GitHub App because GraphQL requires authentication and because its returned `rateLimit { cost remaining resetAt }` is the only valid operational budget. A 48-hour threshold leaves a failed daily attempt one retry window before the public result becomes stale. The targets are not a guarantee for unusually large or heavily rewritten histories: implementation must queue, pace to GitHub's response headers/rate-limit object, and publish `stale` rather than overrun the budget.

## Source mapping and implementation boundary

The current mapping below is transcribed from [the inspected wire-contract record](contracts.md), whose inspection basis is DevLoot commit `8dd22dd89f265024dfff5d76f938a2774cc0f4ec` (read 2026-11-03). The DevLoot source checkout was not available in this workspace during this policy draft; paths and behavior must be rechecked against upstream source before implementation.

| DevLoot model/source | Existing meaning | Policy use and gap |
| --- | --- | --- |
| `Project` ↔ `Repository`, `server/prisma/schema.prisma:42-101` | Many-to-many community/repository linkage. | Use stable Project and Repository IDs and snapshot the linked repository set. |
| `AddCommunityRepositoryUseCase`, `server/src/modules/community/application/add-community-repository.usecase.ts:26-36` | Caps a community at 10 linked repositories. | Expected maximum input size; still require a consistent snapshot of all links. |
| Contributor index and sync metadata, `server/prisma/schema.prisma:992-1017` | Stores GitHub ID, per-repository `contributions`, generation, and sync metadata. | Candidate source for identity and freshness, but `contributions` is not a unique-SHA ledger and cannot be summed into community counts. |
| Participation query, `server/src/modules/projects/infrastructure/prisma-project-participation.ts:11-76` | Uses positive per-repository contributions and groups rows by project and GitHub ID. | Useful for current navigation/identity precedent; does not establish bots, complete commit history, or SHA overlap. |
| Participation DTO/controller, `participation-response.dto.ts:1-43`; `project-participation.controller.ts:1-34` | Exposes `person.githubId`, roles, repository affiliations, and freshness `{complete,lastSyncedAt}`. `isVerified` means DevLoot sign-in, not human verification. | Do not treat current `complete` as full Git history; public projection should omit private affiliations and auth-related identity fields. |

No existing field listed above proves commit-SHA uniqueness, historical coverage, author/co-author resolution, or bot classification. A future implementation needs provider feasibility review and an explicit SHA-level data source/ledger; this draft does not claim the current contributor sync can provide it.

## Synthetic reference cases

The deterministic test vectors live in [`fixtures/contributor-attribution-v1.json`](fixtures/contributor-attribution-v1.json). They cover a shared contributor, duplicate SHA across two public repositories, co-authorship, an unresolved co-author, an unlinked repository, bot exclusion, stale/incomplete history, an empty-but-complete community, and a 10-repository community. All IDs and SHAs are fabricated placeholders. They are policy examples, not DevLoot data, GitHub fixtures, or an API response.

Expected rules for the fixture:

1. In `complete-overlap`, the shared person is one community identity and the repeated SHA is counted once.
2. In `complete-coauthor`, each resolved eligible co-author receives one count for the shared SHA; the community-wide sum is two person-attributions for one SHA.
3. In `unresolved-coauthor`, the resolved author keeps the exact count while the unresolved co-author is reported only as separate unresolved attribution.
4. In `empty-complete`, all repositories in the snapshot were successfully scanned; this is a known empty community. In `empty-without-baseline-is-not-zero`, no scan is not evidence of zero.
5. In `ten-repositories`, coverage is complete only if all ten linked public repositories were scanned under one snapshot and each source completed.
6. In `unlinked-repository`, active totals are recalculated from the remaining repository; the contributor remains publicly represented and retains the previously earned avatar tier.

## Decisions still requiring maintainer approval

- Provider/history feasibility and rate-limit budget for lifetime SHA enumeration and refreshes.
- Whether the proposed 24-hour refresh / 48-hour stale thresholds are operationally feasible.
- Retention period and deletion timing for the SHA-to-GitHub-ID ledger.
- Exact provider signals for bot and co-author resolution, plus the conflict-review process.
- Whether current and last-known GitHub handles may be publicly returned, and the correction/removal mechanism.
- Whether public linked forks/mirrors are included as stated, and how a Project repository-set change is versioned.
- The public contract fields needed to distinguish complete, partial, stale, unavailable, and truly empty states.

Until these decisions are approved and checked against DevLoot source, this document is a proposal, not an adopted product policy. No GitHub permission expansion, DevLoot API, or public endpoint is implied.
