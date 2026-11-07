import { describe, expect, it, vi } from 'vitest';
import {
  DevLootHostBoundary,
  dispatchHostDelegatedClick,
  type HostDelegatedTarget,
} from './DevLootHostBoundary';

function createMockTarget(matches: Record<string, Record<string, string>>): HostDelegatedTarget {
  return {
    closest(selector: string) {
      const attrs = matches[selector];
      if (!attrs) return null;
      return {
        getAttribute(name: string) {
          return attrs[name] ?? null;
        },
      };
    },
  };
}

describe('DevLootHostBoundary', () => {
  it('exports a valid React function component for host embedding', () => {
    expect(typeof DevLootHostBoundary).toBe('function');
    expect(DevLootHostBoundary.name).toBe('DevLootHostBoundary');
  });

  it('dispatches community venue selection when clicking a venue element', () => {
    const onSelectCommunity = vi.fn();
    const target = createMockTarget({
      '[data-venue-id]': { 'data-venue-id': '42' },
    });

    dispatchHostDelegatedClick(target, { onSelectCommunity });
    expect(onSelectCommunity).toHaveBeenCalledTimes(1);
    expect(onSelectCommunity).toHaveBeenCalledWith(42);
  });

  it('prioritizes contributor person click over parent venue without double-firing venue callback', () => {
    const onSelectCommunity = vi.fn();
    const onSelectPerson = vi.fn();
    const target = createMockTarget({
      '[data-person-id]': { 'data-person-id': '1001' },
      '[data-venue-id]': { 'data-venue-id': '7' },
    });

    dispatchHostDelegatedClick(target, { onSelectCommunity, onSelectPerson });
    expect(onSelectPerson).toHaveBeenCalledTimes(1);
    expect(onSelectPerson).toHaveBeenCalledWith(7, 1001);
    expect(onSelectCommunity).not.toHaveBeenCalled();
  });

  it('prioritizes bounty card click over parent venue or person handlers', () => {
    const onSelectCommunity = vi.fn();
    const onSelectPerson = vi.fn();
    const onOpenBounty = vi.fn();
    const target = createMockTarget({
      '[data-bounty-id]': { 'data-bounty-id': '99' },
      '[data-venue-id]': { 'data-venue-id': '7' },
    });

    dispatchHostDelegatedClick(target, {
      onSelectCommunity,
      onSelectPerson,
      onOpenBounty,
    });
    expect(onOpenBounty).toHaveBeenCalledTimes(1);
    expect(onOpenBounty).toHaveBeenCalledWith(99);
    expect(onSelectPerson).not.toHaveBeenCalled();
    expect(onSelectCommunity).not.toHaveBeenCalled();
  });
});
