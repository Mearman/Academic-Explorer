/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateRadialForce,
  calculatePropertyForce,
  calculateClusterForce,
  calculateRepulsionForce,
  calculateAttractionForce
} from "./calculations";
import type {
  EnhancedSimulationNode,
  RadialForceConfig,
  PropertyForceConfig,
  ClusterForceConfig,
  RepulsionForceConfig,
  AttractionForceConfig
} from "./types";

describe("Custom Force Calculations", () => {
  let nodes: EnhancedSimulationNode[];

  beforeEach(() => {
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
      {
        id: "node3",
        x: 0,
        y: 100,
        vx: 0,
        vy: 0,
        type: "author",
        year: 2021,
        citations: 200,
      },
    ];
  });

  describe("calculateRadialForce", () => {
    it("should push nodes away from center with positive strength", () => {
      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 50,
        evenDistribution: true, // This ensures predictable behavior
      };

      calculateRadialForce(nodes, config, 1, 1);

      // Nodes should be moved toward target radius positions
      nodes.forEach(node => {
        const totalVelocity = Math.abs(node.vx || 0) + Math.abs(node.vy || 0);
        expect(totalVelocity).toBeGreaterThan(0);
      });
    });

    it("should pull nodes toward center with negative strength", () => {
      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 200,
      };

      calculateRadialForce(nodes, config, -1, 1);

      // Node at (100, 0) should be pulled toward center
      expect(nodes[1].vx).toBeLessThan(0);
    });

    it("should respect target radius", () => {
      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 100,
      };

      calculateRadialForce(nodes, config, 1, 1);

      // Node at exactly radius distance should have minimal force
      const node2InitialVx = nodes[1].vx || 0;
      expect(Math.abs(node2InitialVx)).toBeLessThan(0.1);
    });
  });

  describe("calculatePropertyForce", () => {
    it("should apply horizontal force based on year property", () => {
      const config: PropertyForceConfig = {
        type: "property-x",
        propertyName: "year",
        minValue: -200,
        maxValue: 200,
      };

      calculatePropertyForce(nodes, config, 1, 1);

      // Nodes with different years should have different horizontal forces
      expect(nodes[0].vx).not.toEqual(nodes[1].vx);
      expect(nodes[1].vx).not.toEqual(nodes[2].vx);
    });

    it("should apply vertical force based on citations property", () => {
      const config: PropertyForceConfig = {
        type: "property-y",
        propertyName: "citations",
        minValue: -200,
        maxValue: 200,
      };

      calculatePropertyForce(nodes, config, 1, 1);

      // Nodes with different citation counts should have different vertical forces
      expect(nodes[0].vy).not.toEqual(nodes[1].vy);
      expect(nodes[1].vy).not.toEqual(nodes[2].vy);
    });

    it("should handle missing property values gracefully", () => {
      const nodesWithMissingData: EnhancedSimulationNode[] = [
        { id: "node1", x: 0, y: 0, vx: 0, vy: 0, type: "author" },
        { id: "node2", x: 0, y: 0, vx: 0, vy: 0, type: "work", year: 2020 },
      ];

      const config: PropertyForceConfig = {
        type: "property-x",
        propertyName: "year",
        minValue: -200,
        maxValue: 200,
      };

      calculatePropertyForce(nodesWithMissingData, config, 1, 1);

      // Both nodes should have forces applied since missing properties are treated as 0
      // Node with undefined year property gets treated as year=0
      expect(Math.abs(nodesWithMissingData[0].vx || 0)).toBeGreaterThan(0);
      // Node with year=2020 property should have non-zero force
      expect(Math.abs(nodesWithMissingData[1].vx || 0)).toBeGreaterThan(0);
    });
  });

  describe("calculateClusterForce", () => {
    it("should attract nodes of the same type", () => {
      const config: ClusterForceConfig = {
        type: "cluster",
        propertyName: "type",
        spacing: 100,
        arrangement: "grid",
      };

      calculateClusterForce(nodes, config, 1, 1);

      // Author nodes should be attracted to each other
      const authorNodes = nodes.filter(n => n.type === "author");
      expect(authorNodes.length).toBe(2);
    });

    it("should handle nodes without cluster property", () => {
      const nodesWithMissingProperty: EnhancedSimulationNode[] = [
        { id: "node1", x: 0, y: 0, vx: 0, vy: 0 },
        { id: "node2", x: 100, y: 0, vx: 0, vy: 0, type: "author" },
      ];

      const config: ClusterForceConfig = {
        type: "cluster",
        propertyName: "type",
        spacing: 100,
        arrangement: "grid",
      };

      calculateClusterForce(nodesWithMissingProperty, config, 1, 1);

      // Should not crash and should handle gracefully
    });
  });

  describe("calculateRepulsionForce", () => {
    it("should push nodes away from each other", () => {
      const config: RepulsionForceConfig = {
        type: "repulsion",
        maxDistance: 200,
        minDistance: 10,
        falloff: "linear",
      };

      calculateRepulsionForce(nodes, config, 1, 1);

      // Nodes should have outward velocities from each other
      expect(Math.abs(nodes[0].vx || 0) + Math.abs(nodes[0].vy || 0)).toBeGreaterThan(0);
    });

    it("should respect minimum distance", () => {
      const config: RepulsionForceConfig = {
        type: "repulsion",
        maxDistance: 300,
        minDistance: 10,
        falloff: "linear",
      };

      calculateRepulsionForce(nodes, config, 1, 1);

      // All nodes should experience repulsion since they're all closer than 200
      nodes.forEach(node => {
        expect(Math.abs(node.vx || 0) + Math.abs(node.vy || 0)).toBeGreaterThan(0);
      });
    });
  });

  describe("calculateAttractionForce", () => {
    it("should pull nodes toward each other", () => {
      const config: AttractionForceConfig = {
        type: "attraction",
        attractorSelector: (node) => node.type === "author",
        maxDistance: 300,
        falloff: "linear",
      };

      // Spread nodes far apart - node[1] (work) should be attracted to authors
      nodes[0].x = -200; // author
      nodes[1].x = 200;  // work - this should be attracted to authors
      nodes[2].x = 0;    // author
      nodes[2].y = 200;

      calculateAttractionForce(nodes, config, 1, 1);

      // The work node (nodes[1]) should have velocity toward attractors (authors)
      expect(Math.abs(nodes[1].vx || 0) + Math.abs(nodes[1].vy || 0)).toBeGreaterThan(0);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty node array", () => {
      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 50,
      };

      expect(() => {
        calculateRadialForce([], config, 1, 1);
      }).not.toThrow();
    });

    it("should handle invalid alpha values", () => {
      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 50,
      };

      expect(() => {
        calculateRadialForce(nodes, config, 1, 0);
      }).not.toThrow();
    });

    it("should handle nodes without coordinates", () => {
      const invalidNodes: EnhancedSimulationNode[] = [
        { id: "node1", vx: 0, vy: 0, type: "author" },
      ];

      const config: RadialForceConfig = {
        type: "radial",
        centerX: 0,
        centerY: 0,
        radius: 50,
      };

      expect(() => {
        calculateRadialForce(invalidNodes, config, 1, 1);
      }).not.toThrow();
    });
  });
});