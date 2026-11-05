# Integration: DevLoot Bounties and Monster Handoff

Implements Issue [#20](https://github.com/devloot-xyz/LootTown/issues/20) against proposed monster interaction in [#19](https://github.com/devloot-xyz/LootTown/issues/19).

## Overview
LootTown visualizes live DevLoot bounties as in-world creatures attached to specific community venues. This module establishes a typed, secure, read-only adapter that maps authoritative DevLoot bounties into monster interaction states without duplicating logic or managing financial flows inside LootTown.

## Invariants & Design Guarantees

1. **One-to-One Mapping**:
   Each valid open bounty in a community is mapped to exactly one monster entity (`monster-${communityId}-${bountyId}`). Duplicate bounty IDs are deduplicated.
2. **Lifecycle & Freshness**:
   - `OPEN` (unclaimed, active): Monster state is `ACTIVE`.
   - `IN_REVIEW`: Monster state is `IN_REVIEW` (non-active).
   - `CLOSED` / `EXPIRED`: Monster state is `CLOSED` (never active).
   - Stale threshold: Bounties older than the sync freshness window transition to `STALE` and cannot appear active.
3. **No Fabrication**:
   Malformed or unavailable source data fails visibly and safely. LootTown never fabricates placeholder bounties or estimated reward numbers.
4. **Canonical Handoff**:
   External links strictly target canonical DevLoot URLs (`https://devloot.xyz/bounty/${bountyId}`) or validated GitHub issue targets. Dangerous protocols (`javascript:`, `file:`, untrusted hostnames) are rejected.
5. **Separation of Concerns**:
   No wallet connections, bounty creation, claiming, escrow transactions, or reward payouts take place in LootTown. All financial actions remain on DevLoot.

## Public Endpoint Contract Evidence

Inspected against live endpoint `GET https://devloot.xyz/api/bounties` (2026-11-04):

```json
{
  "id": 3,
  "bountyKey": "edd0ac032304cc2b719d783e4241fcad6780b60528d6c31d76de8fccfd778005",
  "repoOwner": "devloot-xyz",
  "repoName": "devloot_discord_bot",
  "issueNumber": 37,
  "issueUrl": "https://github.com/devloot-xyz/devloot_discord_bot/issues/37",
  "amount": 6000000,
  "status": "OPEN",
  "winnerId": null,
  "openPrCount": 4,
  "issueTitle": "[$5 bounty] Make /leaderboard ranks consistent and avoid fetching every user"
}
```

*Note on Amount*: The `amount` field is returned in micro-USDC (6 decimal places: 6,000,000 = $6.00). The adapter accurately displays formatted USD without extrapolating.
