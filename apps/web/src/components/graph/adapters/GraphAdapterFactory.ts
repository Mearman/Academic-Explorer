import type { GraphAdapter } from "./GraphAdapter";

export type GraphAdapterType =
  | "reactflow-hierarchical"
  | "react-force-graph-3d";

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
      case "reactflow-hierarchical": {
        const { ReactFlowAdapter } = await import("./ReactFlowAdapter");
        adapter = new ReactFlowAdapter();
        break;
      }
      case "react-force-graph-3d": {
        const { ReactForceGraph3DAdapter } = await import(
          "./ReactForceGraph3DAdapter"
        );
        adapter = new ReactForceGraph3DAdapter();
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
    return ["reactflow-hierarchical", "react-force-graph-3d"];
  }

  static getDefaultAdapter(): GraphAdapterType {
    return "reactflow-hierarchical";
  }
}
