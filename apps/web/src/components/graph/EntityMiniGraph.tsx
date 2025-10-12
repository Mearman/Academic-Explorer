import { useMemo, useState, useRef, useEffect } from "react";
import { ReactFlow, Node, Edge, Background, Controls } from "@xyflow/react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import "@xyflow/react/dist/style.css";

import type { OpenAlexEntity } from "@academic-explorer/client";

// Force-directed layout algorithm
function applyForceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
) {
  const iterations = 100;
  const attractionStrength = 0.01;
  const repulsionStrength = 1500;
  const damping = 0.9;

  // Node dimensions (approximate)
  const mainNodeWidth = 100;
  const mainNodeHeight = 50;
  const relatedNodeWidth = 80;
  const relatedNodeHeight = 40;

  // Create adjacency list for connected nodes
  const adjacency: Record<string, string[]> = {};
  nodes.forEach((node) => (adjacency[node.id] = []));
  edges.forEach((edge) => {
    adjacency[edge.source] = adjacency[edge.source] || [];
    adjacency[edge.target] = adjacency[edge.target] || [];
    adjacency[edge.source].push(edge.target);
    adjacency[edge.target].push(edge.source);
  });

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate forces
    const forces: Record<string, { x: number; y: number }> = {};
    nodes.forEach((node) => {
      forces[node.id] = { x: 0, y: 0 };
    });

    // Repulsion forces between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Calculate minimum distance based on node types
        const isMainNodeA = nodeA.id === nodes[0].id; // First node is main entity
        const isMainNodeB = nodeB.id === nodes[0].id;

        let minDistance: number;
        if (isMainNodeA && isMainNodeB) {
          // Two main nodes (shouldn't happen)
          minDistance = Math.max(mainNodeWidth, mainNodeHeight) / 2;
        } else if (isMainNodeA || isMainNodeB) {
          // Main node and related node
          minDistance = (mainNodeWidth + relatedNodeWidth) / 2 + 10;
        } else {
          // Two related nodes
          minDistance = relatedNodeWidth + 10;
        }

        // Always apply repulsion, with stronger force when overlapping
        let force: number;
        if (distance < minDistance) {
          // Strong repulsive force for overlapping nodes
          const overlap = minDistance - distance;
          force = overlap * 2 + repulsionStrength / Math.max(distance, 1);
        } else {
          // Normal repulsion scaled by distance
          force = repulsionStrength / (distance * distance);
        }

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        forces[nodeA.id].x -= fx;
        forces[nodeA.id].y -= fy;
        forces[nodeB.id].x += fx;
        forces[nodeB.id].y += fy;
      }
    }

    // Attraction forces between connected nodes
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = attractionStrength * distance;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      forces[sourceNode.id].x += fx;
      forces[sourceNode.id].y += fy;
      forces[targetNode.id].x -= fx;
      forces[targetNode.id].y -= fy;
    });

    // Apply forces and constraints
    nodes.forEach((node, index) => {
      const force = forces[node.id];
      node.position.x += force.x * damping;
      node.position.y += force.y * damping;

      // Keep nodes within bounds with reasonable padding
      const isMainNode = index === 0; // First node is main entity
      const nodeWidth = isMainNode ? mainNodeWidth : relatedNodeWidth;
      const nodeHeight = isMainNode ? mainNodeHeight : relatedNodeHeight;
      const paddingX = nodeWidth / 2 + 10;
      const paddingY = nodeHeight / 2 + 10;

      node.position.x = Math.max(
        paddingX,
        Math.min(width - paddingX, node.position.x),
      );
      node.position.y = Math.max(
        paddingY,
        Math.min(height - paddingY, node.position.y),
      );
    });
  }
}

interface EntityMiniGraphProps {
  entity: OpenAlexEntity;
  relatedEntities: OpenAlexEntity[];
}

export function EntityMiniGraph({
  entity,
  relatedEntities,
}: EntityMiniGraphProps) {
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Create nodes for the main entity and related entities
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Add main entity node
    nodes.push({
      id: entity.id,
      type: "default",
      position: { x: dimensions.width / 2 - 50, y: dimensions.height / 2 - 25 },
      data: { label: entity.display_name || entity.id },
      style: {
        background: themeColors.colors.primary,
        color: "white",
        border: `2px solid ${themeColors.getColor("blue", 7)}`,
        borderRadius: "8px",
        padding: "8px",
        fontSize: "12px",
        fontWeight: "bold",
      },
    });

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity, index) => {
      // Initialize in a circle for deterministic starting positions
      const angle = (index / relatedEntities.length) * 2 * Math.PI;
      const radius = Math.min(dimensions.width, dimensions.height) / 3;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const x = centerX + radius * Math.cos(angle) - 40;
      const y = centerY + radius * Math.sin(angle) - 20;

      nodes.push({
        id: relatedEntity.id,
        type: "default",
        position: { x, y },
        data: { label: relatedEntity.display_name || relatedEntity.id },
        style: {
          background: themeColors.colors.background.tertiary,
          color: themeColors.colors.text.primary,
          border: `1px solid ${themeColors.colors.border.secondary}`,
          borderRadius: "6px",
          padding: "6px",
          fontSize: "10px",
        },
      });

      // Add edge from main entity to related entity
      edges.push({
        id: `${entity.id}-${relatedEntity.id}`,
        source: entity.id,
        target: relatedEntity.id,
        type: "default",
        style: { stroke: themeColors.colors.border.secondary, strokeWidth: 2 },
      });
    });

    // Apply force-directed layout
    if (relatedEntities.length > 0) {
      applyForceDirectedLayout(
        nodes,
        edges,
        dimensions.width,
        dimensions.height,
      );
    }

    return { nodes, edges };
  }, [entity, relatedEntities, dimensions, themeColors]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "300px",
        border: `1px solid ${themeColors.colors.border.primary}`,
        borderRadius: "8px",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnDrag={false}
        preventScrolling={false}
      >
        <Background />
        <Controls
          showZoom={false}
          showFitView={false}
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
