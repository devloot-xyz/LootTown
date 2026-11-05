import { describe, expect, it } from 'vitest';
import { generateFixture } from '../seed/generate.ts';
import {
  checkWebGLAvailability,
  clampDistance,
  clampPolarAngle,
  clampPosition,
  createAccessibleVenueList,
  createDefaultCameraState,
  DEFAULT_CAMERA_BOUNDS,
  focusVenue,
  getDeterministicVenuePosition,
  handleViewportResize,
  navigateKeyboardSelection,
  orbitCamera,
  panCamera,
  processTouchGesture,
  zoomCamera,
  type WorldSelectionState,
} from './worldNavigation.ts';

describe('worldNavigation', () => {
  const fixture = generateFixture();

  describe('Deterministic Venue Placement', () => {
    it('places all 40 fixture communities at unique, stable locations', () => {
      const positions = new Map<string, number>();

      for (const venue of fixture.venues) {
        const pos = getDeterministicVenuePosition(venue.community.id);
        const key = `${pos.x},${pos.y},${pos.z}`;

        expect(positions.has(key)).toBe(false);
        positions.set(key, venue.community.id);
      }

      expect(positions.size).toBe(40);
    });

    it('preserves exact coordinates regardless of array reordering', () => {
      const originalFirst = getDeterministicVenuePosition(fixture.venues[0].community.id);
      const shuffledVenues = [...fixture.venues].reverse();
      const reorderedFirst = getDeterministicVenuePosition(shuffledVenues[shuffledVenues.length - 1].community.id);

      expect(originalFirst).toEqual(reorderedFirst);
    });

    it('rejects invalid community IDs safely', () => {
      expect(() => getDeterministicVenuePosition(-1)).toThrow('Invalid communityId');
      expect(() => getDeterministicVenuePosition(0)).toThrow('Invalid communityId');
      expect(() => getDeterministicVenuePosition(NaN)).toThrow('Invalid communityId');
    });
  });

  describe('Camera Bounds & Clamping', () => {
    it('clamps position within bounding box', () => {
      const extremeOutside = { x: 1000, y: 500, z: -1000 };
      const clamped = clampPosition(extremeOutside, DEFAULT_CAMERA_BOUNDS);

      expect(clamped.x).toBe(DEFAULT_CAMERA_BOUNDS.maxX);
      expect(clamped.y).toBe(DEFAULT_CAMERA_BOUNDS.maxY);
      expect(clamped.z).toBe(DEFAULT_CAMERA_BOUNDS.minZ);
    });

    it('clamps distance between min and max zoom', () => {
      expect(clampDistance(10, DEFAULT_CAMERA_BOUNDS)).toBe(DEFAULT_CAMERA_BOUNDS.minDistance);
      expect(clampDistance(900, DEFAULT_CAMERA_BOUNDS)).toBe(DEFAULT_CAMERA_BOUNDS.maxDistance);
      expect(clampDistance(100, DEFAULT_CAMERA_BOUNDS)).toBe(100);
    });

    it('clamps polar angle to prevent below-ground clipping or inversion', () => {
      expect(clampPolarAngle(0, DEFAULT_CAMERA_BOUNDS)).toBe(DEFAULT_CAMERA_BOUNDS.minPolarAngle);
      expect(clampPolarAngle(Math.PI, DEFAULT_CAMERA_BOUNDS)).toBe(DEFAULT_CAMERA_BOUNDS.maxPolarAngle);
    });
  });

  describe('Camera Controls (Orbit, Pan, Zoom, Focus)', () => {
    it('creates camera with valid default position within bounds', () => {
      const cam = createDefaultCameraState();

      expect(cam.position.x).toBeGreaterThanOrEqual(DEFAULT_CAMERA_BOUNDS.minX);
      expect(cam.position.x).toBeLessThanOrEqual(DEFAULT_CAMERA_BOUNDS.maxX);
      expect(cam.distance).toBe(140);
      expect(cam.fov).toBe(45);
    });

    it('pans camera along the horizontal plane without drifting out of bounds', () => {
      const initial = createDefaultCameraState();
      const panned = panCamera(initial, 50, -50);

      expect(panned.target.x).not.toBe(initial.target.x);
      expect(panned.position.x).toBeLessThanOrEqual(DEFAULT_CAMERA_BOUNDS.maxX);
    });

    it('orbits camera around target smoothly', () => {
      const initial = createDefaultCameraState();
      const orbited = orbitCamera(initial, Math.PI / 8, 0.1);

      expect(orbited.azimuth).toBeCloseTo(initial.azimuth + Math.PI / 8);
      expect(orbited.polar).toBeCloseTo(initial.polar + 0.1);
    });

    it('zooms in and out respecting limits', () => {
      const initial = createDefaultCameraState();
      const zoomedIn = zoomCamera(initial, -50);
      expect(zoomedIn.distance).toBe(90);

      const overZoomed = zoomCamera(initial, -200);
      expect(overZoomed.distance).toBe(DEFAULT_CAMERA_BOUNDS.minDistance);
    });

    it('focuses camera on a selected venue without losing target', () => {
      const initial = createDefaultCameraState();
      const venuePos = getDeterministicVenuePosition(800_000_001);
      const focused = focusVenue(initial, venuePos);

      expect(focused.target).toEqual(venuePos);
      expect(focused.distance).toBeLessThanOrEqual(85);
    });
  });

  describe('Mobile Touch & Pointer Navigation', () => {
    const initialCam = createDefaultCameraState();
    const initialSelection: WorldSelectionState = {
      selectedCommunityId: null,
      focusedCommunityId: null,
      history: [],
    };

    it('handles 1-finger pan gesture', () => {
      const { cameraState } = processTouchGesture(
        { type: 'pan', deltaX: 20, deltaY: 10 },
        initialCam,
        initialSelection
      );
      expect(cameraState.target).not.toEqual(initialCam.target);
    });

    it('handles 2-finger pinch-to-zoom gesture', () => {
      const { cameraState } = processTouchGesture(
        { type: 'pinch', scaleFactor: 1.5 },
        initialCam,
        initialSelection
      );
      expect(cameraState.distance).toBeLessThan(initialCam.distance);
    });

    it('handles tap on building to select and focus community venue', () => {
      const targetId = 800_000_005;
      const { cameraState, selectionState } = processTouchGesture(
        { type: 'tap', tapCommunityId: targetId },
        initialCam,
        initialSelection
      );

      expect(selectionState.selectedCommunityId).toBe(targetId);
      expect(selectionState.history).toContain(targetId);
      expect(cameraState.target).toEqual(getDeterministicVenuePosition(targetId));
    });
  });

  describe('Keyboard Navigation', () => {
    const ids = [800_000_001, 800_000_002, 800_000_003];

    it('selects first venue when starting from null', () => {
      expect(navigateKeyboardSelection(null, ids, 'next')).toBe(800_000_001);
    });

    it('cycles sequentially with next and prev', () => {
      expect(navigateKeyboardSelection(800_000_001, ids, 'next')).toBe(800_000_002);
      expect(navigateKeyboardSelection(800_000_003, ids, 'next')).toBe(800_000_001); // wraps
      expect(navigateKeyboardSelection(800_000_001, ids, 'prev')).toBe(800_000_003); // wraps
    });

    it('jumps directly to first and last destinations', () => {
      expect(navigateKeyboardSelection(800_000_002, ids, 'first')).toBe(800_000_001);
      expect(navigateKeyboardSelection(800_000_002, ids, 'last')).toBe(800_000_003);
    });
  });

  describe('Resize Stability & Orientation Adaptation', () => {
    it('preserves selection and adapts FOV when resizing between desktop and mobile', () => {
      const cam = createDefaultCameraState();
      const selection: WorldSelectionState = {
        selectedCommunityId: 800_000_010,
        focusedCommunityId: 800_000_010,
        history: [800_000_010],
      };

      // Resize to mobile portrait (width 390, height 844)
      const mobileResult = handleViewportResize({ width: 390, height: 844 }, cam, selection);
      expect(mobileResult.selectionState.selectedCommunityId).toBe(800_000_010);
      expect(mobileResult.cameraState.fov).toBe(60);

      // Resize to desktop landscape (width 1920, height 1080)
      const desktopResult = handleViewportResize({ width: 1920, height: 1080 }, cam, selection);
      expect(desktopResult.selectionState.selectedCommunityId).toBe(800_000_010);
      expect(desktopResult.cameraState.fov).toBe(45);
    });
  });

  describe('Accessible DOM List & Neutral Scaling', () => {
    it('creates accessible venue list covering all 40 fixture communities with neutral building scale', () => {
      const list = createAccessibleVenueList(fixture.venues);

      expect(list.length).toBe(40);
      for (const item of list) {
        expect(item.buildingScale).toBe(1.0); // Neutral scale - not artificially shrunk
        expect(item.isAccessibleDestination).toBe(true);
        expect(item.coverageStatus).toBe('complete');
      }
    });

    it('marks partial or incomplete coverage neutrally without shrinking the building', () => {
      const partialVenue = {
        ...fixture.venues[0],
        coverage: { complete: false, lastSyncedAt: null, policyVersion: 'partial-v1' },
      };
      const [item] = createAccessibleVenueList([partialVenue]);

      expect(item.coverageStatus).toBe('partial');
      expect(item.buildingScale).toBe(1.0); // Strict acceptance criterion: missing coverage does not imply tiny venue
    });
  });

  describe('WebGL Fallback Support', () => {
    it('detects WebGL availability and handles fallback cleanly', () => {
      expect(checkWebGLAvailability(true)).toBe(true);
      expect(checkWebGLAvailability(false)).toBe(false);
    });
  });
});
