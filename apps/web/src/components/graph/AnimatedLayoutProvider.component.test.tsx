/**
 * Tests for AnimatedLayoutProvider React 19 compatibility
 * Verifies that the component renders correctly and provides context
 */
/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock ResizeObserver before importing Mantine
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia before importing Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { cleanup, render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { AnimatedLayoutProvider } from "./AnimatedLayoutProvider";
import { useAnimatedLayoutContext } from "./animated-layout-context";

// Mock the animated graph store
vi.mock("@/stores/animated-graph-store", () => {
  const mockState = {
    useAnimatedLayout: true,
    animationHistory: [],
    restartRequested: false,
    isAnimating: false,
    isPaused: false,
    alpha: 1,
    iteration: 0,
    progress: 0,
    fps: 0,
    animatedPositions: {},
    staticPositions: {},
    _cachedAnimatedPositionsArray: [],
    _cachedStaticPositionsArray: [],
    animationConfig: {},
  };

  const mockDispatch = vi.fn();

  const mockContextValue = {
    state: mockState,
    dispatch: mockDispatch,
  };

  return {
    useAnimatedGraphStore: vi.fn(() => mockContextValue),
    useAnimatedGraphState: vi.fn(() => mockState),
    useAnimatedGraphActions: vi.fn(() => mockDispatch),
    useRestartRequested: vi.fn(() => false),
    useClearRestartRequest: vi.fn(() => vi.fn()),
  };
});

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

// Mock ReactFlow hooks
vi.mock("@xyflow/react", () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="@xyflow/react-provider">{children}</div>
  ),
  useReactFlow: vi.fn(() => ({
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
  })),
}));

// Mock unified event system
vi.mock("@/hooks/use-unified-event-system", () => ({
  useEventBus: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}));

// Mock unified execution worker
vi.mock("@/hooks/use-unified-execution-worker", () => ({
  useUnifiedExecutionWorker: vi.fn(() => ({
    animationState: {
      isRunning: false,
      isPaused: false,
      alpha: 1,
      iteration: 0,
      progress: 0,
      fps: 0,
      nodeCount: 0,
      linkCount: 0,
    },
    isWorkerReady: true,
    startAnimation: vi.fn(),
    stopAnimation: vi.fn(),
    pauseAnimation: vi.fn(),
    resumeAnimation: vi.fn(),
    reheatAnimation: vi.fn(),
    updateParameters: vi.fn(),
    canPause: false,
    canResume: false,
    canStop: false,
    isIdle: true,
  })),
}));

// Test component that consumes the context
const TestConsumer = () => {
  const context = useAnimatedLayoutContext();
  return (
    <div>
      <span data-testid="is-running">
        {context.isRunning ? "running" : "not-running"}
      </span>
      <span data-testid="is-animating">
        {context.isAnimating ? "animating" : "not-animating"}
      </span>
      <span data-testid="worker-ready">
        {context.isWorkerReady ? "ready" : "not-ready"}
      </span>
      <span data-testid="use-animation">
        {context.useAnimation ? "enabled" : "disabled"}
      </span>
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
      </ReactFlowProvider>,
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
      </ReactFlowProvider>,
    );

    expect(screen.getByTestId("is-running")).toHaveTextContent("not-running");
    expect(screen.getByTestId("is-animating")).toHaveTextContent(
      "not-animating",
    );
    expect(screen.getByTestId("worker-ready")).toHaveTextContent("ready");
    expect(screen.getByTestId("use-animation")).toHaveTextContent("enabled");
  });

  it("should handle disabled state correctly", () => {
    render(
      <ReactFlowProvider>
        <AnimatedLayoutProvider enabled={false}>
          <TestConsumer />
        </AnimatedLayoutProvider>
      </ReactFlowProvider>,
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
    }).toThrow(
      "useAnimatedLayoutContext must be used within AnimatedLayoutProvider",
    );
  });

  it("should handle props correctly", () => {
    const onLayoutChange = vi.fn();

    render(
      <ReactFlowProvider>
        <AnimatedLayoutProvider
          enabled={true}
          onLayoutChange={onLayoutChange}
          autoStartOnNodeChange={true}
          containerDimensions={{ width: 800, height: 600 }}
        >
          <div data-testid="child">Test</div>
        </AnimatedLayoutProvider>
      </ReactFlowProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
