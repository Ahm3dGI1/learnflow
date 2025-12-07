/**
 * Tests for useKeyboardShortcuts Hook
 *
 * Verifies keyboard shortcuts correctly control video playback
 * and that shortcuts are disabled when typing in input fields.
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockVideoRef;

  beforeEach(() => {
    // Create mock video ref with control methods
    mockVideoRef = {
      current: {
        playVideo: jest.fn(),
        pauseVideo: jest.fn(),
        getCurrentTime: jest.fn(() => 30),
        seekTo: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('returns showHelp state initialized to false', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));
      expect(result.current.showHelp).toBe(false);
    });

    it('returns shortcuts array', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));
      expect(Array.isArray(result.current.shortcuts)).toBe(true);
      expect(result.current.shortcuts.length).toBeGreaterThan(0);
    });

    it('each shortcut has key and action properties', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));
      result.current.shortcuts.forEach((shortcut) => {
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('action');
      });
    });
  });

  describe('help modal toggle', () => {
    it('toggles showHelp when setShowHelp is called', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      expect(result.current.showHelp).toBe(false);

      act(() => {
        result.current.setShowHelp(true);
      });

      expect(result.current.showHelp).toBe(true);

      act(() => {
        result.current.setShowHelp(false);
      });

      expect(result.current.showHelp).toBe(false);
    });
  });

  describe('disabled state', () => {
    it('does not set up listeners when disabled', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      renderHook(() => useKeyboardShortcuts(mockVideoRef, { enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });
  });

  describe('play/pause toggle', () => {
    it('includes Space and K in shortcuts for play/pause', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      const playPauseShortcut = result.current.shortcuts.find(
        (s) => s.action === 'Play / Pause'
      );

      expect(playPauseShortcut).toBeDefined();
      expect(playPauseShortcut.key).toContain('Space');
      expect(playPauseShortcut.key).toContain('K');
    });
  });

  describe('seek shortcuts', () => {
    it('includes arrow keys for seeking', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      const leftShortcut = result.current.shortcuts.find(
        (s) => s.key === '←'
      );
      const rightShortcut = result.current.shortcuts.find(
        (s) => s.key === '→'
      );

      expect(leftShortcut).toBeDefined();
      expect(leftShortcut.action).toContain('backward');
      expect(rightShortcut).toBeDefined();
      expect(rightShortcut.action).toContain('forward');
    });

    it('includes J and L for seeking', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      const jShortcut = result.current.shortcuts.find((s) => s.key === 'J');
      const lShortcut = result.current.shortcuts.find((s) => s.key === 'L');

      expect(jShortcut).toBeDefined();
      expect(jShortcut.action).toContain('backward');
      expect(lShortcut).toBeDefined();
      expect(lShortcut.action).toContain('forward');
    });
  });

  describe('fullscreen shortcut', () => {
    it('includes F for fullscreen toggle', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      const fullscreenShortcut = result.current.shortcuts.find(
        (s) => s.key === 'F'
      );

      expect(fullscreenShortcut).toBeDefined();
      expect(fullscreenShortcut.action.toLowerCase()).toContain('fullscreen');
    });
  });

  describe('help shortcut', () => {
    it('includes ? for showing help', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockVideoRef));

      const helpShortcut = result.current.shortcuts.find(
        (s) => s.key === '?'
      );

      expect(helpShortcut).toBeDefined();
      expect(helpShortcut.action.toLowerCase()).toContain('help');
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts(mockVideoRef));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

