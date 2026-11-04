# Implementation backlog

This is an issue-ready plan, **not** a list of funded bounties or created GitHub issues. Open one issue per task after confirming its dependency and owner. Budget, eligibility, and payment are separate DevLoot decisions. “Ready to fund” below means scope and test evidence are reviewable, not that funds exist. Every task must preserve the product rules in `product.md`, include tests proportionate to risk, and update contracts/docs when behavior changes.

## Completed base — do not offer again

**B00 · Offline technical preview (LootTown, done).** Synthetic one-venue React/Fiber scene, orbit control, light motion, text fallback, approved avatar band function, proposed venue function, tests, Docker path, CI and docs. Verification commands are in README. This is a scaffold, not a live data milestone.

## Data foundation

### 01 · Contributor attribution policy and coverage design

- **Owner / dependency:** DevLoot; none. **Objective:** specify an auditable community contributor and commit policy.
- **In:** `ProjectRepository`, contributor sync, public GitHub attribution limitations. **Out:** no scene work, no retroactive claim of complete history.
- **Deliverable:** short policy with bot handling, unlinked/deleted authors, coauthors, forks/mirrors, duplicate SHAs, repository changes, time window, refresh/failure, and unknown semantics; version identifier.
- **Accept:** examples for two linked repos and overlapping SHAs give one person and one count per unique attributed commit; partial source returns unknown; exclusions are explicit. **Evidence:** reviewed fixtures and privacy/security review. **Risk:** GitHub may not supply full history or human identity proof. **Ready to fund when:** provider method and data retention/privacy scope are approved.

### 02 · Versioned community venue read projection

- **Owner / dependency:** DevLoot; 01. **Objective:** implement a public, paginated or snapshot-consistent projection behind an agreed path (path is not yet assigned).
- **In:** policy v1 and linked public repos. **Out:** no token to browser, no write endpoint, no private repository metadata.
- **Deliverable:** `schemaVersion`, community ID/name, policy/coverage/freshness, unique eligible GitHub IDs and nullable deduplicated community commit counts; stable pagination or snapshot cursor.
- **Accept:** contract fixture covers empty, partial, stale, duplicate, bot and shared-repo cases; 10 linked repos do not double count; auth/CORS decision documented. **Evidence:** backend contract/integration tests and sample synthetic response. **Risk:** provider rate limits and stale sync. **Ready to fund when:** 01 and expected response limits are agreed.

### 03 · Public read adapter and contract tests

- **Owner / dependency:** LootTown; 02. **Objective:** replace the demo adapter with validated public reads while retaining offline demo mode.
- **In:** documented v1 projection. **Out:** no private GitHub API calls or credential flow.
- **Deliverable:** runtime validation, pagination/snapshot handling, loading/empty/stale/error states, cancellation on navigation.
- **Accept:** schema mismatch fails visibly; partial coverage never becomes zero; fixture and local API contract tests pass. **Evidence:** tests and browser capture for all states. **Risk:** cross-origin policy for standalone deployment. **Ready to fund when:** 02 publishes a stable endpoint and CORS/host mode is decided.

## World and people

### 04 · Global venue map and stable placement

- **Owner / dependency:** LootTown; 03. **Objective:** show one venue per community with stable positions and no repo/person buildings.
- **In:** paginated community IDs and contributor coverage. **Out:** no live presence.
- **Deliverable:** deterministic layout, search/selection, missing-data treatment and proposed size tiers in one config.
- **Accept:** reorder/pagination do not move existing venues; unknown counts get neutral presentation; venue thresholds are labeled proposed until approved. **Evidence:** deterministic layout tests and desktop/mobile capture. **Risk:** scale and map density. **Ready to fund when:** 03 is stable and size tiers are approved or explicitly kept neutral.

### 05 · Venue entry, exit, camera and touch controls

- **Owner / dependency:** LootTown; 04. **Objective:** navigate between map and one venue on desktop and mobile.
- **In:** venue IDs and scene camera. **Out:** no event show content.
- **Deliverable:** focus-safe transitions, back/escape behavior, keyboard and touch controls, camera bounds.
- **Accept:** enter/exit works at narrow widths, browser back restores map, focus moves predictably, no trapped controls. **Evidence:** browser recordings and keyboard test. **Risk:** motion sickness. **Ready to fund when:** map selection API is stable.

