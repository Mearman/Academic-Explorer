/**
 * Tests for AnimatedLayoutProvider React 19 compatibility
 * Verifies that the component renders correctly and provides context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { AnimatedLayoutProvider } from "./AnimatedLayoutProvider";
import { useAnimatedLayoutContext } from "./animated-layout-context";

// Mock the animated graph store
vi.mock("@/stores/animated-graph-store", () => ({
	useAnimatedGraphStore: vi.fn(() => ({
		useAnimatedLayout: true,
	})),
	useRestartRequested: vi.fn(() => false),
	useClearRestartRequest: vi.fn(() => vi.fn()),
}));

// Mock the shared utils including logger and animated layout hook
vi.mock("@academic-explorer/utils", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
	useAnimatedLayout: vi.fn(() => ({
		isRunning: false,
		isAnimating: false,
		applyLayout: vi.fn(),
		isWorkerReady: true,
	})),
}));

// Test component that consumes the context
const TestConsumer = () => {
	const context = useAnimatedLayoutContext();
	return (
		<div>
			<span data-testid="is-running">{context.isRunning ? "running" : "not-running"}</span>
			<span data-testid="is-animating">{context.isAnimating ? "animating" : "not-animating"}</span>
			<span data-testid="worker-ready">{context.isWorkerReady ? "ready" : "not-ready"}</span>
			<span data-testid="use-animation">{context.useAnimation ? "enabled" : "disabled"}</span>
		</div>
	);
};

describe("AnimatedLayoutProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup(); // Clean up DOM between tests
	});

	it("should render children without errors", () => {
		render(
			<ReactFlowProvider>
				<AnimatedLayoutProvider>
					<div data-testid="child">Test Child</div>
				</AnimatedLayoutProvider>
			</ReactFlowProvider>
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
		expect(screen.getByTestId("child")).toHaveTextContent("Test Child");
	});

	it("should provide context values to children", () => {
		render(
			<ReactFlowProvider>
				<AnimatedLayoutProvider>
					<TestConsumer />
				</AnimatedLayoutProvider>
			</ReactFlowProvider>
		);

		expect(screen.getByTestId("is-running")).toHaveTextContent("not-running");
		expect(screen.getByTestId("is-animating")).toHaveTextContent("not-animating");
		expect(screen.getByTestId("worker-ready")).toHaveTextContent("ready");
		expect(screen.getByTestId("use-animation")).toHaveTextContent("enabled");
	});

	it("should handle disabled state correctly", () => {
		render(
			<ReactFlowProvider>
				<AnimatedLayoutProvider enabled={false}>
					<TestConsumer />
				</AnimatedLayoutProvider>
			</ReactFlowProvider>
		);

		// Context should still be provided even when disabled
		expect(screen.getByTestId("is-running")).toBeInTheDocument();
		expect(screen.getByTestId("is-animating")).toBeInTheDocument();
		expect(screen.getByTestId("worker-ready")).toBeInTheDocument();
		expect(screen.getByTestId("use-animation")).toBeInTheDocument();
	});

	it("should not crash when context consumer is outside provider", () => {
		// This should throw an error as expected by the context hook
		expect(() => {
			render(<TestConsumer />);
		}).toThrow("useAnimatedLayoutContext must be used within AnimatedLayoutProvider");
	});

	it("should handle props correctly", () => {
		const onLayoutChange = vi.fn();

		render(
			<ReactFlowProvider>
				<AnimatedLayoutProvider
					enabled={true}
					onLayoutChange={onLayoutChange}
					fitViewAfterLayout={false}
					autoStartOnNodeChange={true}
					containerDimensions={{ width: 800, height: 600 }}
				>
					<div data-testid="child">Test</div>
				</AnimatedLayoutProvider>
			</ReactFlowProvider>
		);

		expect(screen.getByTestId("child")).toBeInTheDocument();
	});
});