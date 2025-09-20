/**
 * Animated Graph Controls Component
 * Provides UI controls for animated force simulation
 */

import React from "react";
import {
	Stack,
	Group,
	Button,
	Progress,
	Text,
	Badge,
	Tooltip,
	Switch,
	NumberInput,
	Collapse,
	Card,
	Divider,
} from "@mantine/core";
import {
	IconPlayerPlay,
	IconPlayerPause,
	IconPlayerStop,
	IconRefresh,
	IconSettings,
	IconGraph,
	IconBolt,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
// Removed useAnimationConfig import to avoid infinite loop conflicts
import { logger } from "@/lib/logger";

interface AnimatedGraphControlsProps {
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
  containerDimensions?: { width: number; height: number };
  // Animation state props passed from parent
  isRunning?: boolean;
  isAnimating?: boolean;
  isPaused?: boolean;
  progress?: number;
  alpha?: number;
  iteration?: number;
  fps?: number;
  performanceStats?: {
    averageFPS: number;
    minFPS: number;
    maxFPS: number;
    frameCount: number;
  };
  isWorkerReady?: boolean;
  // Action props passed from parent
  applyLayout?: () => void;
  stopLayout?: () => void;
  pauseLayout?: () => void;
  resumeLayout?: () => void;
  restartLayout?: () => void;
  canPause?: boolean;
  canResume?: boolean;
  canStop?: boolean;
  canRestart?: boolean;
}

export const AnimatedGraphControls: React.FC<AnimatedGraphControlsProps> = ({
	enabled = true,
	// Animation state props
	isAnimating = false,
	isPaused = false,
	progress = 0,
	alpha = 1,
	iteration = 0,
	fps = 0,
	performanceStats = {
		averageFPS: 0,
		minFPS: Infinity,
		maxFPS: 0,
		frameCount: 0,
	},
	isWorkerReady = false,
	// Action props
	applyLayout = () => {},
	stopLayout = () => {},
	pauseLayout = () => {},
	resumeLayout = () => {},
	restartLayout = () => {},
	canPause = false,
	canResume = false,
	canStop = false,
	canRestart = false,
}) => {
	const [showSettings, { toggle: toggleSettings }] = useDisclosure(false);

	// Animation config is now handled entirely by parent component via useAnimatedLayout hook
	// No longer using useAnimationConfig() to avoid conflicts with prop-based state

	// Animation state and actions now come from props passed by parent

	const handleStartLayout = () => {
		logger.warn("graph", "TEMP DEBUG: User initiated animated layout", {
			enabled,
			isWorkerReady,
			isAnimating,
			applyLayoutExists: !!applyLayout
		});
		applyLayout();
	};

	// Configuration updates are now handled by parent component
	const handleConfigChange = (key: string, value: number) => {
		logger.debug("graph", "Animation config change requested (handled by parent)", { [key]: value });
	};

	const getStatusColor = () => {
		if (!isWorkerReady) return "gray";
		if (!enabled) return "gray";
		if (isAnimating && !isPaused) return "blue";
		if (isPaused) return "yellow";
		return "green";
	};

	const getStatusText = () => {
		if (!isWorkerReady) return "Worker Loading...";
		if (!enabled) return "Disabled";
		if (isAnimating && !isPaused) return "Animating";
		if (isPaused) return "Paused";
		return "Ready";
	};

	const formatFPS = (fps: number) => {
		if (fps === 0) return "--";
		return fps.toFixed(1);
	};

	return (
		<Card shadow="sm" padding="md" radius="md" withBorder>
			<Stack gap="sm">
				{/* Header */}
				<Group justify="space-between">
					<Group gap="xs">
						<IconGraph size={20} />
						<Text fw={500}>Animated Layout</Text>
						<Badge color={getStatusColor()} size="sm">
							{getStatusText()}
						</Badge>
					</Group>
					<Group gap="xs">
						<Switch
							size="sm"
							checked={true}
							onChange={() => { logger.debug("graph", "Animation toggle handled by parent"); }}
							label="Enable"
							disabled={!enabled}
						/>
						<Tooltip label="Settings">
							<Button
								variant="subtle"
								size="xs"
								onClick={toggleSettings}
								leftSection={<IconSettings size={14} />}
							>
                Settings
							</Button>
						</Tooltip>
					</Group>
				</Group>

				{/* Controls */}
				<Group grow>
					<Button
						leftSection={<IconPlayerPlay size={16} />}
						onClick={handleStartLayout}
						disabled={!enabled || !isWorkerReady || isAnimating}
						size="sm"
					>
            Start
					</Button>

					{canPause && (
						<Button
							leftSection={<IconPlayerPause size={16} />}
							onClick={pauseLayout}
							variant="outline"
							size="sm"
						>
              Pause
						</Button>
					)}

					{canResume && (
						<Button
							leftSection={<IconPlayerPlay size={16} />}
							onClick={resumeLayout}
							variant="outline"
							size="sm"
						>
              Resume
						</Button>
					)}

					{canStop && (
						<Button
							leftSection={<IconPlayerStop size={16} />}
							onClick={stopLayout}
							color="red"
							variant="outline"
							size="sm"
						>
              Stop
						</Button>
					)}

					{canRestart && (
						<Button
							leftSection={<IconRefresh size={16} />}
							onClick={restartLayout}
							variant="outline"
							size="sm"
						>
              Restart
						</Button>
					)}
				</Group>

				{/* Progress and Stats */}
				{(isAnimating || isPaused) && (
					<Stack gap="xs">
						<Progress
							value={progress * 100}
							size="lg"
							radius="md"
							animated={isAnimating && !isPaused}
							color={isPaused ? "yellow" : "blue"}
						/>
						<Group justify="space-between">
							<Text size="xs" c="dimmed">
                Iteration: {iteration.toLocaleString()}
							</Text>
							<Text size="xs" c="dimmed">
                Alpha: {alpha.toFixed(4)}
							</Text>
							<Text size="xs" c="dimmed">
                FPS: {formatFPS(fps)}
							</Text>
						</Group>
					</Stack>
				)}

				{/* Performance Stats */}
				{performanceStats.frameCount > 0 && (
					<Group justify="space-between">
						<Group gap="xs">
							<IconBolt size={14} />
							<Text size="xs" c="dimmed">
                Avg: {formatFPS(performanceStats.averageFPS)}
							</Text>
						</Group>
						<Text size="xs" c="dimmed">
              Min: {formatFPS(performanceStats.minFPS)} | Max: {formatFPS(performanceStats.maxFPS)}
						</Text>
					</Group>
				)}

				{/* Settings Panel */}
				<Collapse in={showSettings}>
					<Divider my="sm" />
					<Stack gap="sm">
						<Text size="sm" fw={500}>Animation Configuration</Text>

						<NumberInput
							label="Target FPS"
							description="Frames per second for animation"
							value={60}
							onChange={(value) => { handleConfigChange("targetFPS", Number(value) || 60); }}
							min={1}
							max={120}
							step={1}
							size="xs"
						/>

						<NumberInput
							label="Alpha Decay"
							description="How quickly the simulation cools down"
							value={0.02}
							onChange={(value) => { handleConfigChange("alphaDecay", Number(value) || 0.02); }}
							min={0.001}
							max={0.1}
							step={0.001}
							decimalScale={3}
							size="xs"
						/>

						<NumberInput
							label="Max Iterations"
							description="Maximum number of simulation steps"
							value={1000}
							onChange={(value) => { handleConfigChange("maxIterations", Number(value) || 1000); }}
							min={100}
							max={5000}
							step={100}
							size="xs"
						/>

						<Text size="xs" c="dimmed">
              Configuration is automatically optimized based on graph size.
              Small graphs use higher FPS and lower decay, large graphs use lower FPS and higher decay.
						</Text>
					</Stack>
				</Collapse>
			</Stack>
		</Card>
	);
};