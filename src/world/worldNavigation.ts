import type { VenueV1 } from '../contracts/venue.ts';

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface CameraBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number; // in radians, prevent camera going below ground
  maxPolarAngle: number; // in radians, top-down view limit
}

export const DEFAULT_CAMERA_BOUNDS: CameraBounds = {
  minX: -600,
  maxX: 600,
  minY: 15,
  maxY: 350,
  minZ: -600,
  maxZ: 600,
  minDistance: 25,
  maxDistance: 450,
  minPolarAngle: Math.PI / 12, // ~15 deg
  maxPolarAngle: Math.PI / 2.2, // ~81 deg
};

export interface WorldCameraState {
  position: WorldPosition;
  target: WorldPosition;
  distance: number;
  azimuth: number; // horizontal angle in radians
  polar: number; // vertical angle in radians
  fov: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface AccessibleVenueItem {
  communityId: number;
  name: string;
  position: WorldPosition;
  coverageStatus: 'complete' | 'partial' | 'unknown';
  buildingScale: number; // Guaranteed neutral visual scaling
  isAccessibleDestination: boolean;
}

export interface WorldSelectionState {
  selectedCommunityId: number | null;
  focusedCommunityId: number | null;
  history: number[];
}

/**
 * Deterministically computes the spatial location for a community venue.
 * Ensures the venue location never shifts when data pages reorder or refresh.
 */
export function getDeterministicVenuePosition(communityId: number, totalCommunities = 40): WorldPosition {
  if (!Number.isSafeInteger(communityId) || communityId <= 0) {
    throw new Error(`Invalid communityId: ${communityId}`);
  }

  // Derive stable slot from ID
  const slotIndex = Math.abs(communityId % totalCommunities);
  const ring = Math.floor(Math.sqrt(slotIndex));
  const angle = (slotIndex * 2.39996322972865332); // Golden angle in radians

  const radius = 60 + ring * 55;
  const x = Math.round(Math.cos(angle) * radius * 10) / 10;
  const z = Math.round(Math.sin(angle) * radius * 10) / 10;
  const y = 0; // Ground plane

  return { x, y, z };
}

/**
 * Clamps coordinate values inside declared camera bounding box.
 */
export function clampPosition(pos: WorldPosition, bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS): WorldPosition {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z)),
  };
}

/**
 * Clamps camera distance inside allowed zoom limits.
 */
export function clampDistance(dist: number, bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS): number {
  return Math.max(bounds.minDistance, Math.min(bounds.maxDistance, dist));
}

/**
 * Clamps vertical polar angle to prevent ground clipping or upside-down flipping.
 */
export function clampPolarAngle(angle: number, bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS): number {
  return Math.max(bounds.minPolarAngle, Math.min(bounds.maxPolarAngle, angle));
}

/**
 * Computes position from spherical coordinates relative to target.
 */
