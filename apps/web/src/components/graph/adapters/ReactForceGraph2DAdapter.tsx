import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { ForceGraph2D } from "react-force-graph";

import type {
  GraphData,
  GraphAdapterConfig,
  GraphAdapter,
  GraphNode,
  GraphLink,
} from "./GraphAdapter";
import type { ReactForceGraph2DConfig } from "../configs";
import { detectEntityType } from "@academic-explorer/graph";
import type { OpenAlexEntity } from "@academic-explorer/client";

interface ForceGraph2DMethods {
  zoomToFit: (duration?: number) => void;
  centerAt: (x: number, y: number, duration?: number) => void;
  zoom: (scale: number, duration?: number) => void;
}

export function ReactForceGraph2DAdapterComponent({
  data,
  config,
  adapterConfig,
  registerFitViewCallback,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
  adapterConfig?: ReactForceGraph2DConfig;
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
    const fgInstance = fgRef.current as ForceGraph2DMethods;
    if (fgInstance) {
      fgInstance.zoomToFit(400);
    }
  }, []);

  // Register the fit view callback with the adapter
  useEffect(() => {
    return registerFitViewCallback(() => {
      fitView();
    });
  }, [registerFitViewCallback, fitView]);

  // Convert GraphData to react-force-graph format
  const graphData = useMemo(() => {
    const convertedNodes = data.nodes.map((node) => {
      const convertedColor = config.themeColors.getEntityColor(node.entityType);

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

    return {
      nodes: convertedNodes,
      links: convertedLinks,
    };
  }, [data, config.themeColors.getEntityColor]);

  // Auto-fit view after data changes
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      setTimeout(() => fitView(), 100);
    }
  }, [graphData, fitView]);

  const nodeColor = useCallback((node: { color?: string }) => {
    // Node colors are already converted from theme in graphData useMemo
    // react-force-graph expects CSS color strings
    if (typeof node.color === "string" && node.color.startsWith("#")) {
      return node.color;
    }

    if (!node.color) {
      return "#cccccc"; // fallback as CSS color string
    }

    return node.color;
  }, []);

  const nodeCanvasObject = useCallback(
    (
      node: { name: string; x: number; y: number; val: number; color?: string },
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => {
      const label = node.name;
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map(
        (n) => n + fontSize * 0.2,
      ); // some padding

      // Draw background
      ctx.fillStyle = config.themeColors.colors.background.overlay;
      ctx.fillRect(
        node.x - bckgDimensions[0] / 2,
        node.y - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1],
      );

      // Draw border
      ctx.strokeStyle = config.themeColors.colors.border.secondary;
      ctx.lineWidth = 1 / globalScale;
      ctx.strokeRect(
        node.x - bckgDimensions[0] / 2,
        node.y - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1],
      );

      // Draw text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = config.themeColors.colors.text.primary;
      ctx.fillText(label, node.x, node.y);

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.val / globalScale, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeColor(node);
      ctx.fill();
    },
    [config.themeColors, nodeColor],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: `1px solid ${config.themeColors.colors.border.primary}`,
        borderRadius: "8px",
        position: "relative",
        background: graphBackgroundColor,
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={
          graphData as {
            nodes: Record<string, unknown>[];
            links: Record<string, unknown>[];
          }
        }
        width={config.width}
        height={config.height}
        backgroundColor={graphBackgroundColor}
        nodeColor={nodeColor as (node: Record<string, unknown>) => string}
        nodeLabel={(node: Record<string, unknown> & { name?: string }) =>
          node.name || ""
        }
        nodeVal={(node: Record<string, unknown> & { val?: number }) =>
          node.val || adapterConfig?.nodeSize || 4
        }
        linkColor={() => config.themeColors.colors.border.secondary}
        linkWidth={adapterConfig?.linkWidth || 2}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        enableNodeDrag={config.interactive ?? false}
        enableZoomInteraction={
          adapterConfig?.enableZoom ?? config.interactive ?? false
        }
        onNodeClick={(node) => {
          // Focus on clicked node
          const fgInstance = fgRef.current as ForceGraph2DMethods;
          if (
            fgInstance &&
            typeof node.x === "number" &&
            typeof node.y === "number"
          ) {
            fgInstance.centerAt(node.x, node.y, 400);
            fgInstance.zoom(2, 400);
          }
        }}
        nodeCanvasObject={
          nodeCanvasObject as (
            node: Record<string, unknown>,
            ctx: CanvasRenderingContext2D,
            globalScale: number,
          ) => void
        }
        nodeCanvasObjectMode={() => "replace"}
      />
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

export class ReactForceGraph2DAdapter implements GraphAdapter {
  private config?: ReactForceGraph2DConfig;
  private fitViewCallbacks: Array<() => void> = [];

  constructor(config?: ReactForceGraph2DConfig) {
    this.config = config;
  }

  fitView(): void {
    // Call all registered callbacks
    this.fitViewCallbacks.forEach((callback) => callback());
  }

  render(data: GraphData, config: GraphAdapterConfig): React.ReactElement {
    return (
      <ReactForceGraph2DAdapterComponent
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
    const mainNode: GraphNode = {
      id: mainEntity.id,
      label: mainEntity.display_name || mainEntity.id,
      color: "primary", // Will be resolved by theme
      entityType: mainEntityType,
    };
    nodes.push(mainNode);

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity) => {
      const entityType = detectEntityType(relatedEntity.id);
      const relatedNode: GraphNode = {
        id: relatedEntity.id,
        label: relatedEntity.display_name || relatedEntity.id,
        color: "secondary", // Will be resolved by theme
        entityType,
      };
      nodes.push(relatedNode);

      // Add edge from main entity to related entity
      const link: GraphLink = {
        source: mainEntity.id,
        target: relatedEntity.id,
      };
      links.push(link);
    });

    return { nodes, links };
  }
}
