import type { GraphAdapter } from "./GraphAdapter";

const REACTFLOW_HIERARCHICAL = "reactflow-hierarchical" as const;

export type GraphAdapterType =
  | typeof REACTFLOW_HIERARCHICAL
  | "react-force-graph-2d"
  | "react-force-graph-3d"
  | "r3f-forcegraph";

export class GraphAdapterFactory {
  private static adapterCache = new Map<GraphAdapterType, GraphAdapter>();

  static async createAdapter(type: GraphAdapterType): Promise<GraphAdapter> {
    // Check cache first
    if (this.adapterCache.has(type)) {
      const cachedAdapter = this.adapterCache.get(type);
      if (cachedAdapter) {
        return cachedAdapter;
      }
    }

    let adapter: GraphAdapter;

    switch (type) {
      case REACTFLOW_HIERARCHICAL: {
        const { ReactFlowAdapter } = await import("./ReactFlowAdapter");
        adapter = new ReactFlowAdapter();
        break;
      }
      case "react-force-graph-2d": {
        const { ReactForceGraph2DAdapter } = await import(
          "./ReactForceGraph2DAdapter"
        );
        adapter = new ReactForceGraph2DAdapter();
        break;
      }
      case "react-force-graph-3d": {
        const { ReactForceGraph3DAdapter } = await import(
          "./ReactForceGraph3DAdapter"
        );
        adapter = new ReactForceGraph3DAdapter();
        break;
      }
      case "r3f-forcegraph": {
        const { R3FForceGraphAdapter } = await import("./R3FForceGraphAdapter");
        adapter = new R3FForceGraphAdapter();
        break;
      }
      default:
        throw new Error(`Unknown graph adapter type: ${type}`);
    }

    // Cache the adapter instance
    this.adapterCache.set(type, adapter);
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
