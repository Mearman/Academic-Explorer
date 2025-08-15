import { useRef, useState, useCallback } from 'react';

import type { EntityGraphVertex } from '@/types/entity-graph';

interface GraphInteractionState {
  zoom: number;
  pan: { x: number; y: number };
  tooltip: {
    vertex: EntityGraphVertex;
    x: number;
    y: number;
  } | null;
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

export function useGraphInteractions() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<GraphInteractionState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    tooltip: null,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
  });

  const handleZoomIn = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setState(prev => ({ ...prev, zoom: Math.max(0.3, prev.zoom / 1.2) }));
  }, []);

  const handleZoomReset = useCallback(() => {
    setState(prev => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }));
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === svgRef.current) {
      setState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: event.clientX - prev.pan.x, y: event.clientY - prev.pan.y },
      }));
    }
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setState(prev => {
      if (prev.isDragging) {
        return {
          ...prev,
          pan: {
            x: event.clientX - prev.dragStart.x,
            y: event.clientY - prev.dragStart.y,
          },
        };
      }
      return prev;
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const showTooltip = useCallback((vertex: EntityGraphVertex, x: number, y: number) => {
    setState(prev => ({ ...prev, tooltip: { vertex, x, y } }));
  }, []);

  const hideTooltip = useCallback(() => {
    setState(prev => ({ ...prev, tooltip: null }));
  }, []);

  return {
    svgRef,
    zoom: state.zoom,
    pan: state.pan,
    tooltip: state.tooltip,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    showTooltip,
    hideTooltip,
  };
}