/**
 * Unified Execution Integration Tests
 * Tests the complete integration of both worker and non-worker execution paths
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnifiedExecutionWorker } from "../hooks/use-unified-execution-worker";
import type { ForceSimulationNode } from "@academic-explorer/graph";
import type { SimulationLink } from "@academic-explorer/simulation";

// Mock the logger to avoid console output during tests
vi.mock("@academic-explorer/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe.skip("useUnifiedExecutionWorker Integration", () => {
  const createTestNodes = (): ForceSimulationNode[] => [
    { id: "node1", x: 0, y: 0 },
    { id: "node2", x: 100, y: 100 },
  ];

  const createTestLinks = (): SimulationLink[] => [
    { id: "link1", source: "node1", target: "node2" },
  ];

  describe("Main Thread Execution", () => {
    it.skip("should initialize with main thread execution", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isInitialized()).toBe(true);
      expect(result.current.isUsingWorkers()).toBe(false);
      expect(result.current.getExecutionMode()).toBe("main-thread");
    });

    it.skip("should start and complete animation on main thread", async () => {
      const onPositionUpdate = vi.fn();
      const onAnimationComplete = vi.fn();

      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
          onPositionUpdate,
          onAnimationComplete,
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isInitialized()).toBe(true);

      // Start animation
      let taskId: string | null = null;
      await act(async () => {
        taskId =
          (await result.current.startAnimation({
            nodes: createTestNodes(),
            links: createTestLinks(),
          })) || null;
      });

      expect(taskId).toBeTruthy();
      expect(result.current.animationState.isRunning).toBe(true);

      // Wait for some progress updates
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Should have received position updates
      expect(onPositionUpdate).toHaveBeenCalled();
      expect(result.current.nodePositions.length).toBe(2);

      // Eventually animation should complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      expect(onAnimationComplete).toHaveBeenCalled();
    });

    it("should handle animation controls on main thread", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);
      expect(result.current.canPause).toBe(true);

      // Pause animation
      await act(async () => {
        await result.current.pauseAnimation();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.animationState.isPaused).toBe(true);
      expect(result.current.canResume).toBe(true);

      // Resume animation
      await act(async () => {
        await result.current.resumeAnimation();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.animationState.isPaused).toBe(false);

      // Stop animation
      await act(async () => {
        await result.current.stopAnimation();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.animationState.isRunning).toBe(false);
    });

    it("should handle dynamic updates on main thread", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);

      // Update links
      const newLinks: SimulationLink[] = [
        { id: "link1", source: "node1", target: "node2" },
        { id: "link2", source: "node2", target: "node1" },
      ];

      await act(async () => {
        await result.current.updateSimulationLinks({
          links: newLinks,
          alpha: 0.5,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Update nodes
      const newNodes: ForceSimulationNode[] = [
        ...createTestNodes(),
        { id: "node3", x: 50, y: 50 },
      ];

      await act(async () => {
        await result.current.updateSimulationNodes({
          nodes: newNodes,
          pinnedNodes: ["node1"],
          alpha: 0.7,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.animationState.isRunning).toBe(true);
    });

    it("should handle reheat operation on main thread", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start initial animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      // Wait a bit for simulation to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Reheat with new configuration
      await act(async () => {
        await result.current.reheatAnimation({
          nodes: [...createTestNodes(), { id: "node3", x: 150, y: 150 }],
          links: [
            ...createTestLinks(),
            { id: "link2", source: "node1", target: "node3" },
          ],
          alpha: 0.8,
          pinnedNodes: new Set(["node1"]),
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.animationState.isRunning).toBe(true);
    });

    it("should provide correct performance metrics", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      // Wait for some simulation progress
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      const metrics = result.current.performanceMetrics;
      expect(metrics.frameCount).toBeGreaterThan(0);
      expect(metrics.totalAnimationTime).toBeGreaterThan(0);

      const insights = result.current.performanceInsights;
      expect(typeof insights.isOptimal).toBe("boolean");
      expect(typeof insights.hasFrameDrops).toBe("boolean");
      expect(typeof insights.efficiency).toBe("number");
    });

    it("should handle cleanup properly", async () => {
      const { result, unmount } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);

      // Terminate and unmount
      await act(async () => {
        result.current.terminate();
      });

      unmount();

      // Should handle cleanup gracefully
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe("Auto Mode Execution", () => {
    it("should automatically select appropriate execution mode", async () => {
      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "auto",
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(result.current.isInitialized()).toBe(true);

      // Should have selected an execution mode
      const mode = result.current.getExecutionMode();
      expect(["worker", "main-thread"]).toContain(mode);
    });

    it("should work with auto-selected execution mode", async () => {
      const onPositionUpdate = vi.fn();

      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "auto",
          onPositionUpdate,
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Start animation
      await act(async () => {
        await result.current.startAnimation({
          nodes: createTestNodes(),
          links: createTestLinks(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);

      // Wait for some progress
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      expect(onPositionUpdate).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle animation errors gracefully", async () => {
      const onAnimationError = vi.fn();

      const { result } = renderHook(() =>
        useUnifiedExecutionWorker({
          executionMode: "main-thread",
          onAnimationError,
        }),
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Try to start animation with invalid data
      await act(async () => {
        const taskId = await result.current.startAnimation({
          nodes: [], // Empty nodes should be handled gracefully
          links: createTestLinks(),
        });
        expect(taskId).toBeNull(); // Should return null for invalid input
      });

      // Should not crash the system
      expect(result.current.isInitialized()).toBe(true);
    });
  });
});
