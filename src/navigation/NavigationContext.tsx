import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  buildCanonicalUrl,
  NavigationState,
  NavigationTarget,
  parseNavigationUrl,
  resolveNavigationState,
  VenueLookup,
} from './url.ts';

interface NavigationContextValue {
  state: NavigationState;
  canonicalUrl: string;
  goToWorld: () => void;
  goToVenue: (communityId: number) => void;
  goToContributor: (communityId: number, contributorId: number) => void;
  copyShareLink: () => Promise<{ success: boolean; url: string }>;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export interface NavigationProviderProps {
  children: ReactNode;
  knownVenues?: VenueLookup[];
}

export function NavigationProvider({ children, knownVenues }: NavigationProviderProps) {
  // Read initial target from browser location
  const [target, setTarget] = useState<NavigationTarget>(() => {
    if (typeof window === 'undefined') {
      return { communityId: null, contributorId: null };
    }
    return parseNavigationUrl(window.location.search).target;
  });

  // Resolve target against known data with safety fallbacks
  const state = useMemo(() => {
    return resolveNavigationState(target, knownVenues);
  }, [target, knownVenues]);

  // Compute canonical URL for current state
  const canonicalUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return buildCanonicalUrl(
      {
        communityId: state.communityId,
        contributorId: state.contributorId,
      },
      origin,
    );
  }, [state.communityId, state.contributorId]);

  // Sync browser URL if a fallback was applied, replacing state to avoid duplicate history
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (state.isFallback) {
      const fallbackSearch = buildCanonicalUrl({
        communityId: state.communityId,
        contributorId: state.contributorId,
      });
      window.history.replaceState(null, '', fallbackSearch);
    }
  }, [state]);

  // Listen to popstate (back / forward browser buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const { target: newTarget } = parseNavigationUrl(window.location.search);
      setTarget(newTarget);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((nextTarget: NavigationTarget, replace = false) => {
    setTarget(nextTarget);

    if (typeof window !== 'undefined') {
      const search = buildCanonicalUrl({
        communityId: nextTarget.communityId,
        contributorId: nextTarget.contributorId,
      });

      if (replace) {
        window.history.replaceState(null, '', search);
      } else {
        window.history.pushState(null, '', search);
      }
    }
  }, []);

  const goToWorld = useCallback(() => {
    navigateTo({ communityId: null, contributorId: null });
  }, [navigateTo]);

  const goToVenue = useCallback((communityId: number) => {
    navigateTo({ communityId, contributorId: null });
  }, [navigateTo]);

  const goToContributor = useCallback((communityId: number, contributorId: number) => {
    navigateTo({ communityId, contributorId });
  }, [navigateTo]);

  const copyShareLink = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      return { success: false, url: canonicalUrl };
    }

    try {
      await navigator.clipboard.writeText(canonicalUrl);
      return { success: true, url: canonicalUrl };
    } catch {
      return { success: false, url: canonicalUrl };
    }
  }, [canonicalUrl]);

  const value = useMemo(
    () => ({
      state,
      canonicalUrl,
      goToWorld,
      goToVenue,
      goToContributor,
      copyShareLink,
    }),
    [state, canonicalUrl, goToWorld, goToVenue, goToContributor, copyShareLink],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
