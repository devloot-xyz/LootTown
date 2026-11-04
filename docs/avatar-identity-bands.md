# Community Identity & Avatar Commit Bands

## Overview
LootTown models community avatars through deterministic mapping functions in `src/domain/avatar.ts`.

It strictly enforces the approved contributor commit progression bands (Issue #15) while ensuring contributor visual identity remains persistent.

## Approved Commit Bands
- **1–9 commits (`base`)**: Base tunic outfit, standard posture.
- **10–49 commits (`accessory`)**: Accessory belt pack, standard posture.
- **50–199 commits (`elaborate`)**: Elaborate cloak, focused posture.
- **200–999 commits (`special`)**: Distinguished regalia, veteran stance.
- **1,000+ commits (`veteran`)**: Veteran mantle, veteran stance.
- **null / 0 (`unknown`)**: Neutral garb, standard posture. Treated neutrally without penalty.

## Invariants & Design Principles
1. **Identity Continuity:** Primary and accent colors are deterministically derived from `githubId` and `communityId`. Changing commit counts alters the outfit band, but never alters the contributor's core identity colors.
2. **Deduplication:** Multiple contributions across linked repositories for the same contributor are deduplicated by unique GitHub ID, ensuring exactly one character per person.
3. **Neutral Unknowns:** Incomplete coverage or missing counts never cause inactivity downgrades or negative visual indicators.
4. **Honest Crowd Reporting:** The total community contributor count is reported independently from the rendered/visible sample via `formatCrowdSummary`.
