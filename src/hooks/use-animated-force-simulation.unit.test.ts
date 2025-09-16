/**
 * Unit tests for useAnimatedForceSimulation hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedForceSimulation } from './use-animated-force-simulation';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the performance config
vi.mock('@/lib/graph/utils/performance-config', () => ({
  getConfigByGraphSize: vi.fn().mockReturnValue({
    targetFPS: 60,
    sendEveryNTicks: 1,
    alphaDecay: 0.02,
    maxIterations: 1000,
    linkDistance: 100,
    linkStrength: 0.01,
    chargeStrength: -1000,
    centerStrength: 0.01,
    collisionRadius: 120,
    collisionStrength: 1.0,
    velocityDecay: 0.1,
  }),
}));

// Mock Web Worker
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  private eventTarget = new EventTarget();

  constructor(public url: string, public options?: WorkerOptions) {}

  postMessage(data: any) {
    // Mock worker behavior - simulate immediate ready message
    setTimeout(() => {
      this.dispatchEvent(new MessageEvent('message', {
        data: { type: 'ready' }
      }));
    }, 0);
  }

  terminate() {
    // Mock termination
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.eventTarget.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.eventTarget.removeEventListener(type, listener);
  }

  dispatchEvent(event: Event) {
    return this.eventTarget.dispatchEvent(event);
  }

  // Helper method to simulate worker messages
  simulateMessage(data: any) {
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    this.dispatchEvent(event);
  }

  // Helper method to simulate worker errors
  simulateError(error: string) {
    const event = new ErrorEvent('error', { message: error });
    if (this.onerror) {
      this.onerror(event);
    }
    this.dispatchEvent(event);
  }
}

// Mock global Worker
global.Worker = MockWorker as any;

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: vi.fn().mockReturnValue('mock-worker-url'),
  revokeObjectURL: vi.fn(),
} as any;

describe('useAnimatedForceSimulation', () => {
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    // Intercept Worker constructor to get reference to mock
    const OriginalWorker = global.Worker;
    global.Worker = vi.fn().mockImplementation((...args) => {
      mockWorker = new OriginalWorker(...args);
      return mockWorker;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAnimatedForceSimulation());

    expect(result.current.animationState).toEqual({
      isRunning: false,
      isPaused: false,
      alpha: 1,
      iteration: 0,
      progress: 0,
      fps: 0,
      nodeCount: 0,
      linkCount: 0,
    });

    expect(result.current.nodePositions).toEqual([]);
    expect(result.current.isIdle).toBe(true);
    expect(result.current.canPause).toBe(false);
    expect(result.current.canResume).toBe(false);
    expect(result.current.canStop).toBe(false);
  });

  it('should create worker on mount and set ready state', async () => {
    const { result } = renderHook(() => useAnimatedForceSimulation());

    // Wait for worker ready message
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(global.Worker).toHaveBeenCalledWith(
      expect.any(URL),
      { type: 'module' }
    );
    expect(result.current.isWorkerReady).toBe(true);
  });

  it('should start animation with correct parameters', async () => {
    const onPositionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedForceSimulation({ onPositionUpdate })
    );

    // Wait for worker ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const nodes = [
      { id: 'node1', x: 0, y: 0 },
      { id: 'node2', x: 100, y: 0 },
    ];
    const links = [
      { id: 'link1', source: 'node1', target: 'node2' },
    ];

    act(() => {
      result.current.startAnimation(nodes, links);
    });

    // Verify worker received start message
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'start',
      nodes,
      links,
      config: expect.any(Object),
      pinnedNodes: undefined,
    });
  });

  it('should handle position updates from worker', async () => {
    const onPositionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedForceSimulation({ onPositionUpdate })
    );

    // Wait for worker ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const positions = [
      { id: 'node1', x: 50, y: 25 },
      { id: 'node2', x: 75, y: 50 },
    ];

    // Simulate worker tick message
    act(() => {
      mockWorker.simulateMessage({
        type: 'tick',
        positions,
        alpha: 0.5,
        iteration: 10,
        progress: 0.1,
        fps: 60,
      });
    });

    expect(onPositionUpdate).toHaveBeenCalledWith(positions);
    expect(result.current.nodePositions).toEqual(positions);
    expect(result.current.animationState.alpha).toBe(0.5);
    expect(result.current.animationState.iteration).toBe(10);
    expect(result.current.animationState.progress).toBe(0.1);
    expect(result.current.animationState.fps).toBe(60);
  });

  it('should handle animation completion', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedForceSimulation({ onComplete })
    );

    // Wait for worker ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const finalPositions = [
      { id: 'node1', x: 100, y: 50 },
      { id: 'node2', x: 150, y: 100 },
    ];

    const stats = {
      totalIterations: 100,
      finalAlpha: 0.001,
      reason: 'converged',
    };

    // Simulate worker completion message
    act(() => {
      mockWorker.simulateMessage({
        type: 'complete',
        positions: finalPositions,
        ...stats,
      });
    });

    expect(onComplete).toHaveBeenCalledWith(finalPositions, stats);
    expect(result.current.nodePositions).toEqual(finalPositions);
    expect(result.current.animationState.isRunning).toBe(false);
    expect(result.current.animationState.progress).toBe(1);
  });

  it('should handle worker errors', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAnimatedForceSimulation({ onError })
    );

    // Wait for worker ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate worker error
    act(() => {
      mockWorker.simulateMessage({
        type: 'error',
        error: 'Simulation failed',
      });
    });

    expect(onError).toHaveBeenCalledWith('Worker error: Simulation failed');
  });

  it('should stop animation when requested', async () => {
    const { result } = renderHook(() => useAnimatedForceSimulation());

    // Wait for worker ready and start animation
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate running animation
    act(() => {
      mockWorker.simulateMessage({
        type: 'started',
        nodeCount: 2,
        linkCount: 1,
      });
    });

    expect(result.current.animationState.isRunning).toBe(true);

    // Stop animation
    act(() => {
      result.current.stopAnimation();
    });

    // Simulate worker stopped message
    act(() => {
      mockWorker.simulateMessage({
        type: 'stopped',
      });
    });

    expect(result.current.animationState.isRunning).toBe(false);
  });

  it('should get optimal config for different graph sizes', () => {
    const { result } = renderHook(() => useAnimatedForceSimulation());

    const smallGraphConfig = result.current.getOptimalConfig(50, 10, 0);
    const largeGraphConfig = result.current.getOptimalConfig(1000, 500, 10);

    expect(smallGraphConfig).toEqual(expect.objectContaining({
      targetFPS: expect.any(Number),
      sendEveryNTicks: expect.any(Number),
      alphaDecay: expect.any(Number),
      maxIterations: expect.any(Number),
    }));

    expect(largeGraphConfig).toEqual(expect.objectContaining({
      targetFPS: expect.any(Number),
      sendEveryNTicks: expect.any(Number),
      alphaDecay: expect.any(Number),
      maxIterations: expect.any(Number),
    }));
  });

  it('should cleanup worker on unmount', () => {
    const { unmount } = renderHook(() => useAnimatedForceSimulation());

    const terminateSpy = vi.spyOn(mockWorker, 'terminate');

    unmount();

    expect(terminateSpy).toHaveBeenCalled();
  });
});