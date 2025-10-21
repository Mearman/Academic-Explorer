import type { OpenAlexEntity } from "@academic-explorer/types";
import type { MantineTheme } from "@mantine/core";
import type { GraphAdapterConfig as AdapterSpecificConfig } from "../configs";

export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  z?: number;
  color?: string;
  size?: number;
  entityType?: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  value?: number;
  color?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ThemeColors {
  colors: {
    text: {
      primary: string;
      secondary: string;
    };
    background: {
      primary: string;
      secondary: string;
      overlay: string;
      tertiary: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
    primary: string;
  };
  getColor: (color: string, shade?: number) => string;
  getEntityColor: (entityType: string | null | undefined) => string;
  getEntityColorShade: (
    entityType: string | null | undefined,
    shade?: number,
  ) => string;
}

export interface GraphAdapterConfig {
  width: number;
  height: number;
  themeColors: ThemeColors;
  interactive?: boolean;
  fitView?: boolean;
}

export interface GraphAdapter {
  /**
   * Renders the graph component
   */
  render({
    data,
    config,
  }: {
    data: GraphData;
    config: GraphAdapterConfig;
  }): React.ReactElement;

  /**
   * Converts OpenAlex entities to graph data format
   */
  convertEntitiesToGraphData({
    mainEntity,
    relatedEntities,
  }: {
    mainEntity: OpenAlexEntity;
    relatedEntities: OpenAlexEntity[];
  }): GraphData;

  /**
   * Optional: Fit view to show all nodes
   */
  fitView?(): void;
}
