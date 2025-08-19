/**
 * Advanced graph interactions hook with enhanced features:
 * - Wheel zoom with configurable sensitivity
 * - Selection box for multi-select
 * - Vertex dragging with snapping
 * - Touch/mobile gesture support
 * - Keyboard shortcuts
 * - Performance optimizations
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

import type { EntityGraphVertex } from '@/types/entity-graph';

export type GraphInteractionMode = 'navigate' | 'select' | 'drag' | 'pan';

export interface Point {
  x: number;
  y: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export interface DragState {
  active: boolean;
  vertexId: string;
  startPosition: Point;
  currentPosition: Point;
  offset: Point;
}

export interface WheelZoomConfig {
  sensitivity: number;
  minZoom: number;
  maxZoom: number;
  smoothing: boolean;
}

export interface TouchState {
  active: boolean;
  touches: Touch[];
  initialDistance?: number;
  initialCenter?: Point;
  lastCenter?: Point;
}

export interface AdvancedGraphInteractionState {
  zoom: number;
  pan: Point;
  mode: GraphInteractionMode;
  selectedVertices: string[];
  selectionBox: SelectionBox | null;
  dragState: DragState | null;
  touchState: TouchState;
  isDragging: boolean;
  tooltip: {
    vertex: EntityGraphVertex;
    x: number;
    y: number;
  } | null;
}

export interface UseAdvancedGraphInteractionsOptions {
  svgRef?: React.RefObject<SVGSVGElement>;
  minZoom?: number;
  maxZoom?: number;
  enableWheelZoom?: boolean;
  enableTouchInteractions?: boolean;
  enableKeyboardShortcuts?: boolean;
  wheelZoomConfig?: Partial<WheelZoomConfig>;
  snapToGrid?: boolean;
  gridSize?: number;
  throttleMs?: number;
  onVertexPositionChange?: (vertexId: string, position: Point) => void;
  onSelectionChange?: (selectedVertices: string[]) => void;
  onModeChange?: (mode: GraphInteractionMode) => void;
  onViewportChange?: (zoom: number, pan: Point) => void;
  onVerticesDelete?: (vertexIds: string[]) => void;
  onVerticesCopy?: (vertexIds: string[]) => void;
  onVerticesPaste?: (position?: Point) => void;
}

export function useAdvancedGraphInteractions(
  options: UseAdvancedGraphInteractionsOptions = {}
) {
  const {
    svgRef,
    minZoom = 0.1,
    maxZoom = 5.0,
    enableWheelZoom = true,
    enableTouchInteractions = true,
    enableKeyboardShortcuts = true,
    wheelZoomConfig = {},
    snapToGrid = false,
    gridSize = 20,
    throttleMs = 16, // ~60fps
    onVertexPositionChange,
    onSelectionChange,
    onModeChange,
    onViewportChange,
    onVerticesDelete,
    onVerticesCopy,
    onVerticesPaste,
  } = options;

  const [state, setState] = useState<AdvancedGraphInteractionState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    mode: 'navigate',
    selectedVertices: [],
    selectionBox: null,
    dragState: null,
    touchState: { active: false, touches: [] },
    isDragging: false,
    tooltip: null,
  });

  // Throttled callback refs
  const throttledViewportChange = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastViewportCall = useRef<number>(0);

  // Wheel zoom configuration
  const wheelConfig: WheelZoomConfig = useMemo(() => ({
    sensitivity: 0.002,
    minZoom,
    maxZoom,
    smoothing: true,
    ...wheelZoomConfig,
  }), [wheelZoomConfig, minZoom, maxZoom]);

  // Utility functions
  const clampZoom = useCallback((zoom: number) => {
    return Math.max(wheelConfig.minZoom, Math.min(wheelConfig.maxZoom, zoom));
  }, [wheelConfig]);

  const snapToGridIfEnabled = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, [snapToGrid, gridSize]);

  const throttledCallback = useCallback((callback: () => void) => {
    const now = Date.now();
    if (now - lastViewportCall.current >= throttleMs) {
      callback();
      lastViewportCall.current = now;
    } else {
      if (throttledViewportChange.current) {
        clearTimeout(throttledViewportChange.current);
      }
      throttledViewportChange.current = setTimeout(callback, throttleMs);
    }
  }, [throttleMs]);

  // Basic zoom and pan controls
  const setZoom = useCallback((zoom: number) => {
    const clampedZoom = clampZoom(zoom);
    setState(prev => ({ ...prev, zoom: clampedZoom }));
    
    throttledCallback(() => {
      onViewportChange?.(clampedZoom, state.pan);
    });
  }, [clampZoom, state.pan, onViewportChange, throttledCallback]);

  const setPan = useCallback((pan: Point) => {
    setState(prev => ({ ...prev, pan }));
    
    throttledCallback(() => {
      onViewportChange?.(state.zoom, pan);
    });
  }, [state.zoom, onViewportChange, throttledCallback]);

  const handleZoomIn = useCallback(() => {
    setZoom(state.zoom * 1.2);
  }, [state.zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(state.zoom / 1.2);
  }, [state.zoom, setZoom]);

  const handleZoomReset = useCallback(() => {
    setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }));
    onViewportChange?.(1, { x: 0, y: 0 });
  }, [onViewportChange]);

  // Mode management
  const setMode = useCallback((mode: GraphInteractionMode) => {
    setState(prev => ({ ...prev, mode }));
    onModeChange?.(mode);
  }, [onModeChange]);

  // Selection management
  const setSelectedVertices = useCallback((vertexIds: string[]) => {
    setState(prev => ({ ...prev, selectedVertices: vertexIds }));
    onSelectionChange?.(vertexIds);
  }, [onSelectionChange]);

  const addToSelection = useCallback((vertexId: string) => {
    setState(prev => {
      const newSelection = prev.selectedVertices.includes(vertexId)
        ? prev.selectedVertices
        : [...prev.selectedVertices, vertexId];
      onSelectionChange?.(newSelection);
      return { ...prev, selectedVertices: newSelection };
    });
  }, [onSelectionChange]);

  const removeFromSelection = useCallback((vertexId: string) => {
    setState(prev => {
      const newSelection = prev.selectedVertices.filter(id => id !== vertexId);
      onSelectionChange?.(newSelection);
      return { ...prev, selectedVertices: newSelection };
    });
  }, [onSelectionChange]);

  const toggleSelection = useCallback((vertexId: string) => {
    if (state.selectedVertices.includes(vertexId)) {
      removeFromSelection(vertexId);
    } else {
      addToSelection(vertexId);
    }
  }, [state.selectedVertices, addToSelection, removeFromSelection]);

  // Wheel zoom functionality
  const handleWheelZoom = useCallback((event: WheelEvent) => {
    if (!enableWheelZoom || !svgRef?.current) return;

    event.preventDefault();

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const delta = -event.deltaY * wheelConfig.sensitivity;
    const newZoom = clampZoom(state.zoom * (1 + delta));
    const zoomRatio = newZoom / state.zoom;

    // Calculate new pan to zoom towards cursor
    const newPan = {
      x: state.pan.x - (mouseX - state.pan.x) * (zoomRatio - 1),
      y: state.pan.y - (mouseY - state.pan.y) * (zoomRatio - 1),
    };

    setState(prev => ({ ...prev, zoom: newZoom, pan: newPan }));
    
    throttledCallback(() => {
      onViewportChange?.(newZoom, newPan);
    });
  }, [enableWheelZoom, svgRef, wheelConfig, state.zoom, state.pan, clampZoom, onViewportChange, throttledCallback]);

  // Selection box functionality
  const startSelectionBox = useCallback((x: number, y: number) => {
    setState(prev => ({
      ...prev,
      selectionBox: {
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        active: true,
      },
    }));
  }, []);

  const updateSelectionBox = useCallback((x: number, y: number) => {
    setState(prev => {
      if (!prev.selectionBox) return prev;
      return {
        ...prev,
        selectionBox: {
          ...prev.selectionBox,
          endX: x,
          endY: y,
        },
      };
    });
  }, []);

  const endSelectionBox = useCallback((vertices: Array<EntityGraphVertex & Point>) => {
    if (!state.selectionBox) return;

    const { startX, startY, endX, endY } = state.selectionBox;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const selectedVertices = vertices
      .filter(vertex => 
        vertex.x >= minX && 
        vertex.x <= maxX && 
        vertex.y >= minY && 
        vertex.y <= maxY
      )
      .map(vertex => vertex.id);

    setState(prev => ({
      ...prev,
      selectionBox: null,
      selectedVertices,
    }));

    onSelectionChange?.(selectedVertices);
  }, [state.selectionBox, onSelectionChange]);

  // Vertex dragging functionality
  const startVertexDrag = useCallback((vertex: EntityGraphVertex & Point, mousePosition: Point) => {
    const offset = {
      x: mousePosition.x - vertex.x,
      y: mousePosition.y - vertex.y,
    };

    setState(prev => ({
      ...prev,
      dragState: {
        active: true,
        vertexId: vertex.id,
        startPosition: { x: vertex.x, y: vertex.y },
        currentPosition: { x: vertex.x, y: vertex.y },
        offset,
      },
      isDragging: true,
    }));
  }, []);

  const updateVertexDrag = useCallback((mousePosition: Point) => {
    if (!state.dragState) return;

    const newPosition = snapToGridIfEnabled({
      x: mousePosition.x - state.dragState.offset.x,
      y: mousePosition.y - state.dragState.offset.y,
    });

    setState(prev => ({
      ...prev,
      dragState: prev.dragState ? {
        ...prev.dragState,
        currentPosition: newPosition,
      } : null,
    }));

    // Update position for primary vertex
    onVertexPositionChange?.(state.dragState.vertexId, newPosition);

    // If multiple vertices are selected, move them all
    if (state.selectedVertices.length > 1 && state.selectedVertices.includes(state.dragState.vertexId)) {
      const deltaX = newPosition.x - state.dragState.startPosition.x;
      const deltaY = newPosition.y - state.dragState.startPosition.y;

      state.selectedVertices.forEach(vertexId => {
        if (vertexId !== state.dragState!.vertexId) {
          // Calculate new position for other selected vertices
          // This would need access to their current positions
          // For now, just notify that they should move by the same delta
          onVertexPositionChange?.(vertexId, { x: deltaX, y: deltaY });
        }
      });
    }
  }, [state.dragState, state.selectedVertices, snapToGridIfEnabled, onVertexPositionChange]);

  const endVertexDrag = useCallback(() => {
    if (!state.dragState) return;

    onVertexPositionChange?.(state.dragState.vertexId, state.dragState.currentPosition);

    setState(prev => ({
      ...prev,
      dragState: null,
      isDragging: false,
    }));
  }, [state.dragState, onVertexPositionChange]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const rect = svgRef?.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (state.mode === 'select') {
      startSelectionBox(x, y);
    } else if (state.mode === 'pan') {
      setState(prev => ({ ...prev, isDragging: true }));
    }
  }, [state.mode, svgRef, startSelectionBox]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = svgRef?.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (state.selectionBox?.active) {
      updateSelectionBox(x, y);
    } else if (state.dragState?.active) {
      updateVertexDrag({ x, y });
    } else if (state.isDragging && state.mode === 'pan') {
      // Pan the view
      const deltaX = event.movementX;
      const deltaY = event.movementY;
      setPan({
        x: state.pan.x + deltaX,
        y: state.pan.y + deltaY,
      });
    }
  }, [state.selectionBox, state.dragState, state.isDragging, state.mode, state.pan, svgRef, updateSelectionBox, updateVertexDrag, setPan]);

  const handleMouseUp = useCallback(() => {
    if (state.dragState?.active) {
      endVertexDrag();
    }

    setState(prev => ({
      ...prev,
      isDragging: false,
      selectionBox: prev.selectionBox?.active ? null : prev.selectionBox,
    }));
  }, [state.dragState, endVertexDrag]);

  // Touch event handlers
  const calculateTouchDistance = (touches: Touch[]): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateTouchCenter = (touches: Touch[]): Point => {
    const x = touches.reduce((sum, touch) => sum + touch.clientX, 0) / touches.length;
    const y = touches.reduce((sum, touch) => sum + touch.clientY, 0) / touches.length;
    return { x, y };
  };

  const handleTouchStart = useCallback((touches: Touch[]) => {
    if (!enableTouchInteractions) return;

    const center = calculateTouchCenter(touches);
    const distance = calculateTouchDistance(touches);

    setState(prev => ({
      ...prev,
      touchState: {
        active: true,
        touches: [...touches],
        initialDistance: distance,
        initialCenter: center,
        lastCenter: center,
      },
    }));
  }, [enableTouchInteractions]);

  const handleTouchMove = useCallback((touches: Touch[]) => {
    if (!enableTouchInteractions || !state.touchState.active) return;

    const center = calculateTouchCenter(touches);
    const distance = calculateTouchDistance(touches);

    if (touches.length === 2 && state.touchState.initialDistance) {
      // Pinch to zoom
      const scale = distance / state.touchState.initialDistance;
      const newZoom = clampZoom(state.zoom * scale);
      setZoom(newZoom);

      // Pan during zoom
      if (state.touchState.lastCenter) {
        const deltaX = center.x - state.touchState.lastCenter.x;
        const deltaY = center.y - state.touchState.lastCenter.y;
        setPan({
          x: state.pan.x + deltaX,
          y: state.pan.y + deltaY,
        });
      }
    }

    setState(prev => ({
      ...prev,
      touchState: {
        ...prev.touchState,
        touches: [...touches],
        lastCenter: center,
      },
    }));
  }, [enableTouchInteractions, state.touchState, state.zoom, state.pan, clampZoom, setZoom, setPan]);

  const handleTouchEnd = useCallback(() => {
    setState(prev => ({
      ...prev,
      touchState: { active: false, touches: [] },
    }));
  }, []);

  // Keyboard event handlers
  const handleKeyPress = useCallback((key: string, modifiers: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) => {
    if (!enableKeyboardShortcuts) return;

    switch (key) {
      case 'Escape':
        setState(prev => ({
          ...prev,
          mode: 'navigate',
          selectedVertices: [],
          selectionBox: null,
          dragState: null,
        }));
        break;

      case 'Delete':
      case 'Backspace':
        if (state.selectedVertices.length > 0) {
          onVerticesDelete?.(state.selectedVertices);
        }
        break;

      case 'c':
        if (modifiers.ctrlKey && state.selectedVertices.length > 0) {
          onVerticesCopy?.(state.selectedVertices);
        }
        break;

      case 'v':
        if (modifiers.ctrlKey) {
          onVerticesPaste?.(undefined);
        }
        break;

      case 'a':
        if (modifiers.ctrlKey) {
          // Select all - would need access to all vertices
        }
        break;

      case 's':
        if (!modifiers.ctrlKey) {
          setMode('select');
        }
        break;

      case 'd':
        if (!modifiers.ctrlKey) {
          setMode('drag');
        }
        break;

      case 'p':
        setMode('pan');
        break;

      case 'n':
        setMode('navigate');
        break;
    }
  }, [enableKeyboardShortcuts, state.selectedVertices, onVerticesDelete, onVerticesCopy, onVerticesPaste, setMode]);

  // Tooltip management
  const showTooltip = useCallback((vertex: EntityGraphVertex, x: number, y: number) => {
    setState(prev => ({ ...prev, tooltip: { vertex, x, y } }));
  }, []);

  const hideTooltip = useCallback(() => {
    setState(prev => ({ ...prev, tooltip: null }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    const svgElement = svgRef?.current;
    if (!svgElement || !enableWheelZoom) return;

    svgElement.addEventListener('wheel', handleWheelZoom, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', handleWheelZoom);
    };
  }, [svgRef, enableWheelZoom, handleWheelZoom]);

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key, {
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardShortcuts, handleKeyPress]);

  // Cleanup throttled callbacks
  useEffect(() => {
    return () => {
      if (throttledViewportChange.current) {
        clearTimeout(throttledViewportChange.current);
      }
    };
  }, []);

  return {
    // State
    zoom: state.zoom,
    pan: state.pan,
    mode: state.mode,
    selectedVertices: state.selectedVertices,
    selectionBox: state.selectionBox,
    dragState: state.dragState,
    isDragging: state.isDragging,
    tooltip: state.tooltip,

    // Basic controls
    setZoom,
    setPan,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,

    // Mode management
    setMode,

    // Selection management
    setSelectedVertices,
    addToSelection,
    removeFromSelection,
    toggleSelection,

    // Selection box
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,

    // Vertex dragging
    startVertexDrag,
    updateVertexDrag,
    endVertexDrag,

    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheelZoom,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyPress,

    // Tooltip
    showTooltip,
    hideTooltip,

    // Utility
    snapToGridIfEnabled,
    clampZoom,
  };
}