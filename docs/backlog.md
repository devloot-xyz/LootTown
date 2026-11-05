# Implementation backlog

The [completed planning tracker](https://github.com/devloot-xyz/LootTown/issues/1) is a closed, consultable index of the 23 task issues below. The tracker itself is delivered planning work, not an implementation task or bounty. Each issue names its owner, prerequisites, inputs and outputs, exclusions, acceptance checks, evidence, and funding readiness. Creating an issue does not fund a bounty or assign a contributor. Product rules and contract limitations remain in [product.md](product.md) and [contracts.md](contracts.md).

The React 18 / React Three Fiber / Vite foundation, Docker path, CI, proposed data contract, and 40-community synthetic fixture are in place. The root app is intentionally neutral until real world, venue, and show work lands; it is not an art reference.

## Design and data foundation

1. [#2 Define the world, venue, avatar, and show art direction](https://github.com/devloot-xyz/LootTown/issues/2)
2. [#3 Specify contributor identity, commit attribution, and coverage policy](https://github.com/devloot-xyz/LootTown/issues/3)
3. [#4 Deliver a versioned public community venue projection upstream](https://github.com/devloot-xyz/LootTown/issues/4) — after #3.
4. [#5 Read and validate real DevLoot venue data in LootTown](https://github.com/devloot-xyz/LootTown/issues/5) — after #4.

## Shared world and venues

5. [#6 Build the shared 3D world and stable community placement](https://github.com/devloot-xyz/LootTown/issues/6)
6. [#7 Approve community venue categories, size thresholds, and unknown state](https://github.com/devloot-xyz/LootTown/issues/7)
7. [#8 Build reusable exterior assets for approved venue categories](https://github.com/devloot-xyz/LootTown/issues/8) — after #2 and #7.
8. [#9 Implement camera, selection, and desktop/mobile world navigation](https://github.com/devloot-xyz/LootTown/issues/9) — after #6 and #8.
9. [#10 Build interiors and stage kits for each venue category](https://github.com/devloot-xyz/LootTown/issues/10) — after #2 and #7.
10. [#11 Enter and leave a community venue with stable state](https://github.com/devloot-xyz/LootTown/issues/11) — after #9 and #10.

## Shows and contributor characters

11. [#12 Specify distinct shows and audience reactions for venue categories](https://github.com/devloot-xyz/LootTown/issues/12)
12. [#13 Implement performer animation, venue cues, and opt-in sound](https://github.com/devloot-xyz/LootTown/issues/13) — after #10 and #12.
13. [#14 Create a licensed, reusable contributor avatar rig and outfit kit](https://github.com/devloot-xyz/LootTown/issues/14) — after #2 and #12.
14. [#15 Map stable community identity and approved commit bands to avatars](https://github.com/devloot-xyz/LootTown/issues/15) — after #4 and #14.
15. [#16 Animate audience watching, dancing, cheering, and jumping](https://github.com/devloot-xyz/LootTown/issues/16) — after #13 and #15.
16. [#17 Benchmark crowds and implement measured LOD/visibility budgets](https://github.com/devloot-xyz/LootTown/issues/17) — after #16.

## Profiles, bounty, sharing, and accessibility

17. [#18 Open contributor profiles and show trustworthy contribution evidence](https://github.com/devloot-xyz/LootTown/issues/18) — after #5 and #15.
18. [#19 Specify bounty monsters without implying combat or payment in LootTown](https://github.com/devloot-xyz/LootTown/issues/19) — design before implementation.
19. [#20 Read existing DevLoot bounties and hand off from monsters](https://github.com/devloot-xyz/LootTown/issues/20) — after #5 and #19; payments remain in DevLoot.
20. [#21 Support stable world, venue, and contributor deep links](https://github.com/devloot-xyz/LootTown/issues/21) — after #9, #11, and #18.
21. [#22 Audit and implement keyboard, reduced-motion, audio, and no-WebGL paths](https://github.com/devloot-xyz/LootTown/issues/22) — after core navigation, show, and character systems.

## Host integration and release

22. [#23 Embed LootTown in DevLoot with safe mount, routing, and lifecycle](https://github.com/devloot-xyz/LootTown/issues/23) — after the public projection and core journeys.
23. [#24 Run a community pilot and enforce the world quality gate](https://github.com/devloot-xyz/LootTown/issues/24) — after #17 and #23.

The linked issue descriptions are the source of truth for detailed dependencies and acceptance evidence. Parallel art and data work can proceed when their named inputs are approved.
