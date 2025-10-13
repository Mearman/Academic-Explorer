import type { OpenAlexEntity } from "@academic-explorer/client";
import type { MantineTheme } from "@mantine/core";

export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  z?: number;
  color?: string;
  size?: number;
  entityType?: string;
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
      tertiary: string;
      inverse: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      overlay: string;
      blur: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
    primary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    entity: {
      work: string;
      author: string;
      source: string;
      institution: string;
      concept: string;
      topic: string;
      publisher: string;
      funder: string;
    };
  };
  getColor: (color: string, shade?: number) => string;
  getEntityColor: (entityType: string) => string;
  getEntityColorShade: (entityType: string, shade?: number) => string;
  isDark: boolean;
  theme: MantineTheme;
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
  render(data: GraphData, config: GraphAdapterConfig): React.ReactElement;

  /**
   * Converts OpenAlex entities to graph data format
   */
  convertEntitiesToGraphData(
    mainEntity: OpenAlexEntity,
    relatedEntities: OpenAlexEntity[],
  ): GraphData;

  /**
   * Optional: Fit view to show all nodes
   */
  fitView?(): void;
}
