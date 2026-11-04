import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface DevLootHostBridgeProps {
  /** Optional container element class */
  className?: string;
  /** Active host route or deep link handoff */
  route?: string;
  /** Callback fired when embedded view selects a community venue */
  onSelectCommunity?: (communityId: number) => void;
  /** Callback fired when a contributor person is clicked */
  onSelectPerson?: (communityId: number, githubId: number) => void;
  /** Callback fired when a public bounty card is opened */
  onOpenBounty?: (bountyId: number) => void;
  /** Callback receiving the active AbortSignal for route-scoped reads */
  onRouteSignal?: (signal: AbortSignal) => void;
  /** Fallback component rendered while assets load or on error */
  fallback?: ReactNode;
  children?: ReactNode;
}

export interface HostDelegatedTarget {
  closest: (selector: string) => { getAttribute: (name: string) => string | null } | null;
}

/**
 * Dispatches delegated host click events with strict specificity order:
 * bounty card -> contributor person -> community venue.
 * Prevents double-firing parent venue handlers when clicking nested person/bounty elements.
 */
export function dispatchHostDelegatedClick(
  target: HostDelegatedTarget | null,
  callbacks: Pick<DevLootHostBridgeProps, 'onSelectCommunity' | 'onSelectPerson' | 'onOpenBounty'>
): void {
  if (!target || typeof target.closest !== 'function') return;

  const bountyEl = target.closest('[data-bounty-id]');
  if (bountyEl) {
    if (callbacks.onOpenBounty) {
      const id = Number(bountyEl.getAttribute('data-bounty-id'));
      if (!Number.isNaN(id)) callbacks.onOpenBounty(id);
    }
    return;
  }

  const personEl = target.closest('[data-person-id]');
  if (personEl) {
    if (callbacks.onSelectPerson) {
      const id = Number(personEl.getAttribute('data-person-id'));
      const venueAncestor = target.closest('[data-venue-id]');
      const vId = Number(
        personEl.getAttribute('data-venue-id') ??
          venueAncestor?.getAttribute('data-venue-id') ??
          0
      );
      if (!Number.isNaN(id)) callbacks.onSelectPerson(Number.isNaN(vId) ? 0 : vId, id);
    }
    return;
  }

  const venueEl = target.closest('[data-venue-id]');
  if (venueEl && callbacks.onSelectCommunity) {
    const id = Number(venueEl.getAttribute('data-venue-id'));
    if (!Number.isNaN(id)) callbacks.onSelectCommunity(id);
  }
}

/**
 * DevLootHostBoundary
 *
 * Provides a resilient, leak-free React 18 integration boundary
 * ensuring clean unmounting of canvas renderers, window resize listeners,
 * animation frames, and active network controllers.
 */
export function DevLootHostBoundary({
  className,
  route = '/',
  onSelectCommunity,
  onSelectPerson,
  onOpenBounty,
  onRouteSignal,
  fallback = null,
  children,
}: DevLootHostBridgeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);

  // Track active teardown handles to prevent leaks during route transitions
  const abortControllerRef = useRef<AbortController | null>(null);
  const animFrameHandlesRef = useRef<Set<number>>(new Set());
  const eventListenersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (onRouteSignal) {
      onRouteSignal(controller.signal);
    }

    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.setAttribute(
          'data-host-viewport',
          `${window.innerWidth}x${window.innerHeight}`
        );
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    eventListenersRef.current.push(() => {
      window.removeEventListener('resize', handleResize);
    });

    const activeFrames = animFrameHandlesRef.current;

    return () => {
      // 1. Abort any in-flight reads
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // 2. Clear all animation frame loops
      for (const handle of activeFrames) {
        cancelAnimationFrame(handle);
      }
      activeFrames.clear();

      // 3. Remove all attached host event listeners
      for (const cleanup of eventListenersRef.current) {
        cleanup();
      }
      eventListenersRef.current = [];

      // 4. Detach canvas references safely
      if (containerRef.current) {
        const canvases = containerRef.current.querySelectorAll('canvas');
        canvases.forEach((c) => {
          c.width = 0;
          c.height = 0;
        });
      }
    };
  }, [route, onRouteSignal]);

  if (hasError) {
    return (
      <div className={`loottown-host-error ${className ?? ''}`} role="alert">
        <p>Unable to load world view inside DevLoot host.</p>
        <button type="button" onClick={() => setHasError(false)}>Retry</button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`loottown-host-container ${className ?? ''}`}
      data-loottown-route={route}
      data-testid="loottown-host-boundary"
      onClick={(e) => {
        dispatchHostDelegatedClick(e.target as unknown as HostDelegatedTarget, {
          onSelectCommunity,
          onSelectPerson,
          onOpenBounty,
        });
      }}
    >
      {children || fallback}
    </div>
  );
}
