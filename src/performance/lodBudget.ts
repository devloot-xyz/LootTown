/**
 * LootTown Performance & Crowd Level-of-Detail (LOD) Visibility Budgets
 * Addresses Issue #17: Benchmark crowds and implement measured LOD/visibility budgets
 */

export type DeviceTier = 'desktop' | 'mid-mobile' | 'low-mobile';

export type LodLevel = 'HIGH' | 'MID' | 'LOW' | 'CULLED';

export interface DeviceBudgetConfig {
  maxVisibleCrowd: number;
  highLodDistance: number;
  midLodDistance: number;
  maxRenderDistance: number;
  tickRateHz: number;
  targetFrameTimeMs: number;
  allowSkeletalAnimation: boolean;
}

export const DEVICE_BUDGET_PROFILES: Record<DeviceTier, DeviceBudgetConfig> = {
  desktop: {
    maxVisibleCrowd: 400,
    highLodDistance: 25,
    midLodDistance: 60,
    maxRenderDistance: 120,
    tickRateHz: 60,
    targetFrameTimeMs: 16.67, // 60 FPS
    allowSkeletalAnimation: true,
  },
  'mid-mobile': {
    maxVisibleCrowd: 120,
    highLodDistance: 15,
    midLodDistance: 35,
    maxRenderDistance: 70,
    tickRateHz: 30,
    targetFrameTimeMs: 33.33, // 30 FPS
    allowSkeletalAnimation: true,
  },
  'low-mobile': {
    maxVisibleCrowd: 40,
    highLodDistance: 8,
    midLodDistance: 20,
    maxRenderDistance: 40,
    tickRateHz: 15,
    targetFrameTimeMs: 33.33, // 30 FPS
    allowSkeletalAnimation: false, // fallback to static billboard / impostor
  },
};

export interface CrowdMemberPosition {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface LodClassification {
  id: string;
  distance: number;
  lod: LodLevel;
  renderIndex: number;
}

export interface CrowdVisibilityAllocation {
  totalEntities: number;
  visibleCount: number;
  culledCount: number;
  highCount: number;
  midCount: number;
  lowCount: number;
  classifications: LodClassification[];
  sampleDisclosure: string;
}

/**
 * Calculates Euclidean distance between camera (cx, cy, cz) and entity (ex, ey, ez).
 */
export function calculateDistance(
  cx: number, cy: number, cz: number,
  ex: number, ey: number, ez: number
): number {
  const dx = cx - ex;
  const dy = cy - ey;
  const dz = cz - ez;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Evaluates crowd positions against a device profile and assigns LOD & Culling.
 * Invariant: Never drops or mutates underlying data, only calculates visibility & sample.
 */
export function evaluateCrowdVisibility(
  cameraPos: { x: number; y: number; z: number },
  crowd: CrowdMemberPosition[],
  deviceTier: DeviceTier = 'desktop'
): CrowdVisibilityAllocation {
  const profile = DEVICE_BUDGET_PROFILES[deviceTier];

  // Map entities with measured distances
  const withDistance = crowd.map((entity) => ({
    id: entity.id,
    distance: calculateDistance(
      cameraPos.x, cameraPos.y, cameraPos.z,
      entity.x, entity.y, entity.z
    ),
  }));

  // Sort by distance ascending (nearest entities get priority)
  withDistance.sort((a, b) => a.distance - b.distance);

  let highCount = 0;
  let midCount = 0;
  let lowCount = 0;
  let visibleCount = 0;
  let culledCount = 0;

  const classifications: LodClassification[] = [];

  for (let i = 0; i < withDistance.length; i++) {
    const item = withDistance[i];

    // Check distance culling
    if (item.distance > profile.maxRenderDistance || visibleCount >= profile.maxVisibleCrowd) {
      culledCount++;
      classifications.push({
        id: item.id,
        distance: item.distance,
        lod: 'CULLED',
        renderIndex: -1,
      });
      continue;
    }

    // Assign LOD based on distance thresholds
    let lod: LodLevel;
    if (item.distance <= profile.highLodDistance) {
      lod = 'HIGH';
      highCount++;
    } else if (item.distance <= profile.midLodDistance) {
      lod = 'MID';
      midCount++;
    } else {
      lod = 'LOW';
      lowCount++;
    }

    const renderIndex = visibleCount;
    visibleCount++;
    classifications.push({
      id: item.id,
      distance: item.distance,
      lod,
      renderIndex,
    });
  }

  const sampleDisclosure = `Showing ${visibleCount} of ${crowd.length} contributors (${deviceTier} budget cap: ${profile.maxVisibleCrowd})`;

  return {
    totalEntities: crowd.length,
    visibleCount,
    culledCount,
    highCount,
    midCount,
    lowCount,
    classifications,
    sampleDisclosure,
  };
}
