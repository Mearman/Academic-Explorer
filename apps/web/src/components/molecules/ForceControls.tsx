/**
 * Force Controls Component
 * Provides UI controls for adjusting D3 force simulation parameters
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
	Stack,
	Text,
	Slider,
	NumberInput,
	Divider,
	Group,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import {
	IconRotateClockwise,
	IconInfoCircle,
} from "@tabler/icons-react";
import { useGraphStore } from "@/stores/graph-store";
import { AnimatedLayoutContext } from "@/components/graph/animated-layout-context";
import { useSetUseAnimatedLayout, useIsAnimating, useRequestRestart } from "@/stores/animated-graph-store";
import { logger } from "@academic-explorer/utils/logger";
import { DEFAULT_FORCE_PARAMS, FORCE_PARAM_CONFIG } from "@academic-explorer/graph";

// Local type for component state (allows for number mutations)
type ForceParameters = {
	linkDistance: number;
	linkStrength: number;
	chargeStrength: number;
	centerStrength: number;
	collisionRadius: number;
	collisionStrength: number;
	velocityDecay: number;
	alphaDecay: number;
};

// Debounce hook for parameter changes
const useDebouncedCallback = <T extends unknown[]>(
	callback: (...args: T) => void,
	delay: number
) => {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const debouncedCallback = useCallback((...args: T) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			callback(...args);
		}, delay);
	}, [callback, delay]);

	const cancelDebounce = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	useEffect(() => {
		return cancelDebounce;
	}, [cancelDebounce]);

	return { debouncedCallback, cancelDebounce };
};

// Constrain value to min/max bounds
const constrainValue = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
};

export const ForceControls: React.FC = () => {
	const currentLayout = useGraphStore((state) => state.currentLayout);
	const setLayout = useGraphStore((state) => state.setLayout);
	const setUseAnimatedLayout = useSetUseAnimatedLayout();
	const isAnimating = useIsAnimating();
	const requestRestart = useRequestRestart();

	// Get animation context - will be null if not within AnimatedLayoutProvider
	const animationContext = React.useContext(AnimatedLayoutContext);

	// Initialize force parameters from current layout or defaults
	const [forceParams, setForceParams] = useState<ForceParameters>(() => {
		const current = currentLayout.options ?? {};
		return {
			linkDistance: current.linkDistance ?? DEFAULT_FORCE_PARAMS.linkDistance,
			linkStrength: current.linkStrength ?? DEFAULT_FORCE_PARAMS.linkStrength,
			chargeStrength: current.chargeStrength ?? DEFAULT_FORCE_PARAMS.chargeStrength,
			centerStrength: current.centerStrength ?? DEFAULT_FORCE_PARAMS.centerStrength,
			collisionRadius: current.collisionRadius ?? DEFAULT_FORCE_PARAMS.collisionRadius,
			collisionStrength: current.collisionStrength ?? DEFAULT_FORCE_PARAMS.collisionStrength,
			velocityDecay: current.velocityDecay ?? DEFAULT_FORCE_PARAMS.velocityDecay,
			alphaDecay: current.alphaDecay ?? DEFAULT_FORCE_PARAMS.alphaDecay,
		};
	});

	// Immediate parameter change handler
	const handleParameterChangeImmediate = useCallback((
		param: keyof ForceParameters,
		value: number,
	) => {
		logger.debug("graph", `Force parameter changed: ${param}`, { param, value });

		// Update the current layout with new parameters
		const updatedLayout = {
			...currentLayout,
			options: {
				...currentLayout.options,
				[param]: value,
			},
		};

		setLayout(updatedLayout);

		// Check animation state - running vs paused vs stopped
		const isCurrentlyAnimating = animationContext?.isAnimating ?? isAnimating;
		const isCurrentlyPaused = animationContext?.isPaused ?? false;
		const isRunning = animationContext?.isRunning ?? false;

		if (isRunning && animationContext?.updateParameters) {
			// Animation is active (running or paused) - update parameters without restart
			logger.debug("graph", "Updating force parameters during active simulation", {
				param,
				value,
				isAnimating: isCurrentlyAnimating,
				isPaused: isCurrentlyPaused,
				isRunning,
			});

			animationContext.updateParameters({ [param]: value });
		} else {
			// Animation not active - start/restart animation with new parameters
			logger.debug("graph", "Starting animation with updated force parameter", {
				param,
				value,
				hasContext: !!animationContext,
				isWorkerReady: animationContext?.isWorkerReady ?? "unknown",
				isAnimating: isCurrentlyAnimating,
				isPaused: isCurrentlyPaused,
				isRunning,
			});

			setUseAnimatedLayout(true);

			// Use context restartLayout if available, otherwise request restart via store
			if (animationContext?.restartLayout) {
				animationContext.restartLayout();
			} else {
				requestRestart();
			}
		}
	}, [currentLayout, setLayout, animationContext, isAnimating, setUseAnimatedLayout, requestRestart]);

	// Debounced version for text inputs (500ms delay)
	const { debouncedCallback: debouncedParameterChange } = useDebouncedCallback(
		handleParameterChangeImmediate,
		500
	);

	// Immediate change handler for sliders (no debounce needed)
	const handleSliderChange = useCallback((
		param: keyof ForceParameters,
		value: number,
	) => {
		const config = FORCE_PARAM_CONFIG[param];
		const constrainedValue = constrainValue(value, config.min, config.max);

		// Update local state immediately for responsive UI
		setForceParams(prev => ({ ...prev, [param]: constrainedValue }));

		// Apply to simulation immediately (sliders are already constrained)
		handleParameterChangeImmediate(param, constrainedValue);
	}, [handleParameterChangeImmediate]);

	// Input change handler with validation and debouncing
	const handleInputChange = useCallback((
		param: keyof ForceParameters,
		value: string | number,
	) => {
		const numValue = typeof value === "string" ? parseFloat(value) : value;

		// Handle invalid inputs
		if (isNaN(numValue)) {
			logger.warn("graph", `Invalid input for param: ${String(value)}`);
			return;
		}

		const config = FORCE_PARAM_CONFIG[param];
		const constrainedValue = constrainValue(numValue, config.min, config.max);

		// Only update if the value actually changed after constraining
		if (constrainedValue !== numValue) {
			logger.debug("graph", `Constraining param from ${String(numValue)} to ${String(constrainedValue)}`, {
				param,
				originalValue: numValue,
				constrainedValue,
				min: config.min,
				max: config.max
			});
		}

		// Update local state immediately for responsive UI
		setForceParams(prev => ({ ...prev, [param]: constrainedValue }));

		// Debounced application to simulation
		debouncedParameterChange(param, constrainedValue);
	}, [debouncedParameterChange]);

	// Input blur handler to correct displayed values that are out of bounds
	const handleInputBlur = useCallback((
		param: keyof ForceParameters
	) => {
		const currentValue = forceParams[param];
		const config = FORCE_PARAM_CONFIG[param];
		const constrainedValue = constrainValue(currentValue, config.min, config.max);

		// If the displayed value is different from the constrained value, correct it
		if (constrainedValue !== currentValue) {
			logger.debug("graph", `Correcting param on blur from ${String(currentValue)} to ${String(constrainedValue)}`);
			setForceParams(prev => ({ ...prev, [param]: constrainedValue }));
			// Also immediately apply the corrected value
			handleParameterChangeImmediate(param, constrainedValue);
		}
	}, [forceParams, handleParameterChangeImmediate]);

	const handleReset = () => {
		logger.debug("graph", "Resetting force parameters to defaults");

		setForceParams(DEFAULT_FORCE_PARAMS);

		// Update the current layout with default parameters
		{
			const updatedLayout = {
				...currentLayout,
				options: {
					...currentLayout.options,
					...DEFAULT_FORCE_PARAMS,
				},
			};

			setLayout(updatedLayout);

			// Check animation state - running vs paused vs stopped
			const isCurrentlyAnimating = animationContext?.isAnimating ?? isAnimating;
			const isCurrentlyPaused = animationContext?.isPaused ?? false;
			const isRunning = animationContext?.isRunning ?? false;

			if (isRunning && animationContext?.updateParameters) {
				// Animation is active (running or paused) - update parameters without restart
				logger.debug("graph", "Updating force parameters to defaults during active simulation", {
					isAnimating: isCurrentlyAnimating,
					isPaused: isCurrentlyPaused,
					isRunning,
				});

				animationContext.updateParameters(DEFAULT_FORCE_PARAMS);
			} else {
				// Animation not active - start/restart animation with default parameters
				logger.debug("graph", "Starting animation with default force parameters", {
					hasContext: !!animationContext,
					isWorkerReady: animationContext?.isWorkerReady ?? "unknown",
					isAnimating: isCurrentlyAnimating,
					isPaused: isCurrentlyPaused,
					isRunning,
				});

				setUseAnimatedLayout(true);

				// Use context restartLayout if available, otherwise request restart via store
				if (animationContext?.restartLayout) {
					animationContext.restartLayout();
				} else {
					requestRestart();
				}
			}
		}
	};

	// Only show if using D3 force layout
	if (currentLayout.type !== "d3-force") {
		return (
			<Text size="sm" c="dimmed" style={{ fontStyle: "italic", textAlign: "center" }}>
				Force controls are only available when using D3 Force Layout
			</Text>
		);
	}

	return (
		<Stack gap="md">
			<Group justify="space-between">
				<Text size="sm" fw={500}>Force Parameters</Text>
				<Tooltip label="Reset to defaults">
					<ActionIcon
						variant="light"
						size="sm"
						onClick={handleReset}
					>
						<IconRotateClockwise size={14} />
					</ActionIcon>
				</Tooltip>
			</Group>

			<Stack gap="lg">
				{/* Link Forces */}
				<Stack gap="xs">
					<Text size="xs" fw={500} c="dimmed">LINK FORCES</Text>

					{/* Link Distance */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.linkDistance.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.linkDistance.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.linkDistance.min}
								max={FORCE_PARAM_CONFIG.linkDistance.max}
								step={FORCE_PARAM_CONFIG.linkDistance.step}
								value={forceParams.linkDistance}
								onChange={(value) => { handleSliderChange("linkDistance", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.linkDistance.min}
								max={FORCE_PARAM_CONFIG.linkDistance.max}
								step={FORCE_PARAM_CONFIG.linkDistance.step}
								value={forceParams.linkDistance}
								onChange={(value) => { handleInputChange("linkDistance", value || 0); }}
								onBlur={() => { handleInputBlur("linkDistance"); }}
								clampBehavior="strict"
							/>
						</Group>
					</Stack>

					{/* Link Strength */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.linkStrength.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.linkStrength.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.linkStrength.min}
								max={FORCE_PARAM_CONFIG.linkStrength.max}
								step={FORCE_PARAM_CONFIG.linkStrength.step}
								value={forceParams.linkStrength}
								onChange={(value) => { handleSliderChange("linkStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.linkStrength.min}
								max={FORCE_PARAM_CONFIG.linkStrength.max}
								step={FORCE_PARAM_CONFIG.linkStrength.step}
								value={forceParams.linkStrength}
								onChange={(value) => { handleInputChange("linkStrength", value || 0); }}
								onBlur={() => { handleInputBlur("linkStrength"); }}
								clampBehavior="strict"
								decimalScale={3}
							/>
						</Group>
					</Stack>
				</Stack>

				<Divider />

				{/* Node Forces */}
				<Stack gap="xs">
					<Text size="xs" fw={500} c="dimmed">NODE FORCES</Text>

					{/* Charge Strength */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.chargeStrength.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.chargeStrength.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.chargeStrength.min}
								max={FORCE_PARAM_CONFIG.chargeStrength.max}
								step={FORCE_PARAM_CONFIG.chargeStrength.step}
								value={forceParams.chargeStrength}
								onChange={(value) => { handleSliderChange("chargeStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.chargeStrength.min}
								max={FORCE_PARAM_CONFIG.chargeStrength.max}
								step={FORCE_PARAM_CONFIG.chargeStrength.step}
								value={forceParams.chargeStrength}
								onChange={(value) => { handleInputChange("chargeStrength", value || 0); }}
								onBlur={() => { handleInputBlur("chargeStrength"); }}
								clampBehavior="strict"
							/>
						</Group>
					</Stack>

					{/* Center Strength */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.centerStrength.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.centerStrength.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.centerStrength.min}
								max={FORCE_PARAM_CONFIG.centerStrength.max}
								step={FORCE_PARAM_CONFIG.centerStrength.step}
								value={forceParams.centerStrength}
								onChange={(value) => { handleSliderChange("centerStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.centerStrength.min}
								max={FORCE_PARAM_CONFIG.centerStrength.max}
								step={FORCE_PARAM_CONFIG.centerStrength.step}
								value={forceParams.centerStrength}
								onChange={(value) => { handleInputChange("centerStrength", value || 0); }}
								onBlur={() => { handleInputBlur("centerStrength"); }}
								clampBehavior="strict"
								decimalScale={3}
							/>
						</Group>
					</Stack>
				</Stack>

				<Divider />

				{/* Collision Forces */}
				<Stack gap="xs">
					<Text size="xs" fw={500} c="dimmed">COLLISION</Text>

					{/* Collision Radius */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.collisionRadius.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.collisionRadius.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.collisionRadius.min}
								max={FORCE_PARAM_CONFIG.collisionRadius.max}
								step={FORCE_PARAM_CONFIG.collisionRadius.step}
								value={forceParams.collisionRadius}
								onChange={(value) => { handleSliderChange("collisionRadius", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.collisionRadius.min}
								max={FORCE_PARAM_CONFIG.collisionRadius.max}
								step={FORCE_PARAM_CONFIG.collisionRadius.step}
								value={forceParams.collisionRadius}
								onChange={(value) => { handleInputChange("collisionRadius", value || 0); }}
								onBlur={() => { handleInputBlur("collisionRadius"); }}
								clampBehavior="strict"
							/>
						</Group>
					</Stack>

					{/* Collision Strength */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.collisionStrength.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.collisionStrength.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.collisionStrength.min}
								max={FORCE_PARAM_CONFIG.collisionStrength.max}
								step={FORCE_PARAM_CONFIG.collisionStrength.step}
								value={forceParams.collisionStrength}
								onChange={(value) => { handleSliderChange("collisionStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.collisionStrength.min}
								max={FORCE_PARAM_CONFIG.collisionStrength.max}
								step={FORCE_PARAM_CONFIG.collisionStrength.step}
								value={forceParams.collisionStrength}
								onChange={(value) => { handleInputChange("collisionStrength", value || 0); }}
								onBlur={() => { handleInputBlur("collisionStrength"); }}
								clampBehavior="strict"
								decimalScale={1}
							/>
						</Group>
					</Stack>
				</Stack>

				<Divider />

				{/* Animation Controls */}
				<Stack gap="xs">
					<Text size="xs" fw={500} c="dimmed">ANIMATION</Text>

					{/* Velocity Decay */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.velocityDecay.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.velocityDecay.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.velocityDecay.min}
								max={FORCE_PARAM_CONFIG.velocityDecay.max}
								step={FORCE_PARAM_CONFIG.velocityDecay.step}
								value={forceParams.velocityDecay}
								onChange={(value) => { handleSliderChange("velocityDecay", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.velocityDecay.min}
								max={FORCE_PARAM_CONFIG.velocityDecay.max}
								step={FORCE_PARAM_CONFIG.velocityDecay.step}
								value={forceParams.velocityDecay}
								onChange={(value) => { handleInputChange("velocityDecay", value || 0); }}
								onBlur={() => { handleInputBlur("velocityDecay"); }}
								clampBehavior="strict"
								decimalScale={2}
							/>
						</Group>
					</Stack>

					{/* Alpha Decay */}
					<Stack gap={4}>
						<Group gap="xs">
							<Text size="xs">{FORCE_PARAM_CONFIG.alphaDecay.label}</Text>
							<Tooltip label={FORCE_PARAM_CONFIG.alphaDecay.description}>
								<IconInfoCircle size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
							</Tooltip>
						</Group>
						<Group gap="md" align="center">
							<Slider
								style={{ flex: 1 }}
								min={FORCE_PARAM_CONFIG.alphaDecay.min}
								max={FORCE_PARAM_CONFIG.alphaDecay.max}
								step={FORCE_PARAM_CONFIG.alphaDecay.step}
								value={forceParams.alphaDecay}
								onChange={(value) => { handleSliderChange("alphaDecay", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.alphaDecay.min}
								max={FORCE_PARAM_CONFIG.alphaDecay.max}
								step={FORCE_PARAM_CONFIG.alphaDecay.step}
								value={forceParams.alphaDecay}
								onChange={(value) => { handleInputChange("alphaDecay", value || 0); }}
								onBlur={() => { handleInputBlur("alphaDecay"); }}
								clampBehavior="strict"
								decimalScale={3}
							/>
						</Group>
					</Stack>
				</Stack>
			</Stack>
		</Stack>
	);
};