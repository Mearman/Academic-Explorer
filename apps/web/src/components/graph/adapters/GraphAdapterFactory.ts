import type { GraphAdapter } from "./GraphAdapter";
import type { GraphAdapterConfig } from "../configs";

const REACTFLOW_HIERARCHICAL = "reactflow-hierarchical" as const;

export type GraphAdapterType =
  | typeof REACTFLOW_HIERARCHICAL
  | "react-force-graph-2d"
  | "react-force-graph-3d"
  | "r3f-forcegraph";

export class GraphAdapterFactory {
  private static adapterCache = new Map<string, GraphAdapter>();

  static async createAdapter({
    type,
    config,
  }: {
    type: GraphAdapterType;
    config?: GraphAdapterConfig;
  }): Promise<GraphAdapter> {
    // Create cache key that includes config to ensure different configs get different instances
    const cacheKey = config ? `${type}-${JSON.stringify(config)}` : type;

    // Check cache first
    if (this.adapterCache.has(cacheKey)) {
      const cachedAdapter = this.adapterCache.get(cacheKey);
      if (cachedAdapter) {
        return cachedAdapter;
      }
    }

    let adapter: GraphAdapter;

    switch (type) {
      case REACTFLOW_HIERARCHICAL: {
        const { ReactFlowAdapter } = await import("./ReactFlowAdapter");
        adapter = new ReactFlowAdapter(
          config as import("../configs").ReactFlowConfig | undefined,
        );
        break;
      }
      case "react-force-graph-2d": {
        const { ReactForceGraph2DAdapter } = await import(
          "./ReactForceGraph2DAdapter"
        );
        adapter = new ReactForceGraph2DAdapter(
          config as import("../configs").ReactForceGraph2DConfig | undefined,
        );
        break;
      }
      case "react-force-graph-3d": {
        const { ReactForceGraph3DAdapter } = await import(
          "./ReactForceGraph3DAdapter"
        );
        adapter = new ReactForceGraph3DAdapter(
          config as import("../configs").ReactForceGraph3DConfig | undefined,
        );
        break;
      }
      case "r3f-forcegraph": {
        const { R3FForceGraphAdapter } = await import("./R3FForceGraphAdapter");
        adapter = new R3FForceGraphAdapter(
          config as import("../configs").R3FForceGraphConfig | undefined,
        );
        break;
      }
      default:
        throw new Error(`Unknown graph adapter type: ${type}`);
    }

    // Cache the adapter instance
    this.adapterCache.set(cacheKey, adapter);
    return adapter;
  }

  static getAvailableAdapters(): GraphAdapterType[] {
    return [
      REACTFLOW_HIERARCHICAL,
      "react-force-graph-2d",
      "react-force-graph-3d",
      "r3f-forcegraph",
    ];
  }

  static getDefaultAdapter(): GraphAdapterType {
    return REACTFLOW_HIERARCHICAL;
  }
}
