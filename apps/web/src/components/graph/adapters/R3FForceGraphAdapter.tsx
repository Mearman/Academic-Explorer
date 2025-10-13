import React, { useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import R3fForceGraph, { GraphMethods } from "r3f-forcegraph";

import type {
  GraphData,
  GraphAdapterConfig,
  GraphAdapter,
  GraphNode,
  GraphLink,
} from "./GraphAdapter";

function R3FForceGraphScene({
  data,
  config,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
}) {
  const fgRef = useRef<GraphMethods | undefined>(undefined);

  // Call tickFrame on every frame to update the simulation
  useFrame(() => {
    if (fgRef.current) {
      fgRef.current.tickFrame();
    }
  });

  // Convert GraphData to r3f-forcegraph format
  const graphData = useMemo(() => {
    const convertedNodes = data.nodes.map((node) => ({
      id: node.id,
      name: node.label,
      color:
        node.color === "primary"
          ? config.themeColors.colors.primary
          : config.themeColors.colors.background.tertiary,
      val: node.size || 4,
    }));

    const convertedLinks = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value || 1,
    }));

    return {
      nodes: convertedNodes,
      links: convertedLinks,
    };
  }, [data, config.themeColors]);

  const nodeColor = useCallback(
    (node: { color?: string }) => {
      return node.color || config.themeColors.colors.background.tertiary;
    },
    [config.themeColors],
  );

  const linkColor = useCallback(() => {
    return config.themeColors.colors.border.secondary;
  }, [config.themeColors]);

  return (
    <>
      <OrbitControls
        enablePan={config.interactive ?? false}
        enableZoom={config.interactive ?? false}
        enableRotate={config.interactive ?? false}
      />
      <ambientLight args={[config.themeColors.colors.text.primary, 0.5]} />
      <directionalLight
        args={[config.themeColors.colors.text.primary, 0.8]}
        position={[1000, 1000, 1000]}
      />
      <R3fForceGraph
        ref={fgRef}
        graphData={graphData}
        nodeColor={nodeColor}
        nodeVal={(node: { val: number }) => node.val}
        linkColor={linkColor}
        linkWidth={2}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        nodeOpacity={0.8}
        linkOpacity={0.3}
        cooldownTicks={100}
        warmupTicks={30}
      />
    </>
  );
}

function R3FForceGraphComponent({
  data,
  config,
}: {
  data: GraphData;
  config: GraphAdapterConfig;
}) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 1000], far: 8000 }}
        style={{ background: config.themeColors.colors.background.secondary }}
      >
        <R3FForceGraphScene data={data} config={config} />
      </Canvas>
    </div>
  );
}

export class R3FForceGraphAdapter implements GraphAdapter {
  convertEntitiesToGraphData(
    mainEntity: { id: string; display_name?: string },
    relatedEntities: Array<{ id: string; display_name?: string }>,
  ): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add main entity node
    const mainNode = {
      id: mainEntity.id,
      label: mainEntity.display_name || mainEntity.id,
      color: "primary",
      size: 6,
    };
    nodes.push(mainNode);

    // Add related entity nodes
    relatedEntities.forEach((relatedEntity) => {
      const relatedNode = {
        id: relatedEntity.id,
        label: relatedEntity.display_name || relatedEntity.id,
        color: "secondary",
        size: 4,
      };
      nodes.push(relatedNode);

      // Add edge from main entity to related entity
      const link = {
        source: mainEntity.id,
        target: relatedEntity.id,
        value: 1,
      };
      links.push(link);
    });

    return { nodes, links };
  }

  render(data: GraphData, config: GraphAdapterConfig): React.ReactElement {
    return <R3FForceGraphComponent data={data} config={config} />;
  }
}
