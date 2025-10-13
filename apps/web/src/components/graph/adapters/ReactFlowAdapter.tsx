import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  GraphData,
  GraphAdapterConfig,
  GraphAdapter,
} from "./GraphAdapter";
import { detectEntityType } from "@academic-explorer/graph";

// Hierarchical left-to-right layout algorithm for better node positioning
function applyHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
) {
  if (nodes.length === 0) return;

  // Find the main entity node (first node in the array)
  const mainNode = nodes[0];
  const relatedNodes = nodes.slice(1);

  // Place main node on the left side
  mainNode.position = {
    x: 40, // Left margin
    y: height / 2 - 25, // Center vertically with offset for node height
  };

  if (relatedNodes.length === 0) return;

  // Calculate spacing for related nodes
  const availableHeight = height - 80; // Account for padding
  const nodeSpacing = Math.max(
    60,
    availableHeight / Math.max(1, relatedNodes.length - 1),
  );

  // Arrange related nodes vertically on the right side
  relatedNodes.forEach((node, index) => {
    const x = width - 120; // Right side with margin for node width
    const y = 40 + index * nodeSpacing; // Vertical spacing from top

    node.position = { x, y };
  });

  // Apply bounds checking to ensure nodes stay within container
  const padding = 20;
  nodes.forEach((node) => {
    node.position.x = Math.max(
      padding,
      Math.min(width - 80 - padding, node.position.x),
    );
    node.position.y = Math.max(
      padding,
      Math.min(height - 40 - padding, node.position.y),
    );
  });
}

function FitViewButton() {
  const { fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Listen for custom fit view events
  useEffect(() => {
    const handleCustomFitView = (event: CustomEvent) => {
      const { padding, duration } = event.detail;
      fitView({ padding, duration });
    };

    window.addEventListener("fitView", handleCustomFitView as EventListener);
    return () =>
      window.removeEventListener(
        "fitView",
        handleCustomFitView as EventListener,
      );
  }, [fitView]);

  return (
    <button
      onClick={handleFitView}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #ccc",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "11px",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
      }}
      title="Fit view to graph"
    >
      Fit
    </button>
  );
}

export function ReactFlowAdapterComponent({
  data,
  config,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: config.width,
    height: config.height,
  });

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

  // Convert GraphData to ReactFlow format
  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];

    data.nodes.forEach((node, index) => {
      // Initialize in a circle for deterministic starting positions
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      const radius = Math.min(dimensions.width, dimensions.height) / 3;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const x = centerX + radius * Math.cos(angle) - 40;
      const y = centerY + radius * Math.sin(angle) - 20;

      rfNodes.push({
        id: node.id,
        type: "default",
        position: { x, y },
        data: { label: node.label },
        style: {
          background:
            node.color === "primary"
              ? config.themeColors.getEntityColor(node.entityType || "work")
              : config.themeColors.getEntityColor(node.entityType || "work"),
          color:
            node.color === "primary"
              ? "white"
              : config.themeColors.colors.text.primary,
          border:
            node.color === "primary"
              ? `2px solid ${config.themeColors.getColor("blue", 7)}`
              : `1px solid ${config.themeColors.colors.border.secondary}`,
          borderRadius: node.color === "primary" ? "8px" : "6px",
          padding: node.color === "primary" ? "8px" : "6px",
          fontSize: node.color === "primary" ? "12px" : "10px",
          fontWeight: node.color === "primary" ? "bold" : "normal",
        },
      });
    });

    data.links.forEach((link) => {
      rfEdges.push({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: "default",
        style: {
          stroke: config.themeColors.colors.border.secondary,
          strokeWidth: 2,
        },
      });
    });

    // Apply hierarchical layout for better node positioning
    applyHierarchicalLayout(
      rfNodes,
      rfEdges,
      dimensions.width,
      dimensions.height,
    );

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, dimensions, config.themeColors]);

  // Auto-fit view after nodes are created/updated
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        // Use a custom event to trigger fit view since we can't access ReactFlow instance directly
        const event = new CustomEvent("fitView", {
          detail: { padding: 0.2, duration: 300 },
        });
        window.dispatchEvent(event);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "300px",
        border: `1px solid ${config.themeColors.colors.border.primary}`,
        borderRadius: "8px",
        position: "relative",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={() => {}}
        onEdgesChange={() => {}}
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
        <FitViewButton />
      </ReactFlow>
    </div>
  );
}

export class ReactFlowAdapter implements GraphAdapter {
  convertEntitiesToGraphData(
    mainEntity: any,
    relatedEntities: any[],
  ): GraphData {
    const nodes: any[] = [];
    const links: any[] = [];

    // Add main entity node
    const mainEntityType = detectEntityType(mainEntity.id) || "work";
    nodes.push({
      id: mainEntity.id,
      label: mainEntity.display_name || mainEntity.id,
      color: "primary", // Will be resolved by theme
      entityType: mainEntityType,
    });

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity) => {
      const entityType = detectEntityType(relatedEntity.id) || "work";
      nodes.push({
        id: relatedEntity.id,
        label: relatedEntity.display_name || relatedEntity.id,
        color: "secondary", // Will be resolved by theme
        entityType,
      });

      // Add edge from main entity to related entity
      links.push({
        source: mainEntity.id,
        target: relatedEntity.id,
      });
    });

    return { nodes, links };
  }

  render(data: GraphData, config: GraphAdapterConfig): React.ReactElement {
    return <ReactFlowAdapterComponent data={data} config={config} />;
  }
}
