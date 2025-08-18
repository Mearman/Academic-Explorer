import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { usePaneLayout } from './use-pane-layout';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('usePaneLayout Hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => usePaneLayout());

      expect(result.current.leftWidth).toBe(60);
      expect(result.current.rightWidth).toBe(40);
      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
      expect(result.current.isDragging).toBe(false);
    });

    test('should initialize with custom default split', () => {
      const { result } = renderHook(() => usePaneLayout({ defaultSplit: 70 }));

      expect(result.current.leftWidth).toBe(70);
      expect(result.current.rightWidth).toBe(30);
    });

    test('should restore state from localStorage when persistState is true', () => {
      const savedState = {
        leftWidth: 75,
        rightWidth: 25,
        leftCollapsed: true,
        rightCollapsed: false,
      };
      localStorageMock.setItem('pane-layout-test-key', JSON.stringify(savedState));

      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'test-key' 
        })
      );

      expect(result.current.leftWidth).toBe(75);
      expect(result.current.rightWidth).toBe(25);
      expect(result.current.leftCollapsed).toBe(true);
      expect(result.current.rightCollapsed).toBe(false);
    });

    test('should use default values when localStorage has invalid data', () => {
      localStorageMock.setItem('pane-layout-invalid', 'invalid-json');

      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'invalid',
          defaultSplit: 55
        })
      );

      expect(result.current.leftWidth).toBe(55);
      expect(result.current.rightWidth).toBe(45);
    });

    test('should not restore state when persistState is false', () => {
      const savedState = {
        leftWidth: 75,
        rightWidth: 25,
        leftCollapsed: true,
        rightCollapsed: false,
      };
      localStorageMock.setItem('pane-layout-no-persist', JSON.stringify(savedState));

      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: false, 
          stateKey: 'no-persist',
          defaultSplit: 60
        })
      );

      expect(result.current.leftWidth).toBe(60);
      expect(result.current.rightWidth).toBe(40);
    });
  });

  describe('Collapse/Expand Functionality', () => {
    test('should toggle left pane collapse', () => {
      const { result } = renderHook(() => usePaneLayout({ leftCollapsible: true }));

      expect(result.current.leftCollapsed).toBe(false);

      act(() => {
        result.current.toggleLeftPane();
      });

      expect(result.current.leftCollapsed).toBe(true);

      act(() => {
        result.current.toggleLeftPane();
      });

      expect(result.current.leftCollapsed).toBe(false);
    });

    test('should toggle right pane collapse', () => {
      const { result } = renderHook(() => usePaneLayout({ rightCollapsible: true }));

      expect(result.current.rightCollapsed).toBe(false);

      act(() => {
        result.current.toggleRightPane();
      });

      expect(result.current.rightCollapsed).toBe(true);

      act(() => {
        result.current.toggleRightPane();
      });

      expect(result.current.rightCollapsed).toBe(false);
    });

    test('should not collapse when collapsible is false', () => {
      const { result } = renderHook(() => 
        usePaneLayout({ 
          leftCollapsible: false,
          rightCollapsible: false 
        })
      );

      const initialLeftCollapsed = result.current.leftCollapsed;
      const initialRightCollapsed = result.current.rightCollapsed;

      act(() => {
        result.current.toggleLeftPane();
        result.current.toggleRightPane();
      });

      expect(result.current.leftCollapsed).toBe(initialLeftCollapsed);
      expect(result.current.rightCollapsed).toBe(initialRightCollapsed);
    });

    test('should ensure only one pane is collapsed at a time when expanding', () => {
      const { result } = renderHook(() => 
        usePaneLayout({ 
          leftCollapsible: true,
          rightCollapsible: true 
        })
      );

      // Collapse both panes
      act(() => {
        result.current.toggleLeftPane();
      });
      act(() => {
        result.current.toggleRightPane();
      });

      expect(result.current.leftCollapsed).toBe(true);
      expect(result.current.rightCollapsed).toBe(true);

      // Expand left pane - should also uncollapse right pane
      act(() => {
        result.current.toggleLeftPane();
      });

      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
    });
  });

  describe('Pane Sizing', () => {
    test('should set custom pane sizes', () => {
      const { result } = renderHook(() => usePaneLayout());

      act(() => {
        result.current.setPaneSizes(70, 30);
      });

      expect(result.current.leftWidth).toBe(70);
      expect(result.current.rightWidth).toBe(30);
      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
    });

    test('should normalize pane sizes when they do not sum to 100', () => {
      const { result } = renderHook(() => usePaneLayout());

      act(() => {
        result.current.setPaneSizes(80, 30); // Sum = 110
      });

      // Should normalize to maintain proportion but sum to 100
      expect(result.current.leftWidth).toBeCloseTo(72.73, 1); // 80/110 * 100
      expect(result.current.rightWidth).toBeCloseTo(27.27, 1); // 30/110 * 100
    });

    test('should clamp pane sizes to reasonable bounds', () => {
      const { result } = renderHook(() => usePaneLayout());

      act(() => {
        result.current.setPaneSizes(5, 95); // Too small left pane
      });

      expect(result.current.leftWidth).toBe(10); // Clamped to minimum 10%
      expect(result.current.rightWidth).toBe(90); // Adjusted accordingly

      act(() => {
        result.current.setPaneSizes(95, 5); // Too small right pane
      });

      expect(result.current.leftWidth).toBe(90); // Clamped to maximum 90%
      expect(result.current.rightWidth).toBe(10); // Adjusted accordingly
    });
  });

  describe('Drag Functionality', () => {
    test('should handle drag start and end', () => {
      const { result } = renderHook(() => usePaneLayout());

      expect(result.current.isDragging).toBe(false);

      act(() => {
        result.current.startDragging();
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.stopDragging();
      });

      expect(result.current.isDragging).toBe(false);
    });

    test('should handle drag movement with container rect', () => {
      const { result } = renderHook(() => usePaneLayout({ minPaneSize: 200 }));

      const mockRect: DOMRect = {
        left: 0,
        right: 1000,
        width: 1000,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      // Drag to 70% position (clientX = 700)
      act(() => {
        result.current.handleDrag(700, mockRect);
      });

      expect(result.current.leftWidth).toBe(70);
      expect(result.current.rightWidth).toBe(30);
      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
    });

    test('should respect minimum pane size during drag', () => {
      const { result } = renderHook(() => usePaneLayout({ minPaneSize: 300 }));

      const mockRect: DOMRect = {
        left: 0,
        right: 1000,
        width: 1000,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      // Try to drag to extreme left (clientX = 100)
      // Min pane size is 300px, so minimum percentage is 30%
      act(() => {
        result.current.handleDrag(100, mockRect);
      });

      expect(result.current.leftWidth).toBeGreaterThanOrEqual(30);

      // Try to drag to extreme right (clientX = 900)
      // Right pane should also respect minimum
      act(() => {
        result.current.handleDrag(900, mockRect);
      });

      expect(result.current.rightWidth).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Layout Reset', () => {
    test('should reset layout to defaults', () => {
      const { result } = renderHook(() => usePaneLayout({ defaultSplit: 55 }));

      // Change the layout
      act(() => {
        result.current.setPaneSizes(80, 20);
        result.current.toggleLeftPane();
        result.current.startDragging();
      });

      expect(result.current.leftWidth).toBe(80);
      expect(result.current.rightWidth).toBe(20);
      expect(result.current.leftCollapsed).toBe(true);
      expect(result.current.isDragging).toBe(true);

      // Reset layout
      act(() => {
        result.current.resetLayout();
      });

      expect(result.current.leftWidth).toBe(55);
      expect(result.current.rightWidth).toBe(45);
      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
      expect(result.current.isDragging).toBe(false);
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should toggle left pane with Cmd+[', () => {
      const { result } = renderHook(() => usePaneLayout({ leftCollapsible: true }));

      expect(result.current.leftCollapsed).toBe(false);

      // Simulate Cmd+[ keydown event
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[', metaKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.leftCollapsed).toBe(true);
    });

    test('should toggle right pane with Cmd+]', () => {
      const { result } = renderHook(() => usePaneLayout({ rightCollapsible: true }));

      expect(result.current.rightCollapsed).toBe(false);

      // Simulate Cmd+] keydown event
      act(() => {
        const event = new KeyboardEvent('keydown', { key: ']', metaKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.rightCollapsed).toBe(true);
    });

    test('should reset layout with Cmd+\\', () => {
      const { result } = renderHook(() => usePaneLayout({ defaultSplit: 65 }));

      // Change the layout
      act(() => {
        result.current.setPaneSizes(80, 20);
        result.current.toggleLeftPane();
      });

      expect(result.current.leftWidth).toBe(80);
      expect(result.current.leftCollapsed).toBe(true);

      // Simulate Cmd+\ keydown event
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '\\', metaKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.leftWidth).toBe(65);
      expect(result.current.rightWidth).toBe(35);
      expect(result.current.leftCollapsed).toBe(false);
      expect(result.current.rightCollapsed).toBe(false);
    });

    test('should work with Ctrl modifier', () => {
      const { result } = renderHook(() => usePaneLayout({ leftCollapsible: true }));

      expect(result.current.leftCollapsed).toBe(false);

      // Simulate Ctrl+[ keydown event
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '[', ctrlKey: true });
        window.dispatchEvent(event);
      });

      expect(result.current.leftCollapsed).toBe(true);
    });

    test('should ignore keyboard events without modifiers', () => {
      const { result } = renderHook(() => usePaneLayout({ leftCollapsible: true }));

      const initialState = {
        leftCollapsed: result.current.leftCollapsed,
        rightCollapsed: result.current.rightCollapsed,
        leftWidth: result.current.leftWidth,
        rightWidth: result.current.rightWidth,
      };

      // Simulate plain keydown events (no modifiers)
      act(() => {
        const events = [
          new KeyboardEvent('keydown', { key: '[' }),
          new KeyboardEvent('keydown', { key: ']' }),
          new KeyboardEvent('keydown', { key: '\\' }),
        ];
        events.forEach(event => window.dispatchEvent(event));
      });

      expect(result.current.leftCollapsed).toBe(initialState.leftCollapsed);
      expect(result.current.rightCollapsed).toBe(initialState.rightCollapsed);
      expect(result.current.leftWidth).toBe(initialState.leftWidth);
      expect(result.current.rightWidth).toBe(initialState.rightWidth);
    });
  });

  describe('State Persistence', () => {
    test('should persist state changes to localStorage', async () => {
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'persist-test' 
        })
      );

      act(() => {
        result.current.toggleLeftPane();
      });

      // Wait for debounced persistence (100ms debounce + buffer)
      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(
          'pane-layout-persist-test',
          expect.stringContaining('leftCollapsed')
        );
      }, { timeout: 200 });

      const savedData = JSON.parse(setItemSpy.mock.calls[0][1]);
      expect(savedData.leftCollapsed).toBe(true);
    });

    test('should debounce localStorage writes', async () => {
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'debounce-test' 
        })
      );

      // Make rapid changes
      act(() => {
        result.current.toggleLeftPane();
        result.current.toggleRightPane();
        result.current.setPaneSizes(70, 30);
      });

      // Should not persist immediately
      expect(setItemSpy).not.toHaveBeenCalled();

      // Wait for debounce timeout
      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 200 });
    });

    test('should not persist when persistState is false', async () => {
      const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
      
      const { result } = renderHook(() => 
        usePaneLayout({ 
          persistState: false, 
          stateKey: 'no-persist-test' 
        })
      );

      act(() => {
        result.current.toggleLeftPane();
      });

      // Wait to ensure no persistence
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(setItemSpy).not.toHaveBeenCalled();
    });

    test('should use unique storage keys', () => {
      const { result: result1 } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'unique-1' 
        })
      );

      const { result: result2 } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'unique-2' 
        })
      );

      act(() => {
        result1.current.toggleLeftPane();
      });

      act(() => {
        result2.current.toggleRightPane();
      });

      // Should not affect each other
      expect(result1.current.leftCollapsed).toBe(true);
      expect(result1.current.rightCollapsed).toBe(false);
      expect(result2.current.leftCollapsed).toBe(false);
      expect(result2.current.rightCollapsed).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => usePaneLayout());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should cleanup debounce timers on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { result, unmount } = renderHook(() => 
        usePaneLayout({ 
          persistState: true, 
          stateKey: 'cleanup-test' 
        })
      );

      act(() => {
        result.current.toggleLeftPane();
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle container rect with zero width', () => {
      const { result } = renderHook(() => usePaneLayout());

      const mockRect: DOMRect = {
        left: 0,
        right: 0,
        width: 0,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      expect(() => {
        act(() => {
          result.current.handleDrag(500, mockRect);
        });
      }).not.toThrow();
    });

    test('should handle very large container widths', () => {
      const { result } = renderHook(() => usePaneLayout({ minPaneSize: 300 }));

      const mockRect: DOMRect = {
        left: 0,
        right: 10000,
        width: 10000,
        height: 600,
        top: 0,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      };

      act(() => {
        result.current.handleDrag(7000, mockRect); // 70% position
      });

      expect(result.current.leftWidth).toBe(70);
      expect(result.current.rightWidth).toBe(30);
    });

    test('should handle negative client coordinates', () => {
      const { result } = renderHook(() => usePaneLayout());

      const mockRect: DOMRect = {
        left: 100,
        right: 1000,
        width: 900,
        height: 600,
        top: 0,
        bottom: 600,
        x: 100,
        y: 0,
        toJSON: () => {},
      };

      expect(() => {
        act(() => {
          result.current.handleDrag(-50, mockRect); // Negative clientX
        });
      }).not.toThrow();

      // Should clamp to minimum
      expect(result.current.leftWidth).toBeGreaterThanOrEqual(10);
    });
  });
});