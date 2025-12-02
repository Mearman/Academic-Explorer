/**
 * Hook for raycasting in 3D graph visualization.
 *
 * Provides utilities for converting screen coordinates to world positions
 * using Three.js Raycaster. Used by cursor-centered zoom to find the
 * world position under the cursor.
 */

import { useCallback, useRef } from 'react';
import * as THREE from 'three';

import { ZOOM_CONFIG } from '../components/graph/3d/zoom-config';

export interface UseGraphRaycasterOptions {
	/** Reference to the container element for bounds calculation */
	containerRef: React.RefObject<HTMLElement | null>;
	/** Function to get the current Three.js camera */
	getCamera: () => THREE.Camera | null;
	/** Function to get the current Three.js scene (optional, for node intersection) */
	getScene?: () => THREE.Scene | null;
}

export interface UseGraphRaycasterReturn {
	/**
	 * Get the world position at the cursor location.
	 * If scene is provided and cursor intersects geometry, returns intersection point.
	 * Otherwise, projects cursor onto a virtual plane at fallback distance.
	 */
	getWorldPositionAtCursor: (event: WheelEvent | MouseEvent) => THREE.Vector3 | null;

	/**
	 * Convert screen coordinates to normalized device coordinates (NDC).
	 * NDC range: x: [-1, 1], y: [-1, 1]
	 */
	screenToNDC: (clientX: number, clientY: number) => THREE.Vector2 | null;

	/**
	 * Get the ray direction from camera through cursor position.
	 */
	getRayDirection: (event: WheelEvent | MouseEvent) => THREE.Vector3 | null;
}

/**
 * Hook for raycasting operations in 3D graph visualization.
 *
 * Provides cursor-to-world coordinate conversion for cursor-centered zoom.
 * Reuses a single Raycaster instance for performance.
 */
export function useGraphRaycaster({
	containerRef,
	getCamera,
	getScene,
}: UseGraphRaycasterOptions): UseGraphRaycasterReturn {
	// Reuse raycaster instance for performance
	const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
	const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

	/**
	 * Convert screen coordinates to normalized device coordinates (NDC).
	 * NDC range: x: [-1, 1], y: [-1, 1] where (0,0) is center
	 */
	const screenToNDC = useCallback(
		(clientX: number, clientY: number): THREE.Vector2 | null => {
			const container = containerRef.current;
			if (!container) return null;

			const rect = container.getBoundingClientRect();

			// Check if cursor is within container bounds
			if (
				clientX < rect.left ||
				clientX > rect.right ||
				clientY < rect.top ||
				clientY > rect.bottom
			) {
				return null;
			}

			// Convert to NDC: [-1, 1] range
			const x = ((clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((clientY - rect.top) / rect.height) * 2 + 1; // Y is inverted in NDC

			mouseRef.current.set(x, y);
			return mouseRef.current;
		},
		[containerRef]
	);

	/**
	 * Get the ray direction from camera through cursor position.
	 */
	const getRayDirection = useCallback(
		(event: WheelEvent | MouseEvent): THREE.Vector3 | null => {
			const camera = getCamera();
			if (!camera) return null;

			const ndc = screenToNDC(event.clientX, event.clientY);
			if (!ndc) return null;

			// Set up raycaster from camera through cursor position
			raycasterRef.current.setFromCamera(ndc, camera);

			return raycasterRef.current.ray.direction.clone();
		},
		[getCamera, screenToNDC]
	);

	/**
	 * Get the world position at the cursor location.
	 *
	 * Strategy:
	 * 1. If scene provided, raycast against scene objects
	 * 2. If intersection found, return intersection point
	 * 3. Otherwise, project ray onto virtual plane at fallback distance
	 */
	const getWorldPositionAtCursor = useCallback(
		(event: WheelEvent | MouseEvent): THREE.Vector3 | null => {
			const camera = getCamera();
			if (!camera) return null;

			const ndc = screenToNDC(event.clientX, event.clientY);
			if (!ndc) return null;

			// Set up raycaster
			raycasterRef.current.setFromCamera(ndc, camera);

			// Try to intersect with scene objects if scene is available
			const scene = getScene?.();
			if (scene) {
				const intersects = raycasterRef.current.intersectObjects(scene.children, true);
				if (intersects.length > 0) {
					// Return the closest intersection point
					return intersects[0].point.clone();
				}
			}

			// Fallback: project cursor onto virtual plane at default distance
			// This ensures zoom always works even when cursor is over empty space
			const ray = raycasterRef.current.ray;
			const fallbackPoint = new THREE.Vector3();
			fallbackPoint.copy(ray.origin).add(
				ray.direction.clone().multiplyScalar(ZOOM_CONFIG.FALLBACK_INTERSECTION_DISTANCE)
			);

			return fallbackPoint;
		},
		[getCamera, getScene, screenToNDC]
	);

	return {
		getWorldPositionAtCursor,
		screenToNDC,
		getRayDirection,
	};
}
