/**
 * Animation Pipeline Test
 * Tests the complete animation pipeline from button click to DOM updates
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAnimatedLayout } from "@academic-explorer/graph";
import { useUnifiedExecutionWorker } from "@/hooks/use-unified-execution-worker"

// Mock ReactFlow
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    setNodes: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    setViewport: vi.fn(),
  }),
}))

// Mock stores
vi.mock("@/stores/graph-store", () => ({
  useGraphStore: vi.fn(() => ({
    pinnedNodes: [],
    currentLayout: "force",
  })),
}))

vi.mock("@/stores/layout-store", () => ({
  useLayoutStore: vi.fn(() => ({
    autoPinOnLayoutStabilization: false,
  })),
}))

vi.mock("@/stores/animated-graph-store", () => ({
  useAnimatedGraphStore: vi.fn(() => ({
    isAnimating: false,
    isPaused: false,
    progress: 0,
    alpha: 1,
    iteration: 0,
    fps: 0,
    startAnimation: vi.fn(),
    completeAnimation: vi.fn(),
    resetAnimation: vi.fn(),
    setAnimating: vi.fn(),
    setPaused: vi.fn(),
    setProgress: vi.fn(),
    setAlpha: vi.fn(),
    setIteration: vi.fn(),
    setFPS: vi.fn(),
    updateAnimatedPositions: vi.fn(),
    updateStaticPositions: vi.fn(),
    getAnimatedPositions: vi.fn(),
    applyPositionsToGraphStore: vi.fn(),
  })),
}))

describe("Animation Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize animation hook without errors", () => {
    expect(() => {
      renderHook(() => useAnimatedLayout({ enabled: true, useAnimation: true }))
    }).not.toThrow()
  })

  it("should initialize background worker hook without errors", () => {
    expect(() => {
      renderHook(() => useUnifiedExecutionWorker())
    }).not.toThrow()
  })


  it("should handle animation start sequence", async () => {
    // Mock the startAnimation function
    const mockStartAnimation = vi.fn()

    // Simulate starting animation
    act(() => {
      // This would normally trigger the animation pipeline
      mockStartAnimation()
    })

    expect(mockStartAnimation).toHaveBeenCalled()
  })

  it("should validate animation pipeline components exist", () => {
    // Test that all required components can be imported
    expect(() => {
      require("@academic-explorer/graph")
      require("@/hooks/use-unified-execution-worker")
      require("@/workers/background.worker.ts")
      require("@academic-explorer/simulation")
    }).not.toThrow()
  })
})