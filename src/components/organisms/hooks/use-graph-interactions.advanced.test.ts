/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityGraphVertex } from '@/types/entity-graph';
import { EncounterType } from '@/types/entity-graph';

import { 
  useAdvancedGraphInteractions,
  WheelZoomConfig
} from './use-graph-interactions-advanced';

// Mock SVG element
class MockSVGSVGElement {
  clientWidth = 800;
  clientHeight = 600;
  
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      right: 800,
      bottom: 600,
    };
  }

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  getAttribute = vi.fn();
  setAttribute = vi.fn();
}

// Mock MouseEvent
function createMockMouseEvent(type: string, options: {
  clientX?: number;
  clientY?: number;
  button?: number;
  movementX?: number;
  movementY?: number;
}): React.MouseEvent {
  return {
    type,
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    button: options.button || 0,
    movementX: options.movementX || 0,
    movementY: options.movementY || 0,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: null,
    target: null,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    nativeEvent: {} as MouseEvent,
    timeStamp: Date.now(),
    isDefaultPrevented: vi.fn(() => false),
    isPropagationStopped: vi.fn(() => false),
    persist: vi.fn(),
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    getModifierState: vi.fn(() => false),
    detail: 0,
    view: null,
    pageX: options.clientX || 0,
    pageY: options.clientY || 0,
    screenX: options.clientX || 0,
    screenY: options.clientY || 0,
    buttons: options.button || 0,
    relatedTarget: null,
  } as unknown as React.MouseEvent;
}

// Mock Touch interface
interface MockTouch {
  clientX: number;
  clientY: number;
  identifier?: number;
  pageX?: number;
  pageY?: number;
  screenX?: number;
  screenY?: number;
  target?: EventTarget | null;
  force?: number;
  radiusX?: number;
  radiusY?: number;
  rotationAngle?: number;
}

function createMockTouch(options: { clientX: number; clientY: number }): MockTouch {
  return {
    clientX: options.clientX,
    clientY: options.clientY,
    identifier: 0,
    pageX: options.clientX,
    pageY: options.clientY,
    screenX: options.clientX,
    screenY: options.clientY,
    target: null,
    force: 1,
    radiusX: 10,
    radiusY: 10,
    rotationAngle: 0,
  };
}

// Mock vertices for testing
const mockVertices: EntityGraphVertex[] = [
  {
    id: 'vertex-1',
    displayName: 'Test Vertex 1',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-01T10:00:00Z',
    lastVisited: '2024-01-15T14:30:00Z',
    visitCount: 5,
    encounters: [
      {
        type: EncounterType.DIRECT_VISIT,
        timestamp: '2024-01-01T10:00:00Z',
        context: {}
      }
    ],
    encounterStats: {
      totalEncounters: 5,
      searchResultCount: 1,
      relatedEntityCount: 0,
      lastEncounter: '2024-01-15T14:30:00Z',
      firstSearchResult: '2024-01-01T10:00:00Z'
    },
    metadata: { citedByCount: 100, url: 'https://example.com/1' },
  },
  {
    id: 'vertex-2',
    displayName: 'Test Vertex 2',
    entityType: EntityType.AUTHOR,
    directlyVisited: false,
    firstSeen: '2024-01-02T11:00:00Z',
    visitCount: 0,
    encounters: [
      {
        type: EncounterType.RELATED_ENTITY,
        timestamp: '2024-01-02T11:00:00Z',
        context: { sourceEntityId: 'vertex-1' }
      }
    ],
    encounterStats: {
      totalEncounters: 1,
      searchResultCount: 0,
      relatedEntityCount: 1,
      lastEncounter: '2024-01-02T11:00:00Z',
      firstRelatedEntity: '2024-01-02T11:00:00Z'
    },
    metadata: { citedByCount: 50, url: 'https://example.com/2' },
  },
  {
    id: 'vertex-3',
    displayName: 'Test Vertex 3',
    entityType: EntityType.WORK,
    directlyVisited: true,
    firstSeen: '2024-01-03T12:00:00Z',
    lastVisited: '2024-01-10T16:45:00Z',
    visitCount: 2,
    encounters: [
      {
        type: EncounterType.SEARCH_RESULT,
        timestamp: '2024-01-03T12:00:00Z',
        context: { searchQuery: 'test query', position: 1 }
      },
      {
        type: EncounterType.DIRECT_VISIT,
        timestamp: '2024-01-10T16:45:00Z',
        context: {}
      }
    ],
    encounterStats: {
      totalEncounters: 2,
      searchResultCount: 1,
      relatedEntityCount: 0,
      lastEncounter: '2024-01-10T16:45:00Z',
      firstSearchResult: '2024-01-03T12:00:00Z'
    },
    metadata: { citedByCount: 200, url: 'https://example.com/3' },
  },
];

