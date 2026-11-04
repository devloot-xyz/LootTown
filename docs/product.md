# Product rules and open decisions

## Approved direction

LootTown is a global map with many venues. Each DevLoot community (`Project`) has one venue. Its linked repositories contribute evidence about **unique eligible people**, not buildings or streets. Venue type/scale is based on that distinct contributor count. Entering a venue reveals people of that community attending and reacting to a presentation. Each venue type eventually has a distinct event and motion language. Characters represent contributors, **not online presence**.

One real person receives one character per community after deduplicating linked repositories by stable GitHub ID. Character identity and palette remain stable. Commit attribution within that community determines permanent visual bands:

| Attributed community commits | Approved visual band |
| --- | --- |
| 1–9 | Complete base outfit |
| 10–49 | Accessory |
| 50–199 | Elaborate outfit |
| 200–999 | Special details or posture |
| 1000+ | Veteran appearance |

Body variation stays around 10%; most progression is clothing and accessories. Inactivity never removes a band. Counts are a visual participation signal, **not a measure of quality or a person's total value**. Unknown attribution is displayed as unknown, never as zero or a lower band.

## Proposed and unresolved

The world can include houses, plazas, halls, warehouses, and larger concert spaces. Contributor-count cutoffs, the zero-contributor presentation, and the visual scale of each venue require an approved art and product specification. No venue cutoff is implemented in this scaffold. Venue count is distinct from avatar commit count.

Eligibility and coverage require a backend policy: identify bots, unlinked authors, deleted/renamed GitHub accounts, forks, mirrored commits, coauthors, repositories with missing or partial sync, and duplicate commit SHAs across linked repositories. A public projection must declare its time window, inclusion rule, source coverage, freshness, and whether counts are known. Do not infer a definitive zero from an empty page or an unavailable provider. Stable GitHub IDs identify accounts; a human uniqueness guarantee across accounts is not available.

Bounties as monsters are a desired expansion. Their place in the venue map, representation of status, interaction, moderation, and accessibility need design. No combat, payout, or wallet operation is implemented here. Payment remains in DevLoot.
