# Contributor Profile Inspection and Evidence Panel

Implements Issue [#18](https://github.com/devloot-xyz/LootTown/issues/18).

## Overview
LootTown allows visitors to click or keyboard-select community character avatars to inspect the real contributor they represent. This module implements the accessible profile detail panel, safe external link generation, and strict evidence rendering invariants.

## Invariants & Design Guarantees

1. **Trustworthy Evidence & No Inferred Zeros**:
   - Upstream commit counts are only displayed when `coverage.complete === true` and the projection supplies a non-null `communityCommitCount`.
   - If coverage is partial, stale, or `communityCommitCount === null`, the panel displays an explicit **Coverage Incomplete** notice. It **never** falls back to rendering `0` or assigning a lower appearance tier.
2. **Appearance Bands**:
   - `core`: 50+ unique certified community commits.
   - `active`: 10–49 unique certified community commits.
   - `emerging`: 1–9 unique certified community commits.
   - `unknown`: Any contributor under partial or uncertified coverage.
3. **Accessible Keyboard & Focus Lifecycle**:
   - Accessible modal with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
   - Focus is automatically placed on the close button when opened.
   - Pressing `Escape` or clicking the backdrop safely closes the dialog.
   - Closing the panel restores keyboard focus to the originating character or venue button.
4. **Safe Profile Navigation**:
   - External links to GitHub are sanitized to strictly valid alphanumeric/hyphen usernames and opened in new tabs with `rel="noopener noreferrer"`.
5. **Non-Goals (Out of Scope)**:
   - No global contributor leaderboards or competitive gamification inside LootTown.
   - No private data scraping or simulated live user presence.
