# Accessibility Audit & Assistive Technology Matrix

This document provides the accessibility verification, WCAG 2.1 AA audit checklist, and fallback matrix implemented for LootTown (Issue #22).

## 1. Compliance Checklist (WCAG 2.1 AA)

| Criterion | Implementation | Status |
| --- | --- | --- |
| **Keyboard Operability (2.1.1)** | All venue entries, exits, contributor inspections, and controls can be operated via `Tab`, `Shift+Tab`, `Enter`, and `Space`. | ✅ PASSED |
| **Guaranteed Venue Exit** | Exit button is isolated outside the dynamic 3D tree, remaining operational even during scene/data failures. | ✅ PASSED |
| **No-WebGL Fallback** | Semantic DOM list/detail route (`<SemanticExplorer />`) renders identically without WebGL context or GPU requirements. | ✅ PASSED |
| **Reduced Motion (2.3.3)** | Checks OS/browser `(prefers-reduced-motion: reduce)`. Non-essential camera fly-ins and mesh oscillations are bypassed. | ✅ PASSED |
| **Audio Invariant (1.4.2)** | Audio NEVER autoplays on page load or venue entry. Enforced via `AudioConsentController`, requiring explicit user interaction. | ✅ PASSED |
| **Touch Targets (2.5.5)** | All interactive buttons have a minimum bounding box of 44×44px. | ✅ PASSED |
| **Color Contrast (1.4.3)** | Text colors (`#1a73e8`, `#202124`, `#137333`) maintain a contrast ratio >= 4.5:1 against light backgrounds. | ✅ PASSED |
| **Screen Reader Landmarks** | Uses standard HTML5 landmarks (`<main>`, `<nav>`, `<section>`, `<article>`) and skip navigation links. | ✅ PASSED |

---

## 2. Interaction Matrix

| Persona / Environment | Behavior in LootTown |
| --- | --- |
| **Headless / No WebGL** | `detectWebGLSupport()` detects absence of WebGL 1/2 and serves the full semantic list/detail view without canvas crashes. |
| **Keyboard Only** | User tabs through skip link, control bar, and venue list, activating navigation with `Enter` / `Space`. |
| **Screen Reader** | Reads aria-labels, button pressed states (`aria-pressed`), and live regions (`aria-live="polite"`). |
| **Motor Sensitivity** | Reduced motion preference suppresses rapid camera panning. |
