/**
 * Force Controls Component
 * Provides UI controls for adjusting D3 force simulation parameters
 */

import React, { useState } from "react";
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
import { useSetUseAnimatedLayout, useIsAnimating, useRequestRestart } from "@/stores/animated-graph-store";
import { useAnimatedLayoutContext } from "@/components/graph/animated-layout-context";
import { logger } from "@/lib/logger";

// Default force parameters (matching current hardcoded values)
export const DEFAULT_FORCE_PARAMS = {
	linkDistance: 100,
	linkStrength: 0.01,
	chargeStrength: -1000,
	centerStrength: 0.01,
	collisionRadius: 120,
	collisionStrength: 1.0,
	velocityDecay: 0.1,
	alphaDecay: 0.02,
};

// Parameter ranges and descriptions for UI controls
const FORCE_PARAM_CONFIG = {
	linkDistance: {
		min: 20,
		max: 300,
		step: 10,
		label: "Link Distance",
		description: "Distance between connected nodes",
		unit: "px",
	},
	linkStrength: {
		min: 0.001,
		max: 1.0,
		step: 0.001,
		label: "Link Strength",
		description: "Strength of connection forces",
		unit: "",
	},
	chargeStrength: {
		min: -3000,
		max: -100,
		step: 50,
		label: "Charge Strength",
		description: "Node repulsion force (negative = repel)",
		unit: "",
	},
	centerStrength: {
		min: 0,
		max: 0.1,
		step: 0.001,
		label: "Center Strength",
		description: "Force pulling nodes toward center",
		unit: "",
	},
	collisionRadius: {
		min: 30,
		max: 200,
		step: 5,
		label: "Collision Radius",
		description: "Node collision detection radius",
		unit: "px",
	},
	collisionStrength: {
		min: 0.1,
		max: 2.0,
		step: 0.1,
		label: "Collision Strength",
		description: "Strength of collision avoidance",
		unit: "",
	},
	velocityDecay: {
		min: 0.01,
		max: 0.5,
		step: 0.01,
		label: "Velocity Decay",
		description: "Movement dampening factor",
		unit: "",
	},
	alphaDecay: {
		min: 0.005,
		max: 0.1,
		step: 0.001,
		label: "Alpha Decay",
		description: "Animation decay rate",
		unit: "",
	},
} as const;

export type ForceParameters = typeof DEFAULT_FORCE_PARAMS;

