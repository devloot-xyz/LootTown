# Navigation & Canonical Deep Linking Specification

This document specifies the deep linking, URL state schema, fallback invariants, and browser history matrix implemented for LootTown (Issue #21).

## 1. Canonical URL Schema

LootTown uses short, stable query parameters to represent canonical world and venue states:

| State | Canonical URL Format | Example |
| --- | --- | --- |
| **World Overview** | `/` (or root with no params) | `https://loottown.devloot.xyz/` |
| **Community Venue** | `?community=<communityId>` | `https://loottown.devloot.xyz/?community=7` |
| **Contributor Character** | `?community=<communityId>&contributor=<githubId>` | `https://loottown.devloot.xyz/?community=7&contributor=123` |

### Persistent vs. Transient State
- **Canonical (Persisted in URL)**:
  - `communityId`: Integer ID of the selected DevLoot community venue.
  - `contributorId`: Integer GitHub ID of the selected contributor character within the community.
- **Intentionally Transient (Omitted from URL)**:
  - Camera pitch, pan, orbit angles, and zoom distances.
  - Temporary hover states and active animations.
  - Modal opening transitions.
  
Omitting transient states keeps URLs concise, human-readable, mobile-friendly, and stable across community data refreshes.

---

## 2. Invalidation and Safe Fallback Invariants

When an external URL or direct navigation link is loaded:
1. **Valid Known IDs**: Opens directly to the intended community venue or focused character without intermediate redirect steps.
2. **Unknown Community ID**: When a URL requests a non-existent `communityId` (e.g. `?community=999`), the app safely falls back to the **World Map** overview and alerts the user without crashing.
3. **Unknown Contributor ID**: When a URL specifies a valid community but an unknown `contributor` ID (e.g. `?community=1&contributor=99999`), the app safely falls back to the **Community Venue** view.
4. **Invalid Query Data**: Non-numeric or negative parameters (e.g. `?community=abc`) are rejected by `parseNavigationUrl` and sanitized to the default world state.

---

## 3. Browser History Matrix

| Action | URL Transition | History Method | Expected Behavior |
| --- | --- | --- | --- |
| Initial Load (Root) | `/` | — | Renders World Map overview. |
| Click "Enter Venue" | `/` → `?community=1` | `pushState` | Adds history entry; renders venue show. |
| Click "View Character" | `?community=1` → `?community=1&contributor=101` | `pushState` | Adds history entry; focuses character. |
| Browser Back Button | `...&contributor=101` → `?community=1` | `popstate` | Returns to venue show without contributor focused. |
| Browser Back Button | `?community=1` → `/` | `popstate` | Returns to World Map overview. |
| Browser Forward Button | `/` → `?community=1` | `popstate` | Returns to venue show; no duplicate entries created. |
| Fallback Correction | `?community=999` → `/` | `replaceState` | URL is normalized in-place so Back button does not loop. |
| Refresh (`F5` / `Cmd+R`) | Retains current URL | — | State is restored identically after data rehydration. |

---

## 4. Accessibility & Share Controls

- **Share Button**: `<ShareButton />` provides one-click copying of the canonical URL using `navigator.clipboard.writeText`.
- **Keyboard Usability**: Supports standard `Tab` focus, `Enter`, and `Space` activation.
- **Screen Reader Support**: Announces copy success via an `aria-live="polite"` live region.
- **Touch Target**: Sized to at least 44×44px for compliant mobile interaction.
