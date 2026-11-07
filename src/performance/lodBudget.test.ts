import { describe, it, expect } from 'vitest';
import {
  evaluateCrowdVisibility,
  calculateDistance,
  DEVICE_BUDGET_PROFILES,
  type CrowdMemberPosition,
} from './lodBudget.js';
import {
  generateSyntheticCrowd,
  runCrowdBenchmark,
  generateFullBenchmarkSuite,
} from './crowdBenchmark.js';

describe('Performance LOD & Visibility Budgets (Issue #17)', () => {
  it('correctly calculates Euclidean 3D distance', () => {
    const dist = calculateDistance(0, 0, 0, 3, 4, 0);
    expect(dist).toBeCloseTo(5.0);
  });

  it('allocates HIGH, MID, LOW, and CULLED tiers based on distance', () => {
    const cameraPos = { x: 0, y: 0, z: 0 };
    const crowd: CrowdMemberPosition[] = [
      { id: 'near-1', x: 0, y: 0, z: 10 },    // dist 10 <= 25 (HIGH)
      { id: 'near-2', x: 0, y: 0, z: 20 },    // dist 20 <= 25 (HIGH)
      { id: 'mid-1', x: 0, y: 0, z: 45 },     // dist 45 <= 60 (MID)
      { id: 'far-1', x: 0, y: 0, z: 100 },    // dist 100 <= 120 (LOW)
      { id: 'out-1', x: 0, y: 0, z: 200 },    // dist 200 > 120 (CULLED)
    ];

    const result = evaluateCrowdVisibility(cameraPos, crowd, 'desktop');

    expect(result.totalEntities).toBe(5);
    expect(result.visibleCount).toBe(4);
    expect(result.culledCount).toBe(1);
    expect(result.highCount).toBe(2);
    expect(result.midCount).toBe(1);
    expect(result.lowCount).toBe(1);

    const nearItem = result.classifications.find((c) => c.id === 'near-1');
    expect(nearItem?.renderIndex).toBe(0);
    const farItem = result.classifications.find((c) => c.id === 'far-1');
    expect(farItem?.renderIndex).toBe(3);
    const culledItem = result.classifications.find((c) => c.id === 'out-1');
    expect(culledItem?.lod).toBe('CULLED');
    expect(culledItem?.renderIndex).toBe(-1);
  });

  it('enforces maximum visibility cap on lower device tiers', () => {
    const cameraPos = { x: 0, y: 0, z: 0 };
    // 60 people very close (distance 5)
    const crowd: CrowdMemberPosition[] = Array.from({ length: 60 }, (_, i) => ({
      id: `person-${i}`,
      x: 0,
      y: 0,
      z: 5,
    }));

    // low-mobile has cap of 40
    const result = evaluateCrowdVisibility(cameraPos, crowd, 'low-mobile');

    expect(result.totalEntities).toBe(60);
    expect(result.visibleCount).toBe(DEVICE_BUDGET_PROFILES['low-mobile'].maxVisibleCrowd);
    expect(result.visibleCount).toBe(40);
    expect(result.culledCount).toBe(20);
    expect(result.sampleDisclosure).toContain('Showing 40 of 60 contributors (low-mobile budget cap: 40)');
  });

  it('generates synthetic crowd deterministically', () => {
    const crowdA = generateSyntheticCrowd(50, 30);
    const crowdB = generateSyntheticCrowd(50, 30);

    expect(crowdA.length).toBe(50);
    expect(crowdA[0].id).toBe('contributor-1');
    expect(crowdA[10].x).toBeCloseTo(crowdB[10].x);
    expect(crowdA[10].z).toBeCloseTo(crowdB[10].z);
  });

  it('runs performance benchmark sweep without crashing and identifies sweep metrics', () => {
    const report = runCrowdBenchmark('mid-mobile', [10, 50, 150]);

    expect(report.deviceTier).toBe('mid-mobile');
    expect(report.sweepResults.length).toBe(3);

    const firstPoint = report.sweepResults[0];
    expect(firstPoint.crowdSize).toBe(10);
    expect(firstPoint.visibleCount).toBe(10);
    expect(firstPoint.estimatedFps).toBeGreaterThan(0);
    expect(firstPoint.simulatedFrameTimeMs).toBeGreaterThan(0);
  });

  it('generates full multi-tier benchmark suite', () => {
    const suite = generateFullBenchmarkSuite();

    expect(suite.desktop).toBeDefined();
    expect(suite['mid-mobile']).toBeDefined();
    expect(suite['low-mobile']).toBeDefined();
    expect(suite.desktop.sweepResults.length).toBeGreaterThan(0);
  });
});
