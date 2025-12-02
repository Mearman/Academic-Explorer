/**
 * Hook for cursor-centered zoom in 3D graph visualization.
 *
 * Intercepts wheel events and implements smooth zoom that centers on the
 * cursor position rather than the orbit center (default OrbitControls behavior).
 *
 * Features:
 * - Zooms toward/away from cursor position
 * - Falls back to virtual plane projection when cursor not over geometry
 * - Smooth 150ms animated transitions
 * - RAF throttling for performance
 * - Integrates with camera persistence system
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { useGraphRaycaster } from '../../../hooks/useGraphRaycaster';

import { ZOOM_CONFIG, ZOOM_FEATURE_FLAGS } from './zoom-config';

/**
 * Interface for OrbitControls-like objects.
 * We don't import from three/examples/jsm because it causes bundling issues.
 */
interface OrbitControlsLike {
	target: THREE.Vector3;
	enableZoom: boolean;
	update: () => void;
}

export interface UseCursorCenteredZoomOptions {
	/** Reference to the container element */
	containerRef: React.RefObject<HTMLElement | null>;
	/** Function to get the current Three.js camera */
	getCamera: () => THREE.Camera | null;
	/** Function to get OrbitControls instance */
	getControls: () => OrbitControlsLike | null;
	/** Function to get the Three.js scene (for node intersection) */
	getScene?: () => THREE.Scene | null;
	/** Whether cursor-centered zoom is enabled */
	enabled?: boolean;
	/** Callback when zoom distance changes (for camera persistence) */
	onZoomChange?: (distance: number, position: THREE.Vector3, target: THREE.Vector3) => void;
}

export interface UseCursorCenteredZoomReturn {
	/** Whether a zoom animation is currently in progress */
	isZooming: boolean;
	/** Current distance from camera to zoom target */
	currentZoomDistance: number;
}

/**
 * Custom hook for cursor-centered zoom behavior.
 *
 * Replaces OrbitControls' default zoom behavior with cursor-centered zoom.
 * The camera moves toward/away from the point under the cursor.
 */
