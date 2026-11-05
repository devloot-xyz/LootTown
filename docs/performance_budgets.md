# Crowd Benchmark & Level-of-Detail (LOD) Visibility Budgets

This document formalizes the performance engineering thresholds, distance-culling models, and benchmark methodology for crowd rendering in LootTown (addressing **Issue #17**).

## 1. Device Budget Profiles

To maintain responsive frame rates across heterogeneous devices without discarding dataset members or making unsubstantiated FPS claims, three tiers are established:

| Tier | Target Frame Time | Target FPS | Max Visible Crowd Cap | High LOD Dist | Mid LOD Dist | Max Render Dist | Skeletal Anim |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop** | 16.67 ms | 60 FPS | **400** | 25m | 60m | 120m | Enabled |
| **Mid-Mobile** | 33.33 ms | 30 FPS | **120** | 15m | 35m | 70m | Enabled |
| **Low-Mobile** | 33.33 ms | 30 FPS | **40** | 8m | 20m | 40m | Disabled (Static Impostor) |

## 2. Invariants & Data Integrity

1. **No Data Truncation as Performance "Fix":**
   The underlying community membership dataset is never truncated. Total contributor counts remain exact in data.
2. **Transparent Sample Disclosure:**
   Whenever the crowd size exceeds the device tier's visibility budget, the UI must disclose the visible sample size:
   `Showing {visibleCount} of {totalEntities} contributors ({deviceTier} budget cap: {cap})`
3. **Deterministic Priority Allocation:**
   Entities closest to the active camera viewpoint receive immediate LOD priority; entities beyond `maxRenderDistance` or exceeding `maxVisibleCrowd` transition to the `CULLED` tier (`renderIndex = -1`).

## 3. Draw Call & Frame Time Budget Model

- **High LOD:** 3 draw calls per entity (mesh, attachments, nametag) + skeletal animation skinning cost.
- **Mid LOD:** 2 draw calls per entity (simplified mesh, nametag).
- **Low LOD:** 1 draw call per entity (low-poly / impostor billboard).
- **Culled:** 0 draw calls.

## 4. Benchmark Execution

To execute the crowd sweep across 10 to 1,500 nodes and verify compliance:

```bash
npm test
```
All 30 unit and integration tests verify distance calculations, LOD assignments, cap enforcement, and sweep stability.
