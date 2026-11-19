import { describe, expect, test, vi } from 'vitest';
import { AudioConsentController, detectWebGLSupport, prefersReducedMotion } from './detector.ts';

describe('detectWebGLSupport', () => {
  test('returns true when webgl context is returned', () => {
    const fakeCanvas = {
      getContext: vi.fn((type: string) => {
        if (type === 'webgl2' || type === 'webgl') return {};
        return null;
      }),
    } as unknown as HTMLCanvasElement;

    expect(detectWebGLSupport(fakeCanvas)).toBe(true);
  });

  test('returns false when getContext throws or returns null', () => {
    const fakeCanvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    expect(detectWebGLSupport(fakeCanvas)).toBe(false);
  });

  test('returns false in headless environment without window', () => {
    expect(detectWebGLSupport(null)).toBe(false);
  });
});

describe('prefersReducedMotion', () => {
  test('respects matchMedia reduce preference', () => {
    const customMatcher = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
    }));

    expect(prefersReducedMotion(customMatcher)).toBe(true);
    expect(customMatcher).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  test('defaults to false when no reduced motion requested', () => {
    const customMatcher = vi.fn().mockImplementation(() => ({
      matches: false,
    }));

    expect(prefersReducedMotion(customMatcher)).toBe(false);
  });
});

describe('AudioConsentController', () => {
  test('initializes with audio disabled by default (no autoplay)', () => {
    const controller = new AudioConsentController();
    expect(controller.isAudioAllowed()).toBe(false);
  });

  test('allows audio only after explicit enable', () => {
    const controller = new AudioConsentController();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.enableAudio();
    expect(controller.isAudioAllowed()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);

    controller.muteAudio();
    expect(controller.isAudioAllowed()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);

    unsubscribe();
  });
});
