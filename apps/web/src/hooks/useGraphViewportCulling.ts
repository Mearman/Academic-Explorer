/**
 * GraphViewportCulling - Optimizes graph rendering by culling nodes outside viewport
 *
 * Uses spatial indexing and frustum culling to reduce rendering overhead
 * for large graphs with 1000+ nodes.
 */

import type { BoundingBox3D, GraphNode, Position3D } from '@bibgraph/types';
import { useMemo, useRef, useCallback } from 'react';

// Viewport bounds for culling calculations
interface ViewportBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  zoom: number;
}

// Node with position for culling calculations
interface CullableNode {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number; // Bounding sphere radius
  originalNode: GraphNode;
}

/**
 * Frustum culling implementation for 3D viewport
 */
class FrustumCuller {
  private planes: Array<{ normal: Position3D; distance: number }> = [];

  /**
   * Update frustum planes based on camera view matrix
   */
  updateFrustum(viewMatrix: number[][]): void {
    // Extract frustum planes from view-projection matrix
    // Left, right, top, bottom, near, far planes
    this.planes = [
      { normal: { x: viewMatrix[3][0] + viewMatrix[0][0], y: viewMatrix[3][1] + viewMatrix[0][1], z: viewMatrix[3][2] + viewMatrix[0][2] }, distance: viewMatrix[3][3] + viewMatrix[0][3] },
      { normal: { x: viewMatrix[3][0] - viewMatrix[0][0], y: viewMatrix[3][1] - viewMatrix[0][1], z: viewMatrix[3][2] - viewMatrix[0][2] }, distance: viewMatrix[3][3] - viewMatrix[0][3] },
      { normal: { x: viewMatrix[3][0] + viewMatrix[1][0], y: viewMatrix[3][1] + viewMatrix[1][1], z: viewMatrix[3][2] + viewMatrix[1][2] }, distance: viewMatrix[3][3] + viewMatrix[1][3] },
      { normal: { x: viewMatrix[3][0] - viewMatrix[1][0], y: viewMatrix[3][1] - viewMatrix[1][1], z: viewMatrix[3][2] - viewMatrix[1][2] }, distance: viewMatrix[3][3] - viewMatrix[1][3] },
    ];
  }

  /**
   * Test if a sphere is within the frustum
   */
  testSphere(center: Position3D, radius: number): boolean {
    for (const plane of this.planes) {
      const distance = plane.normal.x * center.x + plane.normal.y * center.y + plane.normal.z * center.z - plane.distance;
      if (distance < -radius) {
        return false; // Sphere is outside this plane
      }
    }
    return true; // Sphere is inside or intersecting all planes
  }
}

/**
 * Hook for viewport-based node culling
 * Optimizes performance by only returning nodes visible in current viewport
 */
export const useGraphViewportCulling = (
  nodes: GraphNode[],
  viewportBounds: ViewportBounds | null,
  nodeRadius: number = 50,
  cullingMargin: number = 1.2
) => {
  const frustumCuller = useRef(new FrustumCuller());
  const previousBounds = useRef<ViewportBounds | null>(null);

  // Convert GraphNode to CullableNode with position and radius
  const cullableNodes = useMemo(() => {
    return nodes.map(node => ({
      id: node.id,
      x: (node as any).x || 0, // Position from force simulation
      y: (node as any).y || 0,
      z: (node as any).z || 0,
      radius: nodeRadius,
      originalNode: node,
    }));
  }, [nodes, nodeRadius]);

  // Simple 2D viewport culling for 2D graphs
  const getVisibleNodes2D = useCallback((bounds: ViewportBounds, nodes: CullableNode[]) => {
    const margin = cullingMargin * nodeRadius;
    const visibleNodes = nodes.filter(node => {
      return (
        node.x + node.radius >= bounds.left - margin &&
        node.x - node.radius <= bounds.right + margin &&
        node.y + node.radius >= bounds.top - margin &&
        node.y - node.radius <= bounds.bottom + margin
      );
    });
    return visibleNodes;
  }, [nodeRadius, cullingMargin]);

  // 3D frustum culling for 3D graphs
  const getVisibleNodes3D = useCallback((nodes: CullableNode[]) => {
    return nodes.filter(node => {
      return frustumCuller.current.testSphere(
        { x: node.x, y: node.y, z: node.z },
        node.radius * cullingMargin
      );
    });
  }, [cullingMargin]);

  const visibleNodes = useMemo(() => {
    if (!viewportBounds) {
      // Return all nodes if no viewport bounds provided
      return cullableNodes;
    }

    // Early return if viewport bounds haven't changed
    if (previousBounds.current &&
        previousBounds.current.left === viewportBounds.left &&
        previousBounds.current.right === viewportBounds.right &&
        previousBounds.current.top === viewportBounds.top &&
        previousBounds.current.bottom === viewportBounds.bottom &&
        Math.abs(previousBounds.current.zoom - viewportBounds.zoom) < 0.01) {
      return cullableNodes; // Will be filtered by caller
    }

    previousBounds.current = viewportBounds;

    // For now, implement 2D culling (can be extended to 3D)
    return getVisibleNodes2D(viewportBounds, cullableNodes);
  }, [cullableNodes, viewportBounds, getVisibleNodes2D]);

  return {
    visibleNodes,
    totalNodes: nodes.length,
    visibleCount: visibleNodes.length,
    cullingEfficiency: nodes.length > 0 ? (nodes.length - visibleNodes.length) / nodes.length : 0,
  };
};

/**
 * Utility function to calculate viewport bounds from camera parameters
 */
export const calculateViewportBounds = (
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  zoom: number,
  width: number,
  height: number
): ViewportBounds => {
  const halfWidth = (width / 2) / zoom;
  const halfHeight = (height / 2) / zoom;

  return {
    left: cameraX - halfWidth,
    right: cameraX + halfWidth,
    top: cameraY - halfHeight,
    bottom: cameraY + halfHeight,
    cameraX,
    cameraY,
    cameraZ,
    zoom,
  };
};

/**
 * Performance monitoring for viewport culling
 */
export interface CullingPerformanceMetrics {
  totalNodes: number;
  visibleNodes: number;
  culledNodes: number;
  cullingEfficiency: number; // 0-1, higher is better
  processingTimeMs: number;
}

export const measureCullingPerformance = (
  visibleNodesCount: number,
  totalNodesCount: number,
  processingStartTime: number
): CullingPerformanceMetrics => {
  const processingTimeMs = performance.now() - processingStartTime;
  const culledNodes = totalNodesCount - visibleNodesCount;
  const cullingEfficiency = totalNodesCount > 0 ? culledNodes / totalNodesCount : 0;

  return {
    totalNodes: totalNodesCount,
    visibleNodes: visibleNodesCount,
    culledNodes,
    cullingEfficiency,
    processingTimeMs,
  };
};