import { describe, it, expect, vi } from 'vitest';
import {
  createVenueNavigationState,
  enterVenue,
  completeTransitionIn,
  exitVenue,
  completeTransitionOut,
  createHistoryPayload,
  handleBrowserPopState,
  VenueResourceManager,
  type CameraAnchor,
} from './venueNavigation.ts';

const mockExteriorAnchor: CameraAnchor = {
  position: { x: 10, y: 5, z: 25 },
  target: { x: 10, y: 0, z: 0 },
};

describe('venueNavigation - entry and exit transitions', () => {
  it('transitions from world to interior with standard animation', () => {
    let state = createVenueNavigationState();
    expect(state.mode).toBe('world');
    expect(state.selectedCommunityId).toBeNull();

    // Trigger enter
    state = enterVenue(state, 42, mockExteriorAnchor);
    expect(state.mode).toBe('transitioning_in');
    expect(state.selectedCommunityId).toBe(42);
    expect(state.savedWorldAnchor).toEqual(mockExteriorAnchor);

    // Complete transition
    state = completeTransitionIn(state);
    expect(state.mode).toBe('interior');
    expect(state.activeInteriorCommunityId).toBe(42);
  });

  it('skips transition travel immediately when reduced motion is preferred', () => {
    let state = createVenueNavigationState(null, null, true);
    state = enterVenue(state, 42, mockExteriorAnchor);

    // Under reduced motion, mode transitions directly to interior
    expect(state.mode).toBe('interior');
    expect(state.selectedCommunityId).toBe(42);
    expect(state.activeInteriorCommunityId).toBe(42);
    expect(state.savedWorldAnchor).toEqual(mockExteriorAnchor);
  });

  it('exits venue back to world and retains saved exterior anchor', () => {
    let state = createVenueNavigationState(42, mockExteriorAnchor);
    expect(state.mode).toBe('interior');

    state = exitVenue(state);
    expect(state.mode).toBe('transitioning_out');

    state = completeTransitionOut(state);
    expect(state.mode).toBe('world');
    expect(state.selectedCommunityId).toBe(42);
    expect(state.savedWorldAnchor).toEqual(mockExteriorAnchor);
    expect(state.activeInteriorCommunityId).toBeNull();
  });
});

describe('venueNavigation - asset availability and error handling', () => {
  it('switches to asset_error when interior assets are unavailable', () => {
    let state = createVenueNavigationState();
    state = enterVenue(state, 99, mockExteriorAnchor, { isAssetAvailable: false });

    expect(state.mode).toBe('asset_error');
    expect(state.errorMessage).toContain('Interior venue assets for community 99 are currently unavailable');
    expect(state.activeInteriorCommunityId).toBeNull();
    // Exterior anchor is still saved so the user can safely return
    expect(state.savedWorldAnchor).toEqual(mockExteriorAnchor);

    // Exiting from error returns smoothly to world
    state = exitVenue(state);
    state = completeTransitionOut(state);
    expect(state.mode).toBe('world');
  });

  it('rejects invalid community IDs with meaningful exception', () => {
    const state = createVenueNavigationState();
    expect(() => enterVenue(state, -1, mockExteriorAnchor)).toThrow(/Invalid community ID/);
    expect(() => enterVenue(state, 0, mockExteriorAnchor)).toThrow(/Invalid community ID/);
  });
});

describe('venueNavigation - browser history and Back navigation', () => {
  it('generates accurate browser history payload for interior and world views', () => {
    let state = createVenueNavigationState(7, mockExteriorAnchor);
    const interiorHistory = createHistoryPayload(state);
    expect(interiorHistory.url).toBe('?community=7');
    expect(interiorHistory.state.view).toBe('venue');
    expect(interiorHistory.state.communityId).toBe(7);

    state = completeTransitionOut(exitVenue(state));
    const worldHistory = createHistoryPayload(state);
    expect(worldHistory.url).toBe('/');
    expect(worldHistory.state.view).toBe('world');
  });

  it('restores previous community and world position on browser Back (popstate)', () => {
    let state = createVenueNavigationState(7, mockExteriorAnchor);

    // User hits browser Back to return to world
    const popStateEvent = {
      view: 'world' as const,
      communityId: 7,
      worldAnchor: mockExteriorAnchor,
    };

    state = handleBrowserPopState(state, popStateEvent);
    expect(state.mode).toBe('world');
    expect(state.selectedCommunityId).toBe(7);
    expect(state.savedWorldAnchor).toEqual(mockExteriorAnchor);
    expect(state.activeInteriorCommunityId).toBeNull();
  });
});

describe('venueNavigation - resource disposal and cleanup', () => {
  it('registers and disposes scene resources cleanly on exit without leaks', () => {
    const manager = new VenueResourceManager();
    const cleanupSpy1 = vi.fn();
    const cleanupSpy2 = vi.fn();

    manager.register('mesh_stage_kit');
    manager.register('listener_keyboard');
    expect(manager.count).toBe(2);

    manager.dispose('mesh_stage_kit', cleanupSpy1);
    expect(cleanupSpy1).toHaveBeenCalledOnce();
    expect(manager.count).toBe(1);

    const disposedCount = manager.disposeAll(cleanupSpy2);
    expect(disposedCount).toBe(1);
    expect(cleanupSpy2).toHaveBeenCalledWith('listener_keyboard');
    expect(manager.count).toBe(0);
  });
});