describe('useAdvancedGraphInteractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Interaction State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      expect(result.current.zoom).toBe(1);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
      expect(result.current.mode).toBe('navigate');
      expect(result.current.selectedVertices).toEqual([]);
      expect(result.current.selectionBox).toBeNull();
      expect(result.current.isDragging).toBe(false);
    });

    it('should handle zoom operations correctly', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      act(() => {
        result.current.handleZoomIn();
      });

      expect(result.current.zoom).toBeGreaterThan(1);

      act(() => {
        result.current.handleZoomOut();
      });

      // Should be back close to 1 but might have rounding differences
      expect(result.current.zoom).toBeCloseTo(1, 1);

      act(() => {
        result.current.handleZoomReset();
      });

      expect(result.current.zoom).toBe(1);
      expect(result.current.pan).toEqual({ x: 0, y: 0 });
    });

    it('should respect zoom limits', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        minZoom: 0.5,
        maxZoom: 2.0,
      }));

      // Test max zoom
      act(() => {
        result.current.setZoom(3.0);
      });
      expect(result.current.zoom).toBe(2.0);

      // Test min zoom
      act(() => {
        result.current.setZoom(0.1);
      });
      expect(result.current.zoom).toBe(0.5);
    });
  });

  describe('Wheel Zoom Functionality', () => {
    it('should handle wheel zoom events', () => {
      const mockSvgRef = { current: new MockSVGSVGElement() as any };
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        svgRef: mockSvgRef,
        enableWheelZoom: true,
      }));

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // Scroll up (zoom in)
        clientX: 400,
        clientY: 300,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(result.current.zoom).toBeGreaterThan(1);
    });

    it('should zoom towards cursor position', () => {
      const mockSvgRef = { current: new MockSVGSVGElement() as any };
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        svgRef: mockSvgRef,
        enableWheelZoom: true,
      }));

      const initialPan = { ...result.current.pan };

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 600, // Right side of canvas
        clientY: 450, // Bottom side of canvas
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      // Pan should change to keep zoom centered on cursor
      expect(result.current.pan).not.toEqual(initialPan);
    });

    it('should respect wheel zoom configuration', () => {
      const wheelConfig: WheelZoomConfig = {
        sensitivity: 0.001,
        minZoom: 0.1,
        maxZoom: 5.0,
        smoothing: true,
      };

      const mockSvgRef = { current: new MockSVGSVGElement() as any };
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        svgRef: mockSvgRef,
        enableWheelZoom: true,
        wheelZoomConfig: wheelConfig,
      }));

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -1000, // Large scroll
        clientX: 400,
        clientY: 300,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      // With low sensitivity, zoom should change less dramatically
      expect(result.current.zoom).toBeLessThan(2.0);
    });
  });

  describe('Selection Box Functionality', () => {
    it('should handle selection box creation', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      act(() => {
        result.current.setMode('select');
      });

      expect(result.current.mode).toBe('select');

      const mouseDownEvent = createMockMouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0,
      });

      act(() => {
        result.current.handleMouseDown(mouseDownEvent);
      });

      expect(result.current.selectionBox).toEqual({
        startX: 100,
        startY: 100,
        endX: 100,
        endY: 100,
        active: true,
      });
    });

    it('should update selection box during drag', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      act(() => {
        result.current.setMode('select');
      });

      // Start selection
      const mouseDownEvent = createMockMouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0,
      });

      act(() => {
        result.current.handleMouseDown(mouseDownEvent);
      });

      // Drag to expand selection box
      const mouseMoveEvent = createMockMouseEvent('mousemove', {
        clientX: 200,
        clientY: 150,
      });

      act(() => {
        result.current.handleMouseMove(mouseMoveEvent);
      });

      expect(result.current.selectionBox).toEqual({
        startX: 100,
        startY: 100,
        endX: 200,
        endY: 150,
        active: true,
      });
    });

    it('should select vertices within selection box', () => {
      const positionedVertices = mockVertices.map((vertex, index) => ({
        ...vertex,
        x: 50 + index * 100, // Position vertices at x: 50, 150, 250
        y: 50 + index * 50,  // Position vertices at y: 50, 100, 150
      }));

      const { result } = renderHook(() => useAdvancedGraphInteractions());

      act(() => {
        result.current.setMode('select');
      });

      // Start selection box that covers first two vertices
      act(() => {
        result.current.startSelectionBox(25, 25);
        result.current.updateSelectionBox(175, 125);
        result.current.endSelectionBox(positionedVertices);
      });

      expect(result.current.selectedVertices).toHaveLength(2);
      expect(result.current.selectedVertices).toContain('vertex-1');
      expect(result.current.selectedVertices).toContain('vertex-2');
      expect(result.current.selectedVertices).not.toContain('vertex-3');
    });
  });

  describe('Vertex Dragging', () => {
    it('should handle vertex drag start', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      const vertex = { ...mockVertices[0], x: 100, y: 100 };

      act(() => {
        result.current.startVertexDrag(vertex, { x: 100, y: 100 });
      });

      expect(result.current.dragState).toEqual({
        active: true,
        vertexId: 'vertex-1',
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 100, y: 100 },
        offset: { x: 0, y: 0 },
      });
    });

    it('should update vertex position during drag', () => {
      const onVertexPositionChange = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onVertexPositionChange,
      }));

      const vertex = { ...mockVertices[0], x: 100, y: 100 };

      act(() => {
        result.current.startVertexDrag(vertex, { x: 100, y: 100 });
        result.current.updateVertexDrag({ x: 150, y: 120 });
      });

      expect(onVertexPositionChange).toHaveBeenCalledWith('vertex-1', { x: 150, y: 120 });
      expect(result.current.dragState?.currentPosition).toEqual({ x: 150, y: 120 });
    });

    it('should end vertex drag and update final position', () => {
      const onVertexPositionChange = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onVertexPositionChange,
      }));

      const vertex = { ...mockVertices[0], x: 100, y: 100 };

      act(() => {
        result.current.startVertexDrag(vertex, { x: 100, y: 100 });
        result.current.updateVertexDrag({ x: 150, y: 120 });
        result.current.endVertexDrag();
      });

      expect(result.current.dragState).toBeNull();
      expect(onVertexPositionChange).toHaveBeenLastCalledWith('vertex-1', { x: 150, y: 120 });
    });

    it('should handle multi-vertex dragging', () => {
      const onVertexPositionChange = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onVertexPositionChange,
      }));

      // Select multiple vertices
      act(() => {
        result.current.setSelectedVertices(['vertex-1', 'vertex-2']);
      });

      const vertex = { ...mockVertices[0], x: 100, y: 100 };

      act(() => {
        result.current.startVertexDrag(vertex, { x: 100, y: 100 });
        result.current.updateVertexDrag({ x: 120, y: 130 });
      });

      // Should call position change for all selected vertices
      expect(onVertexPositionChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle escape key to reset interactions', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions());

      act(() => {
        result.current.setMode('select');
        result.current.setSelectedVertices(['vertex-1', 'vertex-2']);
      });

      act(() => {
        result.current.handleKeyPress('Escape');
      });

      expect(result.current.mode).toBe('navigate');
      expect(result.current.selectedVertices).toEqual([]);
      expect(result.current.selectionBox).toBeNull();
    });

    it('should handle delete key to remove selected vertices', () => {
      const onVerticesDelete = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onVerticesDelete,
      }));

      act(() => {
        result.current.setSelectedVertices(['vertex-1', 'vertex-2']);
        result.current.handleKeyPress('Delete');
      });

      expect(onVerticesDelete).toHaveBeenCalledWith(['vertex-1', 'vertex-2']);
    });

    it('should handle copy/paste operations', () => {
      const onVerticesCopy = vi.fn();
      const onVerticesPaste = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onVerticesCopy,
        onVerticesPaste,
      }));

      act(() => {
        result.current.setSelectedVertices(['vertex-1', 'vertex-2']);
        result.current.handleKeyPress('c', { ctrlKey: true });
      });

      expect(onVerticesCopy).toHaveBeenCalledWith(['vertex-1', 'vertex-2']);

      act(() => {
        result.current.handleKeyPress('v', { ctrlKey: true });
      });

      expect(onVerticesPaste).toHaveBeenCalled();
    });
  });

  describe('Touch/Mobile Interactions', () => {
    it('should handle pinch-to-zoom gestures', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        enableTouchInteractions: true,
      }));

      const touch1 = createMockTouch({ clientX: 100, clientY: 100 });
      const touch2 = createMockTouch({ clientX: 200, clientY: 200 });

      act(() => {
        result.current.handleTouchStart([touch1, touch2] as Touch[]);
      });

      // Simulate pinch out (zoom in)
      const newTouch1 = createMockTouch({ clientX: 80, clientY: 80 });
      const newTouch2 = createMockTouch({ clientX: 220, clientY: 220 });

      act(() => {
        result.current.handleTouchMove([newTouch1, newTouch2] as Touch[]);
      });

      expect(result.current.zoom).toBeGreaterThan(1);
    });

    it('should handle two-finger pan', () => {
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        enableTouchInteractions: true,
      }));

      const touch1 = createMockTouch({ clientX: 100, clientY: 100 });
      const touch2 = createMockTouch({ clientX: 200, clientY: 200 });

      act(() => {
        result.current.handleTouchStart([touch1, touch2] as Touch[]);
      });

      // Simulate pan (both fingers move in same direction)
      const newTouch1 = createMockTouch({ clientX: 120, clientY: 120 });
      const newTouch2 = createMockTouch({ clientX: 220, clientY: 220 });

      act(() => {
        result.current.handleTouchMove([newTouch1, newTouch2] as Touch[]);
      });

      expect(result.current.pan.x).toBeGreaterThan(0);
      expect(result.current.pan.y).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory', () => {
    it('should cleanup event listeners on unmount', () => {
      const mockSvgRef = { current: new MockSVGSVGElement() as any };
      const { unmount } = renderHook(() => useAdvancedGraphInteractions({
        svgRef: mockSvgRef,
        enableWheelZoom: true,
      }));

      unmount();

      expect(mockSvgRef.current.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    it('should throttle expensive operations', () => {
      const onViewportChange = vi.fn();
      const { result } = renderHook(() => useAdvancedGraphInteractions({
        onViewportChange,
        throttleMs: 50,
      }));

      // Rapid pan updates
      act(() => {
        result.current.setPan({ x: 10, y: 10 });
        result.current.setPan({ x: 20, y: 20 });
        result.current.setPan({ x: 30, y: 30 });
      });

      // Should be throttled
      expect(onViewportChange).toHaveBeenCalledTimes(1);
    });
  });
});