export function useCursorCenteredZoom({
	containerRef,
	getCamera,
	getControls,
	getScene,
	enabled = true,
	onZoomChange,
}: UseCursorCenteredZoomOptions): UseCursorCenteredZoomReturn {
	const [isZooming, setIsZooming] = useState(false);
	const [currentZoomDistance, setCurrentZoomDistance] = useState<number>(ZOOM_CONFIG.FALLBACK_INTERSECTION_DISTANCE);

	// Animation state refs
	const animationFrameRef = useRef<number | null>(null);
	const accumulatedDeltaRef = useRef(0);
	const lastWheelTimeRef = useRef(0);

	// Get raycaster utilities
	const { getWorldPositionAtCursor } = useGraphRaycaster({
		containerRef,
		getCamera,
		getScene,
	});

	/**
	 * Animate camera to new position with smooth easing.
	 */
	const animateCameraTo = useCallback(
		(
			camera: THREE.Camera,
			controls: OrbitControlsLike,
			targetPosition: THREE.Vector3,
			targetLookAt: THREE.Vector3,
			duration: number
		) => {
			const startPosition = camera.position.clone();
			const startLookAt = controls.target.clone();
			const startTime = performance.now();

			const animate = () => {
				const elapsed = performance.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);

				// Ease-out cubic for smooth deceleration
				const eased = 1 - Math.pow(1 - progress, 3);

				// Interpolate camera position
				camera.position.lerpVectors(startPosition, targetPosition, eased);

				// Interpolate look-at target
				controls.target.lerpVectors(startLookAt, targetLookAt, eased);
				controls.update();

				if (progress < 1) {
					animationFrameRef.current = requestAnimationFrame(animate);
				} else {
					setIsZooming(false);

					// Notify about final position
					const distance = camera.position.distanceTo(controls.target);
					setCurrentZoomDistance(distance);
					onZoomChange?.(distance, camera.position.clone(), controls.target.clone());
				}
			};

			setIsZooming(true);
			animationFrameRef.current = requestAnimationFrame(animate);
		},
		[onZoomChange]
	);

	/**
	 * Apply accumulated zoom delta.
	 * Called via RAF to batch multiple wheel events.
	 */
	const applyZoom = useCallback(
		(event: WheelEvent) => {
			const camera = getCamera();
			const controls = getControls();

			if (!camera || !controls || !enabled) return;

			// Cancel any existing animation
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}

			// Get accumulated delta and reset
			const delta = accumulatedDeltaRef.current;
			accumulatedDeltaRef.current = 0;

			if (Math.abs(delta) < 0.001) return;

			// Get world position at cursor
			const worldPos = getWorldPositionAtCursor(event);
			if (!worldPos) {
				if (ZOOM_FEATURE_FLAGS.LOG_ZOOM_OPERATIONS) {
					console.log('[Zoom] No world position found, skipping zoom');
				}
				return;
			}

			// Calculate zoom factor (negative delta = zoom in, positive = zoom out)
			const zoomFactor = 1 + delta * ZOOM_CONFIG.WHEEL_ZOOM_SENSITIVITY;

			// Current distance from camera to zoom target
			const currentDistance = camera.position.distanceTo(worldPos);

			// New distance after zoom (clamped to limits)
			const newDistance = THREE.MathUtils.clamp(
				currentDistance * zoomFactor,
				ZOOM_CONFIG.MIN_ZOOM_DISTANCE,
				ZOOM_CONFIG.MAX_ZOOM_DISTANCE
			);

			// Skip if we're at the limit and trying to go further
			if (
				(newDistance === ZOOM_CONFIG.MIN_ZOOM_DISTANCE && zoomFactor < 1) ||
				(newDistance === ZOOM_CONFIG.MAX_ZOOM_DISTANCE && zoomFactor > 1)
			) {
				if (ZOOM_FEATURE_FLAGS.LOG_ZOOM_OPERATIONS) {
					console.log('[Zoom] At distance limit:', newDistance);
				}
				return;
			}

			// Calculate direction from zoom target to camera
			const direction = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();

			// Calculate new camera position
			const newCameraPosition = new THREE.Vector3()
				.copy(worldPos)
				.add(direction.multiplyScalar(newDistance));

			// Calculate how much the camera moves
			const cameraMovement = new THREE.Vector3().subVectors(newCameraPosition, camera.position);

			// Move the controls target by the same amount to maintain viewing direction
			const newTarget = new THREE.Vector3().copy(controls.target).add(cameraMovement);

			if (ZOOM_FEATURE_FLAGS.LOG_ZOOM_OPERATIONS) {
				console.log('[Zoom] Applying zoom:', {
					delta,
					currentDistance,
					newDistance,
					worldPos: worldPos.toArray(),
					newCameraPosition: newCameraPosition.toArray(),
				});
			}

			// Animate to new position
			if (ZOOM_CONFIG.ZOOM_ANIMATION_DURATION_MS > 0) {
				animateCameraTo(camera, controls, newCameraPosition, newTarget, ZOOM_CONFIG.ZOOM_ANIMATION_DURATION_MS);
			} else {
				// Instant zoom
				camera.position.copy(newCameraPosition);
				controls.target.copy(newTarget);
				controls.update();

				const distance = camera.position.distanceTo(controls.target);
				setCurrentZoomDistance(distance);
				onZoomChange?.(distance, camera.position.clone(), controls.target.clone());
			}
		},
		[enabled, getCamera, getControls, getWorldPositionAtCursor, animateCameraTo, onZoomChange]
	);

	/**
	 * Handle wheel events with RAF throttling.
	 */
	const handleWheel = useCallback(
		(event: WheelEvent) => {
			if (!enabled) return;

			// Prevent default scroll/zoom behavior
			event.preventDefault();
			event.stopPropagation();

			// Accumulate delta for RAF batching
			accumulatedDeltaRef.current += event.deltaY;

			// Store event for position calculation
			const now = performance.now();

			// Throttle RAF calls
			if (now - lastWheelTimeRef.current >= ZOOM_CONFIG.THROTTLE_INTERVAL_MS) {
				lastWheelTimeRef.current = now;
				// Apply zoom with the stored event
				applyZoom(event);
			}
		},
		[enabled, applyZoom]
	);

	// Disable OrbitControls zoom when custom zoom is enabled
	useEffect(() => {
		const controls = getControls();
		if (controls) {
			controls.enableZoom = !enabled;
		}

		return () => {
			// Re-enable OrbitControls zoom on cleanup
			const controls = getControls();
			if (controls) {
				controls.enableZoom = true;
			}
		};
	}, [enabled, getControls]);

	// Attach wheel event listener
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !enabled) return;

		// Use passive: false to allow preventDefault
		container.addEventListener('wheel', handleWheel, { passive: false });

		return () => {
			container.removeEventListener('wheel', handleWheel);

			// Cancel any pending animation
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
		};
	}, [containerRef, enabled, handleWheel]);

	return {
		isZooming,
		currentZoomDistance,
	};
}
