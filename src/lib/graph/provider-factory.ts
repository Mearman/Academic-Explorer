/**
 * Factory for creating graph visualization providers
 * Supports runtime switching between different graph libraries
 */

import { XYFlowProvider } from './providers/xyflow/xyflow-provider';
// Future providers can be imported here
// import { D3Provider } from './providers/d3/d3-provider';
// import { CytoscapeProvider } from './providers/cytoscape/cytoscape-provider';

import type { GraphProvider, ProviderType } from './types';

/**
 * Create a graph provider instance based on type
 */
export function createGraphProvider(type: ProviderType): GraphProvider {
  switch (type) {
    case 'xyflow':
      return new XYFlowProvider();

    case 'd3':
      // TODO: Implement D3Provider
      throw new Error('D3 provider not yet implemented');
      // return new D3Provider();

    case 'cytoscape':
      // TODO: Implement CytoscapeProvider
      throw new Error('Cytoscape provider not yet implemented');
      // return new CytoscapeProvider();

    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Get available provider types
 */
export function getAvailableProviders(): ProviderType[] {
  return ['xyflow']; // Add 'd3', 'cytoscape' when implemented
}

/**
 * Check if a provider type is supported
 */
export function isProviderSupported(type: string): type is ProviderType {
  return getAvailableProviders().includes(type as ProviderType);
}