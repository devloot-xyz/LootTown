# Venue Navigation & State Lifecycle

## Overview
LootTown provides seamless, deterministic movement between the shared 3D exterior world and community venue show interiors in `src/navigation/venueNavigation.ts`.

## Core Navigation Capabilities

1. **Deterministic Entry & Exterior Return (Issue #11):**
   - When entering a community venue, the camera exterior anchor (`position`, `target`) is captured and persisted.
   - Upon exiting, the camera and selection smoothly restore to the exact exterior anchor location.

2. **Browser Back (`popstate`) Integration:**
   - Navigating into an interior pushes history state (`?community=:id`).
   - Hitting the browser Back button invokes `handleBrowserPopState`, cleanly transitioning the player back to the world view while preserving selected community and position context.

3. **Accessibility & Reduced Motion:**
   - When `reducedMotion: true` (or `prefers-reduced-motion: reduce`), transitional camera flight is bypassed, moving instantly to the interior or exterior.

4. **Asset Unavailable Fallback:**
   - If interior 3D assets or stage kits fail to load, the system transitions to `asset_error` mode with an informative notice and a clear, functional return path back to the world.

5. **Resource Management:**
   - The `VenueResourceManager` tracks and disposes canvases, event listeners, meshes, and WebGL allocations on exit, preventing memory and GPU leaks across repeated visits.