### 06 · Avatar identity, palette and approved commit bands

- **Owner / dependency:** LootTown; 02 and 07. **Objective:** one persistent visual identity per eligible GitHub ID/community.
- **In:** v1 commit count/coverage and licensed rig parts. **Out:** no scoring of human quality, no inactivity decay.
- **Deliverable:** deterministic palette and outfit mapping; approved 1–9, 10–49, 50–199, 200–999, 1000+ bands; unknown appearance; body variation about 10%.
- **Accept:** duplicate rows produce one character; boundary tests pass; same ID stays visually stable across sessions; incomplete count has no earned-tier claim. **Evidence:** tests and tier contact sheet. **Risk:** false attribution. **Ready to fund when:** 02 and asset palette are ready.

### 07 · Original GLB character kit and rig

- **Owner / dependency:** LootTown; product art direction. **Objective:** replace placeholder geometry with reusable, lightweight characters.
- **In:** glTF/GLB pipeline, band requirements. **Out:** no copied GitCity art, no giant unique mesh per person.
- **Deliverable:** base rig, outfit/accessory slots, animation compatibility, asset manifest with author/source/license/size.
- **Accept:** all five bands and unknown can be assembled; no clipping at motion extremes; license/provenance review passes. **Evidence:** asset preview and size/triangle report. **Risk:** rig and license incompatibility. **Ready to fund when:** visual brief and asset budgets are signed off.

### 08 · Venue type art kit and growth rules

- **Owner / dependency:** LootTown; 04. **Objective:** make plaza, hall, warehouse and arena readable as one community's evolving venue.
- **In:** approved venue thresholds, asset budget. **Out:** no buildings for files, repos, or people.
- **Deliverable:** reusable venue variants and transition rules with stable placement.
- **Accept:** a contributor-count boundary changes venue type without moving its map identity; unknown count is handled. **Evidence:** boundary tests and scene captures. **Risk:** thresholds not yet approved. **Ready to fund when:** thresholds and visual brief are approved.

### 09 · Presentation events by venue type

- **Owner / dependency:** LootTown; 05, 07, 08. **Objective:** give each venue type a distinct presentation loop.
- **In:** venue art, rig and motion preferences. **Out:** no networked live event or user presence claim.
- **Deliverable:** authored GLB clips/timelines with accessible text description and pause.
- **Accept:** each type has a recognizable, bounded loop; reduced motion stays readable and static. **Evidence:** capture for each variant and motion audit. **Risk:** animation cost. **Ready to fund when:** assets and event brief are approved.

### 10 · Crowd reactions and density controls

- **Owner / dependency:** LootTown; 06, 09, 13. **Objective:** animate a bounded crowd without implying who is online.
- **In:** character kit, visible-person selection policy, benchmark limits. **Out:** no thousands of simultaneous skinned rigs by default.
- **Deliverable:** reaction states, deterministic visible sample/LOD, text disclosure of represented versus displayed count.
- **Accept:** no duplicate character in a venue, paused/reduced motion works, density respects measured budget. **Evidence:** crowd trace and device captures. **Risk:** bias from sampling and GPU load. **Ready to fund when:** 13 defines target devices/budget.

### 11 · Person and community navigation

- **Owner / dependency:** LootTown; 03, 05, 06. **Objective:** inspect a character and navigate to its DevLoot profile/community.
- **In:** stable GitHub ID and approved public URLs/callbacks. **Out:** no wallet-as-identity or unverified private info.
- **Deliverable:** accessible person card, role/evidence links, `selectPerson` and `selectCommunity` callbacks.
- **Accept:** keyboard and pointer selection match; changed handles retain identity; unknown profile routes get safe fallback. **Evidence:** integration tests and screen reader pass. **Risk:** stale profile links. **Ready to fund when:** host navigation contract is agreed.

## Bounties, quality and release

### 12 · Bounty monster concept and safety specification

