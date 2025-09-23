import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForceSimulationEngine, type SimulationCallbacks } from './force-simulation-engine';
import { DEFAULT_FORCE_PARAMS } from '@/lib/graph/force-params';
import type { ForceSimulationNode, ForceSimulationLink } from '@/lib/graph/events/enhanced-worker-types';

describe('ForceSimulationEngine - Dynamic Node/Edge Addition', () => {
  let engine: ForceSimulationEngine;
  let callbacks: SimulationCallbacks;
  let progressCallback: ReturnType<typeof vi.fn>;
  let completeCallback: ReturnType<typeof vi.fn>;
  let errorCallback: ReturnType<typeof vi.fn>;

  const createTestNode = (id: string, x = 0, y = 0, type = 'works'): ForceSimulationNode => ({
    id,
    type: type as ForceSimulationNode['type'],
    x,
    y,
  });

  const createTestLink = (id: string, source: string, target: string): ForceSimulationLink => ({
    id,
    source,
    target,
  });

  beforeEach(() => {
    progressCallback = vi.fn();
    completeCallback = vi.fn();
    errorCallback = vi.fn();

    callbacks = {
      onProgress: progressCallback,
      onComplete: completeCallback,
      onError: errorCallback,
    };

    engine = new ForceSimulationEngine({
      callbacks,
      config: {
        ...DEFAULT_FORCE_PARAMS,
        maxIterations: 10,
        alphaDecay: 0.5,
      },
      progressThrottleMs: 0,
    });
  });

  afterEach(() => {
    if (engine) {
      engine.stop();
    }
  });

  describe('Adding Nodes During Simulation', () => {
    it('should add new nodes to running simulation immediately', () => {
      // Start with initial nodes
      const initialNodes = [
        createTestNode('node1', 0, 0),
        createTestNode('node2', 100, 0),
      ];

      engine.start({
        nodes: initialNodes,
        links: [],
      });

      // Verify initial state
      let state = engine.getDebugState();
      expect(state.nodeCount).toBe(2);
      expect(state.isRunning).toBe(true);

      // Add new nodes
      const newNodes = [
        createTestNode('node3', 200, 0),
        createTestNode('node4', 300, 0),
      ];

      engine.updateNodes(newNodes, [], 0.8);

      // Verify nodes were applied immediately
      state = engine.getDebugState();
      expect(state.nodeCount).toBe(4); // 2 initial + 2 new
      expect(state.pendingUpdates.length).toBe(0); // Updates applied immediately
    });

    it('should handle adding nodes when simulation is not running', () => {
      // Add nodes before starting simulation
      const pendingNodes = [
        createTestNode('pending1', 0, 0),
        createTestNode('pending2', 100, 0),
      ];

      engine.updateNodes(pendingNodes, [], 0.5);

      let state = engine.getDebugState();
      expect(state.isRunning).toBe(false);
      expect(state.pendingNodes.length).toBe(2);

      // Start simulation - should include pending nodes
      const initialNodes = [createTestNode('initial', 50, 0)];
      engine.start({ nodes: initialNodes, links: [] });

      state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
      expect(state.nodeCount).toBe(3); // initial + 2 pending
      expect(state.pendingNodes.length).toBe(0); // Should be cleared
    });
  });

  describe('Adding Links During Simulation', () => {
    it('should add new links to running simulation immediately', () => {
      // Start with disconnected nodes
      const initialNodes = [
        createTestNode('node1', 0, 0),
        createTestNode('node2', 100, 0),
        createTestNode('node3', 200, 0),
      ];

      engine.start({
        nodes: initialNodes,
        links: [],
      });

      // Verify initial state
      let state = engine.getDebugState();
      expect(state.linkCount).toBe(0);
      expect(state.isRunning).toBe(true);

      // Add new links
      const newLinks = [
        createTestLink('link1', 'node1', 'node2'),
        createTestLink('link2', 'node2', 'node3'),
      ];

      engine.updateLinks(newLinks, 0.7);

      // Verify links were applied immediately
      state = engine.getDebugState();
      expect(state.linkCount).toBe(2); // Links added
      expect(state.pendingUpdates.length).toBe(0); // Updates applied immediately
    });

    it('should handle adding links when simulation is not running', () => {
      // Add links before starting simulation
      const pendingLinks = [
        createTestLink('pending1', 'node1', 'node2'),
      ];

      engine.updateLinks(pendingLinks, 0.6);

      let state = engine.getDebugState();
      expect(state.isRunning).toBe(false);
      expect(state.pendingLinks.length).toBe(1);

      // Start simulation - should include pending links
      const initialNodes = [
        createTestNode('node1', 0, 0),
        createTestNode('node2', 100, 0),
      ];
      engine.start({ nodes: initialNodes, links: [] });

      state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
      expect(state.linkCount).toBe(1); // pending link applied
      expect(state.pendingLinks.length).toBe(0); // Should be cleared
    });
  });

  describe('Combined Node and Link Addition', () => {
    it('should handle adding nodes and links together', () => {
      // Start with minimal graph
      const initialNodes = [createTestNode('node1', 0, 0)];
      engine.start({ nodes: initialNodes, links: [] });

      let state = engine.getDebugState();
      expect(state.nodeCount).toBe(1);
      expect(state.linkCount).toBe(0);

      // Add nodes first
      const newNodes = [
        createTestNode('node2', 100, 0),
        createTestNode('node3', 200, 0),
      ];
      engine.updateNodes(newNodes, [], 0.8);

      // Add links connecting the nodes
      const newLinks = [
        createTestLink('link1', 'node1', 'node2'),
        createTestLink('link2', 'node2', 'node3'),
      ];
      engine.updateLinks(newLinks, 0.7);

      // Verify both updates are applied
      state = engine.getDebugState();
      expect(state.nodeCount).toBe(3); // 1 initial + 2 new
      expect(state.linkCount).toBe(2); // 2 new links
      expect(state.pendingUpdates.length).toBe(0); // All updates applied
    });
  });

  describe('Engine State Management', () => {
    it('should maintain correct simulation state during updates', () => {
      const initialNodes = [createTestNode('node1')];
      engine.start({ nodes: initialNodes, links: [] });

      let state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);

      // Add nodes - should maintain running state
      engine.updateNodes([createTestNode('node2')], [], 0.5);

      state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);

      // Pause and verify updates still apply
      engine.pause();
      engine.updateNodes([createTestNode('node3')], [], 0.4);

      state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(true);
      expect(state.nodeCount).toBe(3); // Node added even when paused
    });

    it('should handle simulation parameter updates', () => {
      const initialNodes = [createTestNode('node1'), createTestNode('node2')];
      const initialLinks = [createTestLink('link1', 'node1', 'node2')];

      engine.start({ nodes: initialNodes, links: initialLinks });

      // Update simulation parameters
      engine.updateParameters({
        linkStrength: 2.0,
        chargeStrength: -500,
        alphaDecay: 0.3,
      });

      // Verify simulation is still running after parameter update
      const state = engine.getDebugState();
      expect(state.isRunning).toBe(true);

      // Verify onProgress was called for parameter update
      const parameterUpdateCalls = progressCallback.mock.calls
        .filter(call => call[0].messageType === 'parameters_updated');
      expect(parameterUpdateCalls.length).toBeGreaterThan(0);
    });

    it('should handle stopping simulation with pending updates', () => {
      const initialNodes = [createTestNode('node1')];
      engine.start({ nodes: initialNodes, links: [] });

      // Add updates
      engine.updateNodes([createTestNode('node2')], [], 0.5);
      engine.updateLinks([createTestLink('link1', 'node1', 'node2')], 0.6);

      let state = engine.getDebugState();
      expect(state.nodeCount).toBe(2); // Node added
      expect(state.linkCount).toBe(1); // Link added
      expect(state.pendingUpdates.length).toBe(0); // Updates applied immediately

      // Stop simulation
      engine.stop();

      state = engine.getDebugState();
      expect(state.isRunning).toBe(false);
      expect(state.pendingUpdates.length).toBe(0); // Should remain cleared

      // Verify onComplete was called
      expect(completeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'stopped',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should not crash when adding invalid node types', () => {
      const initialNodes = [createTestNode('node1')];
      engine.start({ nodes: initialNodes, links: [] });

      // Add node with invalid type
      const invalidNode = {
        id: 'invalid',
        type: 'invalid_type' as ForceSimulationNode['type'],
        x: 0,
        y: 0,
      };

      expect(() => {
        engine.updateNodes([invalidNode], [], 0.5);
      }).not.toThrow();

      const state = engine.getDebugState();
      expect(state.nodeCount).toBe(2); // Invalid node was still processed
    });

    it('should handle empty node and link arrays', () => {
      const initialNodes = [createTestNode('node1')];
      engine.start({ nodes: initialNodes, links: [] });

      expect(() => {
        engine.updateNodes([], [], 0.5);
        engine.updateLinks([], 0.5);
      }).not.toThrow();

      const state = engine.getDebugState();
      expect(state.isRunning).toBe(true);
    });
  });
});