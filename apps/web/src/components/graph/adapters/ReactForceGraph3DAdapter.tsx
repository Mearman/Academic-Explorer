import React, { useMemo, useRef, useEffect, useCallback } from "react";
import ForceGraph3D, { ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";

import type {
  GraphData,
  GraphAdapterConfig,
  GraphAdapter,
  GraphNode,
  GraphLink,
} from "./GraphAdapter";
import type { OpenAlexEntity } from "@academic-explorer/client";
import type { ReactForceGraph3DConfig } from "../configs";
import { detectEntityType } from "@academic-explorer/graph";

// Type for ForceGraph3D ref with camera controls
interface ForceGraph3DRef {
  cameraPosition: (
    position: { x: number; y: number; z: number },
    lookAt: unknown,
    transitionDuration?: number,
  ) => void;
}

export function ReactForceGraph3DAdapterComponent({
  data,
  config,
  adapterConfig,
  registerFitViewCallback,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
  adapterConfig?: ReactForceGraph3DConfig;
  registerFitViewCallback: (callback: () => void) => () => void;
}) {
  const fgRef = useRef<any>(null);
  const resolveCssVarColor = useCallback(
    (color: string, fallbackColor: string) => {
      if (!color) {
        return fallbackColor;
      }

      if (!color.startsWith("var(")) {
        return color;
      }

      if (typeof window === "undefined" || typeof document === "undefined") {
        return fallbackColor;
      }

      const cssVarExpression = color.slice(4, -1).trim();
      if (!cssVarExpression) {
        return fallbackColor;
      }

      const [varName, cssFallback] = cssVarExpression
        .split(",")
        .map((part) => part.trim());
      if (!varName) {
        return cssFallback || fallbackColor;
      }

      const resolvedValue = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();

      if (resolvedValue) {
        return resolvedValue;
      }

      if (cssFallback) {
        return cssFallback;
      }

      return fallbackColor;
    },
    [],
  );
  const graphBackgroundColor = useMemo(
    () =>
      resolveCssVarColor(
        config.themeColors.colors.background.primary,
        config.themeColors.colors.background.secondary,
      ),
    [
      config.themeColors.colors.background.primary,
      config.themeColors.colors.background.secondary,
      resolveCssVarColor,
    ],
  );

  const fitView = useCallback(() => {
    if (fgRef.current) {
      // Center the camera on the graph
      fgRef.current?.cameraPosition(
        { x: 0, y: 0, z: 100 },
        { x: 0, y: 0, z: 0 },
        1000,
      );
    }
  }, []);

  // Register the fit view callback with the adapter
  useEffect(() => {
    return registerFitViewCallback(() => {
      fitView();
    });
  }, [registerFitViewCallback, fitView]);

  // Convert GraphData to react-force-graph-3d format
  const graphData = useMemo(() => {
    console.log(
      "[ReactForceGraph3D] Converting graph data, input nodes:",
      data.nodes,
    );
    console.log("[ReactForceGraph3D] Theme colors available:", {
      primary: config.themeColors.colors.primary,
      backgroundTertiary: config.themeColors.colors.background.tertiary,
    });

    const convertedNodes = data.nodes.map((node) => {
      const convertedColor = config.themeColors.getEntityColor(node.entityType);

      console.log(`[ReactForceGraph3D] Node ${node.id} (${node.label}):`, {
        entityType: node.entityType,
        convertedColor,
      });

      return {
        id: node.id,
        name: node.label,
        color: convertedColor,
        val: node.size || 4,
      };
    });

    const convertedLinks = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value || 1,
    }));

    console.log("[ReactForceGraph3D] Final converted graphData:", {
      nodes: convertedNodes,
      links: convertedLinks,
    });

    return {
      nodes: convertedNodes,
      links: convertedLinks,
    };
  }, [data]);

  // Auto-fit view after data changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      setTimeout(() => fitView(), 100);
    }
  }, [graphData, fitView]);

  const nodeColor = useCallback((node: Record<string, unknown>): string => {
    // Node colors are already converted from theme in graphData useMemo
    // react-force-graph-3d expects CSS color strings, not THREE.Color objects
    if (typeof node.color === "string" && node.color.startsWith("#")) {
      return node.color;
    }

    if (!node.color) {
      return "#cccccc"; // fallback as CSS color string
    }

    return String(node.color);
  }, []);

  const nodeLabelFn = useCallback((node) => {
    return String(node.name || "");
  }, []);

  const createTextTexture = useCallback(
    (text: string): HTMLCanvasElement => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Failed to get 2D context");
      const fontSize = 12;

      context.font = `${fontSize}px Arial`;
      const textWidth = context.measureText(text).width;

      canvas.width = textWidth + 20;
      canvas.height = fontSize + 10;

      // Clear with transparent background
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      context.fillStyle = config.themeColors.colors.background.overlay;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      context.strokeStyle = config.themeColors.colors.border.secondary;
      context.lineWidth = 1;
      context.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw text
      context.fillStyle = config.themeColors.colors.text.primary;
      context.font = `${fontSize}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      return canvas;
    },
    [config.themeColors],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        border: `1px solid ${config.themeColors.colors.border.primary}`,
        borderRadius: "8px",
        position: "relative",
        background: graphBackgroundColor,
      }}
    >
      {(() => {
        console.log("[ReactForceGraph3D] Rendering ForceGraph3D with props:", {
          graphData: {
            nodesCount: graphData.nodes.length,
            linksCount: graphData.links.length,
            sampleNode: graphData.nodes[0],
            sampleLink: graphData.links[0],
          },
          config: {
            width: config.width,
            height: config.height,
            backgroundColor: graphBackgroundColor,
          },
        });

        try {
          return (
            <ForceGraph3D
              ref={fgRef}
              graphData={graphData}
              width={config.width}
              height={config.height}
              backgroundColor={graphBackgroundColor}
              nodeColor={nodeColor}
              nodeLabel={nodeLabelFn as any}
              nodeVal={(node) =>
                Number(node.val || adapterConfig?.nodeSize || 4) as any
              }
              linkColor={() => config.themeColors.colors.border.secondary}
              linkWidth={adapterConfig?.linkWidth || 2}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              enableNodeDrag={config.interactive ?? false}
              enableNavigationControls={
                adapterConfig?.enableControls ?? config.interactive ?? false
              }
              showNavInfo={false}
              onNodeClick={(node: Record<string, unknown>) => {
                // Focus on clicked node
                if (fgRef.current) {
                  fgRef.current?.cameraPosition(
                    {
                      x: Number(node.x) * 2,
                      y: Number(node.y) * 2,
                      z: Number(node.z) * 2,
                    },
                    node as any,
                    1000,
                  );
                }
              }}
              // Custom node rendering for better text visibility
              nodeThreeObject={(node: Record<string, unknown>) => {
                const sprite = new THREE.Sprite(
                  new THREE.SpriteMaterial({
                    map: new THREE.CanvasTexture(
                      createTextTexture(String(node.name || "")),
                    ),
                    transparent: true,
                  }),
                );
                sprite.scale.set(16, 8, 1);
                return sprite;
              }}
              nodeThreeObjectExtend={true}
            />
          );
        } catch (error) {
          console.error(
            "[ReactForceGraph3D] ERROR rendering ForceGraph3D component:",
            error,
          );
          return (
            <div style={{ color: "red", padding: "20px" }}>
              Error rendering graph:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          );
        }
      })()}
      {/* Fit view button */}
      <button
        onClick={fitView}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 1000,
          background: config.themeColors.colors.background.overlay,
          border: `1px solid ${config.themeColors.colors.border.secondary}`,
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "11px",
          cursor: "pointer",
          color: config.themeColors.colors.text.primary,
          backdropFilter: "blur(4px)",
        }}
        title="Fit view to graph"
      >
        Fit
      </button>
    </div>
  );
}

export class ReactForceGraph3DAdapter implements GraphAdapter {
  private config?: ReactForceGraph3DConfig;
  private fitViewCallbacks: Array<() => void> = [];

  constructor(config?: ReactForceGraph3DConfig) {
    this.config = config;
  }

  fitView(): void {
    // Call all registered callbacks
    this.fitViewCallbacks.forEach((callback) => callback());
  }

  render(data: GraphData, config: GraphAdapterConfig): React.ReactElement {
    return (
      <ReactForceGraph3DAdapterComponent
        data={data}
        config={config}
        adapterConfig={this.config}
        registerFitViewCallback={(callback) => {
          this.fitViewCallbacks.push(callback);
          return () => {
            this.fitViewCallbacks = this.fitViewCallbacks.filter(
              (cb) => cb !== callback,
            );
          };
        }}
      />
    );
  }

  convertEntitiesToGraphData(
    mainEntity: OpenAlexEntity,
    relatedEntities: OpenAlexEntity[],
  ): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add main entity node
    const mainEntityType = detectEntityType(mainEntity.id);
    const mainNode = {
      id: mainEntity.id,
      label: mainEntity.display_name || mainEntity.id,
      color: "primary", // Will be resolved by theme
      entityType: mainEntityType,
    };
    console.log("[ReactForceGraph3D] Adding main entity node:", mainNode);
    nodes.push(mainNode);

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity, index) => {
      const entityType = detectEntityType(relatedEntity.id);
      const relatedNode = {
        id: relatedEntity.id,
        label: relatedEntity.display_name || relatedEntity.id,
        color: "secondary", // Will be resolved by theme
        entityType,
      };
      console.log(
        `[ReactForceGraph3D] Adding related entity node ${index + 1}:`,
        relatedNode,
      );
      nodes.push(relatedNode);

      // Add edge from main entity to related entity
      const link = {
        source: mainEntity.id,
        target: relatedEntity.id,
      };
      console.log(`[ReactForceGraph3D] Adding link ${index + 1}:`, link);
      links.push(link);
    });

    const result = { nodes, links };
    console.log(
      "[ReactForceGraph3D] convertEntitiesToGraphData result:",
      result,
    );
    return result;
  }
}