- **Owner / dependency:** LootTown with DevLoot review; 04. **Objective:** decide how an existing bounty appears on the venue map.
- **In:** public bounty read states and community/repo links. **Out:** combat, claim, payout, wallet actions, and implementation.
- **Deliverable:** state-to-visual mapping, shared-repo behavior, moderation, accessibility, and entry/exit mockups.
- **Accept:** every status and missing/stale case has a non-misleading representation; no payment inference. **Evidence:** reviewed design spec and user test notes. **Risk:** gamifying financial or dispute states. **Ready to fund when:** product and DevLoot owners approve the concept.

### 13 · Crowd performance benchmark and LOD budget

- **Owner / dependency:** LootTown; 07 and a representative scene. **Objective:** measure practical limits on named desktop and mobile targets.
- **In:** GLB kit and scene variants. **Out:** unsupported blanket FPS promises.
- **Deliverable:** reproducible benchmark harness/report for frame time, draw calls, memory and load; LOD/visibility limits.
- **Accept:** results include at least low/mobile and desktop targets, cold load and crowd-size sweeps; regressions can be rerun. **Evidence:** trace, device/browser versions and methodology. **Risk:** device variance. **Ready to fund when:** target devices are selected.

### 14 · Accessibility and reduced-motion audit

- **Owner / dependency:** LootTown; 05, 09, 11. **Objective:** make the full path usable without 3D or motion.
- **In:** map, venue and person flows. **Out:** no purely decorative motion requirement.
- **Deliverable:** semantic list/map alternative, focus management, keyboard paths, contrast and motion controls.
- **Accept:** keyboard-only and WebGL-disabled journeys reach the same public information; system preference persists; automated checks and manual screen reader notes supplied. **Evidence:** audit report and fixes. **Risk:** Canvas-only interactions. **Ready to fund when:** core navigation exists.

### 15 · Bounty read integration and handoff

- **Owner / dependency:** LootTown; 12 and public DevLoot read contract. **Objective:** show approved bounty representation and open its DevLoot detail page.
- **In:** `GET /api/bounties?directory=true&projectId=...`, micro USDC amount, shared-repo policy. **Out:** no payout, claim, or bounty mutation.
- **Deliverable:** read adapter, status states and `openBounty({bountyId})` callback.
- **Accept:** amount converts from micro USDC exactly for display; shared repo is not double-paid or misattributed; stale/errors are visible. **Evidence:** contract tests and host navigation capture. **Risk:** endpoint status changes. **Ready to fund when:** 12 approves mapping and host route.

### 16 · Shareable venue links and metadata

- **Owner / dependency:** LootTown; 04, 05. **Objective:** make a community venue directly addressable and shareable.
- **In:** stable community ID and host routing policy. **Out:** no private profile or speculative social graph.
- **Deliverable:** deep link, copy control, accessible confirmation and safe preview metadata owned by host.
- **Accept:** reload/back and unknown ID work; link resolves to same venue; no personal or secret data in preview. **Evidence:** route tests and shared-link capture. **Risk:** host URL ownership. **Ready to fund when:** DevLoot routing is agreed.

### 17 · DevLoot host integration pilot

- **Owner / dependency:** DevLoot + LootTown; 02, 03, 05, 11, 14. **Objective:** embed the experience into the existing React 18 site without a second backend.
- **In:** component/callback contract, same-origin public reads, host design tokens. **Out:** no auth/wallet rewrite or DevLoot stack duplication.
- **Deliverable:** host route, bundle/dependency check, feature flag, fallback and rollback path.
- **Accept:** one community pilot loads with real public data and truthful coverage; typecheck/build/E2E pass; no secret leaks or new GitHub grants. **Evidence:** linked PRs, browser capture and operational checklist. **Risk:** bundle size and integration drift. **Ready to fund when:** API and host ownership are agreed.

### 18 · Release and content provenance review

- **Owner / dependency:** LootTown + DevLoot; 08–17 as applicable. **Objective:** prepare an honest first public release.
- **In:** pilot evidence, asset manifests, performance/a11y reports. **Out:** no unsupported global launch or funded bounty promise.
- **Deliverable:** release checklist, license notices, observed limits, monitoring and rollback owner.
- **Accept:** real/synthetic labels audited, linked API contract version recorded, security/privacy/accessibility/performance gates met, release can be rolled back. **Evidence:** signed checklist and smoke report. **Risk:** late asset license or attribution issues. **Ready to fund when:** pilot gates and ownership are complete.
