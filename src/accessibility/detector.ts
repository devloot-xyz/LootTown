/**
 * Utilities for detecting client capabilities, assistive technology settings,
 * and managing user-initiated media consents according to WCAG 2.1 AA guidelines.
 */

/**
 * Checks whether WebGL 1 or WebGL 2 rendering contexts are available in the current environment.
 * Gracefully returns false in headless, SSR, or WebGL-disabled environments without throwing.
 */
export function detectWebGLSupport(canvasOverride?: HTMLCanvasElement | null): boolean {
  if (canvasOverride) {
    try {
      const gl = canvasOverride.getContext('webgl2')
        || canvasOverride.getContext('webgl')
        || canvasOverride.getContext('experimental-webgl');
      return Boolean(gl);
    } catch {
      return false;
    }
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Checks whether the user has requested reduced motion via OS/browser preferences.
 */
export function prefersReducedMotion(mediaQueryFn?: (query: string) => { matches: boolean }): boolean {
  if (mediaQueryFn) {
    return Boolean(mediaQueryFn('(prefers-reduced-motion: reduce)')?.matches);
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Manages audio playback permissions.
 * Invariant: Audio MUST NEVER play automatically without explicit user consent.
 */
export class AudioConsentController {
  private allowed = false;
  private listeners = new Set<(allowed: boolean) => void>();

  public isAudioAllowed(): boolean {
    return this.allowed;
  }

  public enableAudio(): boolean {
    this.allowed = true;
    this.notify();
    return true;
  }

  public muteAudio(): void {
    this.allowed = false;
    this.notify();
  }

  public subscribe(callback: (allowed: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.allowed);
    }
  }
}
