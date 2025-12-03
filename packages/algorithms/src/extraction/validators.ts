/**
 * Validation utilities for graph extraction operations
 */
import type { Graph } from '../graph/graph';
import type {
  ExtractionError,
  InvalidFilterError,
  InvalidInputError,
  InvalidTrussError,
} from '../types/errors';
import type { Edge,Node } from '../types/graph';
import type { Result } from '../types/result';

/**
 * Options for ego network extraction
 */
export interface EgoNetworkOptions {
  /** Radius (number of hops) for the ego network */
  radius: number;
  /** Seed node IDs to start from */
  seedNodes: string[];
  /** Whether to include the seed nodes in the result (default: true) */
  includeSeed?: boolean;
}

/**
 * Filter specification for subgraph filtering
 */
export interface SubgraphFilter<N extends Node = Node, E extends Edge = Edge> {
  /** Node filter predicate */
  nodePredicate?: (node: N) => boolean;
  /** Edge filter predicate */
  edgePredicate?: (edge: E) => boolean;
  /** Filter by node attribute values */
  nodeAttributes?: Record<string, unknown>;
  /** Filter by edge types */
  edgeTypes?: Set<string>;
  /** Combine multiple filters with AND (default) or OR */
  combineMode?: 'and' | 'or';
}

/**
 * Options for k-truss extraction
 */
export interface KTrussOptions {
  /** Minimum triangle support (k) for edges to be included */
  k: number;
  /** Whether to return all k-trusses up to max k */
  returnHierarchy?: boolean;
}

/**
 * Validates ego network extraction options.
 * @param graph - The graph to extract from
 * @param options - Ego network options to validate
 * @returns Result with validated options or error
 */
export const validateEgoNetworkOptions = <N extends Node, E extends Edge>(graph: Graph<N, E>, options: EgoNetworkOptions): Result<EgoNetworkOptions, ExtractionError> => {
  // Validate radius
  if (typeof options.radius !== 'number' || options.radius < 0) {
    return {
      ok: false,
      error: {
        type: 'invalid-radius',
        message: `Radius must be a non-negative number, got: ${options.radius}`,
        radius: options.radius,
      },
    };
  }

  if (!Number.isInteger(options.radius)) {
    return {
      ok: false,
      error: {
        type: 'invalid-radius',
        message: `Radius must be an integer, got: ${options.radius}`,
        radius: options.radius,
      },
    };
  }

  // Validate seed nodes
  if (!options.seedNodes || options.seedNodes.length === 0) {
    return {
      ok: false,
      error: {
        type: 'invalid-input',
        message: 'At least one seed node is required',
        input: options.seedNodes,
      },
    };
  }

  // Check that all seed nodes exist in the graph
  for (const seedId of options.seedNodes) {
    const nodeOption = graph.getNode(seedId);
    if (!nodeOption.some) {
      return {
        ok: false,
        error: {
          type: 'node-not-found',
          message: `Seed node not found in graph: ${seedId}`,
          nodeId: seedId,
        },
      };
    }
  }

  // Return validated options with defaults
  return {
    ok: true,
    value: {
      ...options,
      includeSeed: options.includeSeed ?? true,
    },
  };
};

/**
 * Validates subgraph filter specification.
 * @param filter - Filter to validate
 * @returns Result with validated filter or error
 */
export const validateSubgraphFilter = <N extends Node, E extends Edge>(filter: SubgraphFilter<N, E>): Result<SubgraphFilter<N, E>, InvalidFilterError> => {
  if (!filter) {
    return {
      ok: false,
      error: {
        type: 'invalid-filter',
        message: 'Filter is null or undefined',
        filter,
      },
    };
  }

  // At least one filter criterion should be specified
  const hasNodePredicate = typeof filter.nodePredicate === 'function';
  const hasEdgePredicate = typeof filter.edgePredicate === 'function';
  const hasNodeAttributes = filter.nodeAttributes && Object.keys(filter.nodeAttributes).length > 0;
  const hasEdgeTypes = filter.edgeTypes && filter.edgeTypes.size > 0;

  if (!hasNodePredicate && !hasEdgePredicate && !hasNodeAttributes && !hasEdgeTypes) {
    // Empty filter is valid - returns full graph
    return {
      ok: true,
      value: {
        ...filter,
        combineMode: filter.combineMode ?? 'and',
      },
    };
  }

  return {
    ok: true,
    value: {
      ...filter,
      combineMode: filter.combineMode ?? 'and',
    },
  };
};

/**
 * Validates k-truss extraction options.
 * @param options - K-truss options to validate
 * @returns Result with validated options or error
 */
export const validateKTrussOptions = (options: KTrussOptions): Result<KTrussOptions, InvalidTrussError | InvalidInputError> => {
  if (!options) {
    return {
      ok: false,
      error: {
        type: 'invalid-input',
        message: 'Options is null or undefined',
        input: options,
      },
    };
  }

  // k must be at least 2 (2-truss is the entire graph)
  if (typeof options.k !== 'number' || options.k < 2) {
    return {
      ok: false,
      error: {
        type: 'invalid-truss',
        message: `k must be an integer >= 2, got: ${options.k}`,
        k: options.k,
      },
    };
  }

  if (!Number.isInteger(options.k)) {
    return {
      ok: false,
      error: {
        type: 'invalid-truss',
        message: `k must be an integer, got: ${options.k}`,
        k: options.k,
      },
    };
  }

  return {
    ok: true,
    value: {
      ...options,
      returnHierarchy: options.returnHierarchy ?? false,
    },
  };
};
