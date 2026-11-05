/**
 * Venue Navigation & Lifecycle State Machine.
 *
 * Implements deterministic transition between the shared 3D world and
 * individual community venue interiors (Issue #11):
 * - Preserves world camera position and selected community ID upon exit.
 * - Restores state accurately on browser Back button (popstate).
 * - Instant transition bypass for prefers-reduced-motion.
 * - Graceful fallback when interior assets are missing or fail to load.
 * - Resource cleanup to avoid GPU, canvas, or listener memory leaks across repeated visits.
 */

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface CameraAnchor {
  position: WorldPosition;
  target: WorldPosition;
}

export type NavigationMode =
  | 'world'
  | 'transitioning_in'
  | 'interior'
  | 'transitioning_out'
  | 'asset_error';

export interface VenueNavigationState {
  mode: NavigationMode;
  selectedCommunityId: number | null;
  savedWorldAnchor: CameraAnchor | null;
  activeInteriorCommunityId: number | null;
  reducedMotion: boolean;
  errorMessage?: string;
}

export interface PopStatePayload {
  view: 'world' | 'venue';
  communityId?: number;
  worldAnchor?: CameraAnchor;
}

/**
 * Creates initial venue navigation state.
 */
export function createVenueNavigationState(
  initialCommunityId: number | null = null,
  initialWorldAnchor: CameraAnchor | null = null,
  reducedMotion = false
): VenueNavigationState {
  return {
    mode: initialCommunityId !== null ? 'interior' : 'world',
    selectedCommunityId: initialCommunityId,
    savedWorldAnchor: initialWorldAnchor,
    activeInteriorCommunityId: initialCommunityId,
    reducedMotion,
  };
}

/**
 * Enters a community venue from the world.
 */
export function enterVenue(
  state: VenueNavigationState,
  communityId: number,
  exteriorAnchor: CameraAnchor,
  options?: { isAssetAvailable?: boolean }
): VenueNavigationState {
  if (!Number.isSafeInteger(communityId) || communityId <= 0) {
    throw new Error(`Invalid community ID: ${communityId}`);
  }

  const isAssetAvailable = options?.isAssetAvailable ?? true;
  if (!isAssetAvailable) {
    return {
      ...state,
      mode: 'asset_error',
      selectedCommunityId: communityId,
      savedWorldAnchor: exteriorAnchor,
      activeInteriorCommunityId: null,
      errorMessage: `Interior venue assets for community ${communityId} are currently unavailable.`,
    };
  }

  // If user prefers reduced motion, skip transitional camera travel instantly.
  const targetMode: NavigationMode = state.reducedMotion ? 'interior' : 'transitioning_in';

  return {
    ...state,
    mode: targetMode,
    selectedCommunityId: communityId,
    savedWorldAnchor: exteriorAnchor,
    activeInteriorCommunityId: communityId,
    errorMessage: undefined,
  };
}

/**
 * Finalizes transition into the interior.
 */
export function completeTransitionIn(state: VenueNavigationState): VenueNavigationState {
  if (state.mode !== 'transitioning_in') return state;
  return {
    ...state,
    mode: 'interior',
  };
}

/**
 * Begins exit from interior back to the world.
 */
export function exitVenue(state: VenueNavigationState): VenueNavigationState {
  if (state.mode === 'world') return state;

  const targetMode: NavigationMode = state.reducedMotion ? 'world' : 'transitioning_out';

  return {
    ...state,
    mode: targetMode,
    activeInteriorCommunityId: null,
    errorMessage: undefined,
  };
}

/**
 * Finalizes transition back to the world, restoring exterior anchor.
 */
export function completeTransitionOut(state: VenueNavigationState): VenueNavigationState {
  return {
    ...state,
    mode: 'world',
    activeInteriorCommunityId: null,
  };
}

/**
 * Generates browser history pushState payload.
 */
export function createHistoryPayload(state: VenueNavigationState): { url: string; state: PopStatePayload } {
  if (state.mode === 'interior' || state.mode === 'transitioning_in') {
    return {
      url: `?community=${state.selectedCommunityId}`,
      state: {
        view: 'venue',
        communityId: state.selectedCommunityId ?? undefined,
        worldAnchor: state.savedWorldAnchor ?? undefined,
      },
    };
  }
  return {
    url: '/',
    state: {
      view: 'world',
      communityId: state.selectedCommunityId ?? undefined,
      worldAnchor: state.savedWorldAnchor ?? undefined,
    },
  };
}

/**
 * Handles browser Back/Forward (popstate) event.
 */
export function handleBrowserPopState(
  state: VenueNavigationState,
  historyState: unknown
): VenueNavigationState {
  if (!historyState || typeof historyState !== 'object') {
    return {
      ...state,
      mode: 'world',
      activeInteriorCommunityId: null,
    };
  }

  const payload = historyState as PopStatePayload;

  if (payload.view === 'venue' && payload.communityId) {
    return {
      ...state,
      mode: 'interior',
      selectedCommunityId: payload.communityId,
      activeInteriorCommunityId: payload.communityId,
      savedWorldAnchor: payload.worldAnchor ?? state.savedWorldAnchor,
      errorMessage: undefined,
    };
  }

  return {
    ...state,
    mode: 'world',
    selectedCommunityId: payload.communityId ?? state.selectedCommunityId,
    savedWorldAnchor: payload.worldAnchor ?? state.savedWorldAnchor,
    activeInteriorCommunityId: null,
    errorMessage: undefined,
  };
}

/**
 * Track disposed scene resources to prevent memory / GPU leaks across visits.
 */
export class VenueResourceManager {
  private activeResources = new Set<string>();

  public register(resourceId: string): void {
    this.activeResources.add(resourceId);
  }

  public dispose(resourceId: string, cleanupFn?: () => void): void {
    if (this.activeResources.has(resourceId)) {
      if (cleanupFn) cleanupFn();
      this.activeResources.delete(resourceId);
    }
  }

  public disposeAll(cleanupFn?: (id: string) => void): number {
    const count = this.activeResources.size;
    for (const id of this.activeResources) {
      if (cleanupFn) cleanupFn(id);
    }
    this.activeResources.clear();
    return count;
  }

  public get count(): number {
    return this.activeResources.size;
  }
}