export function computeCameraPosition(
  target: WorldPosition,
  distance: number,
  azimuth: number,
  polar: number,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldPosition {
  const clampedDistance = clampDistance(distance, bounds);
  const clampedPolar = clampPolarAngle(polar, bounds);

  const x = target.x + clampedDistance * Math.sin(clampedPolar) * Math.sin(azimuth);
  const y = target.y + clampedDistance * Math.cos(clampedPolar);
  const z = target.z + clampedDistance * Math.sin(clampedPolar) * Math.cos(azimuth);

  return clampPosition({ x, y, z }, bounds);
}

/**
 * Creates default camera state.
 */
export function createDefaultCameraState(
  initialTarget: WorldPosition = { x: 0, y: 0, z: 0 },
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldCameraState {
  const distance = 140;
  const azimuth = Math.PI / 4;
  const polar = Math.PI / 3;
  const position = computeCameraPosition(initialTarget, distance, azimuth, polar, bounds);

  return {
    position,
    target: initialTarget,
    distance,
    azimuth,
    polar,
    fov: 45,
  };
}

/**
 * Orbit camera horizontally and vertically around the current target.
 */
export function orbitCamera(
  state: WorldCameraState,
  deltaAzimuth: number,
  deltaPolar: number,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldCameraState {
  const newAzimuth = state.azimuth + deltaAzimuth;
  const newPolar = clampPolarAngle(state.polar + deltaPolar, bounds);
  const newPosition = computeCameraPosition(state.target, state.distance, newAzimuth, newPolar, bounds);

  return {
    ...state,
    azimuth: newAzimuth,
    polar: newPolar,
    position: newPosition,
  };
}

/**
 * Pan camera and target along the horizontal plane.
 */
export function panCamera(
  state: WorldCameraState,
  deltaScreenX: number,
  deltaScreenY: number,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldCameraState {
  // Translate screen delta relative to camera azimuth
  const sin = Math.sin(state.azimuth);
  const cos = Math.cos(state.azimuth);

  const worldDx = (deltaScreenX * cos + deltaScreenY * sin) * 0.4;
  const worldDz = (-deltaScreenX * sin + deltaScreenY * cos) * 0.4;

  const newTarget = clampPosition(
    {
      x: state.target.x + worldDx,
      y: state.target.y,
      z: state.target.z + worldDz,
    },
    bounds
  );

  const newPosition = computeCameraPosition(newTarget, state.distance, state.azimuth, state.polar, bounds);

  return {
    ...state,
    target: newTarget,
    position: newPosition,
  };
}

/**
 * Zoom camera in or out while respecting bounds.
 */
export function zoomCamera(
  state: WorldCameraState,
  deltaDistance: number,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldCameraState {
  const newDistance = clampDistance(state.distance + deltaDistance, bounds);
  const newPosition = computeCameraPosition(state.target, newDistance, state.azimuth, state.polar, bounds);

  return {
    ...state,
    distance: newDistance,
    position: newPosition,
  };
}

/**
 * Smoothly focus the camera on a selected community venue.
 */
export function focusVenue(
  state: WorldCameraState,
  venuePos: WorldPosition,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): WorldCameraState {
  const target: WorldPosition = {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, venuePos.x)),
    y: venuePos.y,
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, venuePos.z)),
  };
  const focusDistance = Math.min(state.distance, 85);
  const position = computeCameraPosition(target, focusDistance, state.azimuth, state.polar, bounds);

  return {
    ...state,
    target,
    distance: focusDistance,
    position,
  };
}

/**
 * Process touch gesture input on mobile screens.
 */
export interface TouchGestureInput {
  type: 'pan' | 'pinch' | 'tap';
  deltaX?: number;
  deltaY?: number;
  scaleFactor?: number;
  tapCommunityId?: number;
}

export function processTouchGesture(
  gesture: TouchGestureInput,
  cameraState: WorldCameraState,
  selectionState: WorldSelectionState,
  bounds: CameraBounds = DEFAULT_CAMERA_BOUNDS
): { cameraState: WorldCameraState; selectionState: WorldSelectionState } {
  if (gesture.type === 'pan' && gesture.deltaX !== undefined && gesture.deltaY !== undefined) {
    return {
      cameraState: panCamera(cameraState, gesture.deltaX, gesture.deltaY, bounds),
      selectionState,
    };
  }

  if (gesture.type === 'pinch' && gesture.scaleFactor !== undefined && gesture.scaleFactor > 0) {
    // scaleFactor > 1 means zoom in, < 1 means zoom out
    const delta = (1 - gesture.scaleFactor) * 50;
    return {
      cameraState: zoomCamera(cameraState, delta, bounds),
      selectionState,
    };
  }

  if (gesture.type === 'tap' && gesture.tapCommunityId !== undefined) {
    const venuePos = getDeterministicVenuePosition(gesture.tapCommunityId);
    return {
      cameraState: focusVenue(cameraState, venuePos, bounds),
      selectionState: {
        ...selectionState,
        selectedCommunityId: gesture.tapCommunityId,
        history: [...selectionState.history, gesture.tapCommunityId],
      },
    };
  }

  return { cameraState, selectionState };
}

/**
 * Adjusts camera FOV and ensures selection is preserved across window resize.
 */
export function handleViewportResize(
  viewport: ViewportSize,
  cameraState: WorldCameraState,
  selectionState: WorldSelectionState
): { cameraState: WorldCameraState; selectionState: WorldSelectionState } {
  // Mobile / portrait viewport adaptation
  const isPortrait = viewport.height > viewport.width;
  const fov = isPortrait ? 60 : 45;

  return {
    cameraState: {
      ...cameraState,
      fov,
    },
    // Selected venue ID is strictly preserved
    selectionState: {
      ...selectionState,
    },
  };
}

/**
 * Keyboard navigation across community venues.
 */
export function navigateKeyboardSelection(
  currentCommunityId: number | null,
  communityIds: number[],
  action: 'next' | 'prev' | 'first' | 'last'
): number | null {
  if (communityIds.length === 0) return null;

  if (currentCommunityId === null) {
    return communityIds[0];
  }

  const currentIndex = communityIds.indexOf(currentCommunityId);
  if (currentIndex === -1) {
    return communityIds[0];
  }

  switch (action) {
    case 'next':
      return communityIds[(currentIndex + 1) % communityIds.length];
    case 'prev':
      return communityIds[(currentIndex - 1 + communityIds.length) % communityIds.length];
    case 'first':
      return communityIds[0];
    case 'last':
      return communityIds[communityIds.length - 1];
  }
}

/**
 * Produces an accessible DOM list of all fixture community venues.
 * Enforces neutral visual treatment for unknown or partial contributor coverage:
 * buildings are never arbitrarily shrunk due to partial data.
 */
export function createAccessibleVenueList(venues: VenueV1[]): AccessibleVenueItem[] {
  return venues.map((venue) => {
    const position = getDeterministicVenuePosition(venue.community.id);
    let coverageStatus: 'complete' | 'partial' | 'unknown' = 'complete';

    if (!venue.coverage.complete) {
      coverageStatus = venue.coverage.policyVersion ? 'partial' : 'unknown';
    }

    // Fixed neutral baseline scale (1.0) so missing coverage does NOT imply a tiny venue.
    const buildingScale = 1.0;

    return {
      communityId: venue.community.id,
      name: venue.community.name,
      position,
      coverageStatus,
      buildingScale,
      isAccessibleDestination: true,
    };
  });
}

/**
 * Checks WebGL support safely and provides fallback state.
 */
export function checkWebGLAvailability(canvasContextMock?: unknown): boolean {
  if (canvasContextMock !== undefined) {
    return Boolean(canvasContextMock);
  }
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}
