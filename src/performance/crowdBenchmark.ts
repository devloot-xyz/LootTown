/**
 * Crowd Performance Benchmark Runner for LootTown
 * Simulates frame time, draw calls, and crowd sweeps across desktop and mobile profiles.
 * Addresses Issue #17 Acceptance Criteria.
 */

import {
  evaluateCrowdVisibility,
  type CrowdMemberPosition,
  type DeviceTier,
  DEVICE_BUDGET_PROFILES,
} from './lodBudget.js';

export interface BenchmarkPoint {
  crowdSize: number;
  visibleCount: number;
  culledCount: number;
  highLodCount: number;
  midLodCount: number;
  lowLodCount: number;
  estimatedDrawCalls: number;
  simulatedFrameTimeMs: number;
  estimatedFps: number;
  kneeExceeded: boolean;
}

export interface DeviceBenchmarkReport {
  deviceTier: DeviceTier;
  sweepResults: BenchmarkPoint[];
  kneeCrowdSize: number | null;
  recommendedVisibilityCap: number;
  timestamp: string;
}

/**
 * Deterministically generates synthetic crowd member positions in a venue circle.
 */
export function generateSyntheticCrowd(count: number, radius = 50): CrowdMemberPosition[] {
  const members: CrowdMemberPosition[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const r = Math.sqrt((i + 1) / count) * radius;
    members.push({
      id: `contributor-${i + 1}`,
      x: Math.cos(theta) * r,
      y: 0,
      z: Math.sin(theta) * r,
    });
  }
  return members;
}

/**
 * Runs a performance sweep across varying crowd sizes for a specific device profile.
 */
export function runCrowdBenchmark(
  deviceTier: DeviceTier,
  sweepSizes: number[] = [10, 25, 50, 100, 200, 400, 800, 1500]
): DeviceBenchmarkReport {
  const profile = DEVICE_BUDGET_PROFILES[deviceTier];
  const cameraPos = { x: 0, y: 5, z: -15 };
  const sweepResults: BenchmarkPoint[] = [];

  let kneeCrowdSize: number | null = null;

  for (const size of sweepSizes) {
    const crowd = generateSyntheticCrowd(size);
    const allocation = evaluateCrowdVisibility(cameraPos, crowd, deviceTier);

    // Approximate draw calls:
    // HIGH lod: 3 draw calls (mesh, accessories, nametag)
    // MID lod: 2 draw calls (simplified mesh, nametag)
    // LOW lod: 1 draw call (impostor / low-poly)
    const drawCalls = (allocation.highCount * 3) + (allocation.midCount * 2) + (allocation.lowCount * 1);

    // Base overhead + cost per draw call + skeletal anim cost
    const baseOverheadMs = deviceTier === 'desktop' ? 2.5 : deviceTier === 'mid-mobile' ? 5.5 : 9.0;
    const perDrawCallMs = deviceTier === 'desktop' ? 0.015 : deviceTier === 'mid-mobile' ? 0.045 : 0.095;
    const animCostMs = profile.allowSkeletalAnimation ? (allocation.highCount * 0.02 + allocation.midCount * 0.008) : 0;

    const frameTimeMs = parseFloat((baseOverheadMs + (drawCalls * perDrawCallMs) + animCostMs).toFixed(2));
    const estimatedFps = Math.round(1000 / Math.max(frameTimeMs, 1));
    const kneeExceeded = frameTimeMs > profile.targetFrameTimeMs;

    if (kneeExceeded && kneeCrowdSize === null) {
      kneeCrowdSize = size;
    }

    sweepResults.push({
      crowdSize: size,
      visibleCount: allocation.visibleCount,
      culledCount: allocation.culledCount,
      highLodCount: allocation.highCount,
      midLodCount: allocation.midCount,
      lowLodCount: allocation.lowCount,
      estimatedDrawCalls: drawCalls,
      simulatedFrameTimeMs: frameTimeMs,
      estimatedFps,
      kneeExceeded,
    });
  }

  return {
    deviceTier,
    sweepResults,
    kneeCrowdSize,
    recommendedVisibilityCap: profile.maxVisibleCrowd,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Runs benchmarks across all tiers and generates markdown report.
 */
export function generateFullBenchmarkSuite(): Record<DeviceTier, DeviceBenchmarkReport> {
  return {
    desktop: runCrowdBenchmark('desktop'),
    'mid-mobile': runCrowdBenchmark('mid-mobile'),
    'low-mobile': runCrowdBenchmark('low-mobile'),
  };
}
