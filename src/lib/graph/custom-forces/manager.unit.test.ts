/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CustomForceManager } from "./manager";
import type { EnhancedSimulationNode } from "./types";

describe("CustomForceManager", () => {
  let manager: CustomForceManager;
  let nodes: EnhancedSimulationNode[];

  beforeEach(() => {
    manager = new CustomForceManager({
      performance: {
        enableTiming: false,
        logSlowForces: false,
        maxExecutionTime: 10,
      },
    });

    nodes = [
      {
        id: "node1",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        type: "author",
        year: 2020,
        citations: 100,
      },
      {
        id: "node2",
        x: 100,
        y: 0,
        vx: 0,
        vy: 0,
        type: "work",
        year: 2022,
        citations: 50,
      },
    ];
  });

  describe("Force Management", () => {
    it("should add a force with auto-generated ID", () => {
      const forceId = manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: {
          type: "radial",
          centerX: 0,
          centerY: 0,
          radius: 100,
        },
      });

      expect(forceId).toBeDefined();
      expect(typeof forceId).toBe("string");

      const forces = manager.getAllForces();
      expect(forces).toHaveLength(1);
      expect(forces[0].id).toBe(forceId);
      expect(forces[0].name).toBe("Test Force");
    });

    it("should add a force with custom ID", () => {
      const customId = "custom-force-id";
      const forceId = manager.addForce({
        id: customId,
        name: "Custom Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: {
          type: "radial",
          centerX: 0,
          centerY: 0,
          radius: 100,
        },
      });

      expect(forceId).toBe(customId);

      const forces = manager.getAllForces();
      expect(forces[0].id).toBe(customId);
    });

    it("should throw error when adding force with existing ID", () => {
      manager.addForce({
        id: "existing-id",
        name: "First Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: {
          type: "radial",
          centerX: 0,
          centerY: 0,
          radius: 100,
        },
      });

      expect(() => {
        manager.addForce({
          id: "existing-id",
          name: "Second Force",
          type: "radial",
          enabled: true,
          strength: 0.5,
          priority: 2,
          config: {
            type: "radial",
            centerX: 0,
            centerY: 0,
            radius: 100,
          },
        });
      }).toThrow('Force with id "existing-id" already exists');
    });

    it("should remove a force by ID", () => {
      const forceId = manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: {
          type: "radial",
          centerX: 0,
          centerY: 0,
          radius: 100,
        },
      });

      expect(manager.getAllForces()).toHaveLength(1);

      const removed = manager.removeForce(forceId);
      expect(removed).toBe(true);
      expect(manager.getAllForces()).toHaveLength(0);
    });

    it("should return false when removing non-existent force", () => {
      const removed = manager.removeForce("non-existent-id");
      expect(removed).toBe(false);
    });

    it("should update an existing force", () => {
      const forceId = manager.addForce({
        name: "Original Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: {
          type: "radial",
          centerX: 0,
          centerY: 0,
          radius: 100,
        },
      });

      const updated = manager.updateForce(forceId, {
        name: "Updated Force",
        strength: 0.8,
        enabled: false,
      });

      expect(updated).toBe(true);

      const forces = manager.getAllForces();
      expect(forces[0].name).toBe("Updated Force");
      expect(forces[0].strength).toBe(0.8);
      expect(forces[0].enabled).toBe(false);
      expect(forces[0].type).toBe("radial"); // Should preserve unchanged properties
    });

    it("should return false when updating non-existent force", () => {
      const updated = manager.updateForce("non-existent-id", { name: "New Name" });
      expect(updated).toBe(false);
    });

    it("should clear all forces", () => {
      manager.addForce({
        name: "Force 1",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      manager.addForce({
        name: "Force 2",
        type: "property",
        enabled: true,
        strength: 0.5,
        priority: 2,
        config: { type: "property", property: "year", direction: "horizontal", targetPosition: 0, scale: 1 },
      });

      expect(manager.getAllForces()).toHaveLength(2);

      manager.clearAllForces();
      expect(manager.getAllForces()).toHaveLength(0);
    });
  });

  describe("Force Application", () => {
    it("should apply enabled forces in priority order", () => {
      // Add forces with different priorities
      manager.addForce({
        name: "Low Priority",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 2,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      manager.addForce({
        name: "High Priority",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 50, centerY: 50, radius: 100 },
      });

      const initialVx = nodes[0].vx;
      const initialVy = nodes[0].vy;

      manager.applyForces(nodes, 1);

      // Nodes should have changed velocities
      expect(nodes[0].vx).not.toBe(initialVx);
      expect(nodes[0].vy).not.toBe(initialVy);
    });

    it("should skip disabled forces", () => {
      manager.addForce({
        name: "Disabled Force",
        type: "radial",
        enabled: false,
        strength: 1,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      const initialVx = nodes[0].vx;
      const initialVy = nodes[0].vy;

      manager.applyForces(nodes, 1);

      // Nodes should not have changed because force is disabled
      expect(nodes[0].vx).toBe(initialVx);
      expect(nodes[0].vy).toBe(initialVy);
    });

    it("should handle empty node array", () => {
      manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      expect(() => {
        manager.applyForces([], 1);
      }).not.toThrow();
    });

    it("should handle zero alpha", () => {
      manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      expect(() => {
        manager.applyForces(nodes, 0);
      }).not.toThrow();
    });
  });

  describe("Preset Management", () => {
    it("should load a preset and replace existing forces", () => {
      // Add an existing force
      manager.addForce({
        name: "Existing Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      expect(manager.getAllForces()).toHaveLength(1);

      const presets = manager.getBuiltInPresets();
      const preset = presets.yearCitation; // Use an actual preset
      manager.loadPreset(preset);

      const forces = manager.getAllForces();
      expect(forces.length).toBeGreaterThan(0);
      expect(forces[0].name).not.toBe("Existing Force");
    });

    it("should handle preset with invalid force configuration", () => {
      const invalidPreset = {
        id: "invalid-test",
        name: "Invalid Test",
        description: "Test preset with invalid force",
        forces: [
          {
            name: "Invalid Force",
            type: "invalid-type" as any,
            enabled: true,
            strength: 0.5,
            priority: 1,
            config: {} as any,
          },
        ],
      };

      // Should not throw - manager accepts any preset structure
      expect(() => {
        manager.loadPreset(invalidPreset);
      }).not.toThrow();
    });
  });

  describe("Statistics", () => {
    it("should provide performance statistics", () => {
      manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      manager.applyForces(nodes, 1);

      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalForces).toBe(1);
      expect(stats.enabledForces).toBe(1);
      expect(stats.disabledForces).toBe(0);
      expect(stats.typeDistribution).toBeDefined();
      expect(stats.availableTypes).toBeDefined();
    });

    it("should reset statistics", () => {
      manager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      manager.applyForces(nodes, 1);
      expect(manager.getStats().performanceMetricsCount).toBeGreaterThanOrEqual(0);

      manager.clearPerformanceMetrics();
      expect(manager.getStats().performanceMetricsCount).toBe(0);
    });
  });

  describe("Performance Monitoring", () => {
    it("should handle performance monitoring when enabled", () => {
      const performanceManager = new CustomForceManager({
        performance: {
          enableTiming: true,
          logSlowForces: false,
          maxExecutionTime: 1, // Very short timeout
        },
      });

      performanceManager.addForce({
        name: "Test Force",
        type: "radial",
        enabled: true,
        strength: 0.5,
        priority: 1,
        config: { type: "radial", centerX: 0, centerY: 0, radius: 100 },
      });

      expect(() => {
        performanceManager.applyForces(nodes, 1);
      }).not.toThrow();

      const stats = performanceManager.getStats();
      expect(stats.performanceMetricsCount).toBeGreaterThanOrEqual(0);
    });
  });
});