export const ForceControls: React.FC = () => {
	const currentLayout = useGraphStore((state) => state.currentLayout);
	const setLayout = useGraphStore((state) => state.setLayout);
	const applyCurrentLayout = useGraphStore((state) => state.applyCurrentLayout);
	const setUseAnimatedLayout = useSetUseAnimatedLayout();
	const isAnimating = useIsAnimating();
	const requestRestart = useRequestRestart();

	// Try to get animation context if available
	let animationContext;
	try {
		animationContext = useAnimatedLayoutContext();
	} catch {
		// Not within AnimatedLayoutProvider - fallback to graph store
		animationContext = null;
	}

	// Initialize force parameters from current layout or defaults
	const [forceParams, setForceParams] = useState<ForceParameters>(() => {
		const current = currentLayout?.options || {};
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

	const handleParameterChange = <K extends keyof ForceParameters>(
		param: K,
		value: ForceParameters[K],
	) => {
		logger.info("graph", `Force parameter changed: ${param}`, { param, value });

		const newParams = { ...forceParams, [param]: value };
		setForceParams(newParams);

		// Update the current layout with new parameters
		if (currentLayout) {
			const updatedLayout = {
				...currentLayout,
				options: {
					...currentLayout.options,
					...newParams,
				},
			};

			setLayout(updatedLayout);

			// Always restart animation with new parameters (removes blocking for continuous adjustment)
			logger.info("graph", "Restarting animation with updated force parameter", {
				param,
				value,
				hasContext: !!animationContext,
				isWorkerReady: animationContext?.isWorkerReady ?? "unknown",
				isAnimating: animationContext?.isAnimating ?? isAnimating,
			});

			setUseAnimatedLayout(true);

			// Use context restartLayout if available, otherwise request restart via store
			if (animationContext?.restartLayout) {
				animationContext.restartLayout();
			} else {
				requestRestart();
			}
		}
	};

	const handleReset = () => {
		logger.info("graph", "Resetting force parameters to defaults");

		setForceParams(DEFAULT_FORCE_PARAMS);

		// Update the current layout with default parameters
		if (currentLayout) {
			const updatedLayout = {
				...currentLayout,
				options: {
					...currentLayout.options,
					...DEFAULT_FORCE_PARAMS,
				},
			};

			setLayout(updatedLayout);

			// Always restart animation with default parameters (removes blocking for continuous adjustment)
			logger.info("graph", "Restarting animation with default force parameters", {
				hasContext: !!animationContext,
				isWorkerReady: animationContext?.isWorkerReady ?? "unknown",
				isAnimating: animationContext?.isAnimating ?? isAnimating,
			});

			setUseAnimatedLayout(true);

			// Use context restartLayout if available, otherwise request restart via store
			if (animationContext?.restartLayout) {
				animationContext.restartLayout();
			} else {
				requestRestart();
			}
		}
	};

	// Only show if using D3 force layout
	if (currentLayout?.type !== "d3-force") {
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
								onChange={(value) => { handleParameterChange("linkDistance", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.linkDistance.min}
								max={FORCE_PARAM_CONFIG.linkDistance.max}
								step={FORCE_PARAM_CONFIG.linkDistance.step}
								value={forceParams.linkDistance}
								onChange={(value) => { handleParameterChange("linkDistance", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("linkStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.linkStrength.min}
								max={FORCE_PARAM_CONFIG.linkStrength.max}
								step={FORCE_PARAM_CONFIG.linkStrength.step}
								value={forceParams.linkStrength}
								onChange={(value) => { handleParameterChange("linkStrength", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("chargeStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.chargeStrength.min}
								max={FORCE_PARAM_CONFIG.chargeStrength.max}
								step={FORCE_PARAM_CONFIG.chargeStrength.step}
								value={forceParams.chargeStrength}
								onChange={(value) => { handleParameterChange("chargeStrength", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("centerStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.centerStrength.min}
								max={FORCE_PARAM_CONFIG.centerStrength.max}
								step={FORCE_PARAM_CONFIG.centerStrength.step}
								value={forceParams.centerStrength}
								onChange={(value) => { handleParameterChange("centerStrength", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("collisionRadius", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.collisionRadius.min}
								max={FORCE_PARAM_CONFIG.collisionRadius.max}
								step={FORCE_PARAM_CONFIG.collisionRadius.step}
								value={forceParams.collisionRadius}
								onChange={(value) => { handleParameterChange("collisionRadius", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("collisionStrength", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.collisionStrength.min}
								max={FORCE_PARAM_CONFIG.collisionStrength.max}
								step={FORCE_PARAM_CONFIG.collisionStrength.step}
								value={forceParams.collisionStrength}
								onChange={(value) => { handleParameterChange("collisionStrength", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("velocityDecay", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.velocityDecay.min}
								max={FORCE_PARAM_CONFIG.velocityDecay.max}
								step={FORCE_PARAM_CONFIG.velocityDecay.step}
								value={forceParams.velocityDecay}
								onChange={(value) => { handleParameterChange("velocityDecay", Number(value) || 0); }}
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
								onChange={(value) => { handleParameterChange("alphaDecay", value); }}
								size="sm"
							/>
							<NumberInput
								size="xs"
								w={70}
								min={FORCE_PARAM_CONFIG.alphaDecay.min}
								max={FORCE_PARAM_CONFIG.alphaDecay.max}
								step={FORCE_PARAM_CONFIG.alphaDecay.step}
								value={forceParams.alphaDecay}
								onChange={(value) => { handleParameterChange("alphaDecay", Number(value) || 0); }}
								decimalScale={3}
							/>
						</Group>
					</Stack>
				</Stack>
			</Stack>
		</Stack>
	);
};