/**
 * Integration tests for the graph engine registry system
 * 
 * Tests that D3 Force and Cytoscape engines are properly registered
 * and can be created through the engine system.
 */

import { describe, expect, it } from 'vitest';

import {
  createEngineByType,
  getAvailableEngineTypes,
  isEngineImplemented,
  ENGINE_DISPLAY_NAMES,
  ENGINE_RECOMMENDATIONS,
  PERFORMANCE_CATEGORIES,
} from './index';

describe('Graph Engine Registry Integration', () => {
  it('should include D3 Force and Cytoscape in available engine types', () => {
    const availableTypes = getAvailableEngineTypes();
    
    expect(availableTypes).toContain('d3-force');
    expect(availableTypes).toContain('cytoscape');
    expect(availableTypes).toContain('canvas-2d');
    expect(availableTypes).toContain('webgl');
  });

  it('should correctly identify implemented engines', () => {
    expect(isEngineImplemented('d3-force')).toBe(true);
    expect(isEngineImplemented('cytoscape')).toBe(true);
    expect(isEngineImplemented('canvas-2d')).toBe(true);
    expect(isEngineImplemented('webgl')).toBe(true);
    
    // Not yet implemented
    expect(isEngineImplemented('svg')).toBe(false);
    expect(isEngineImplemented('vis-network')).toBe(false);
  });

  it('should have display names for all engines', () => {
    expect(ENGINE_DISPLAY_NAMES['d3-force']).toBe('D3 Force Simulation');
    expect(ENGINE_DISPLAY_NAMES['cytoscape']).toBe('Cytoscape.js');
    expect(ENGINE_DISPLAY_NAMES['canvas-2d']).toBe('Canvas 2D');
    expect(ENGINE_DISPLAY_NAMES['webgl']).toBe('WebGL Accelerated');
  });

  it('should include implemented engines in recommendations', () => {
    // D3 Force should be recommended for small interactive graphs
    expect(ENGINE_RECOMMENDATIONS.SMALL_GRAPHS).toContain('d3-force');
    expect(ENGINE_RECOMMENDATIONS.INTERACTIVE).toContain('d3-force');
    
    // Cytoscape should be recommended for analytical work
    expect(ENGINE_RECOMMENDATIONS.ANALYTICAL).toContain('cytoscape');
    expect(ENGINE_RECOMMENDATIONS.MEDIUM_GRAPHS).toContain('cytoscape');
    
    // Canvas should be recommended for balanced performance
    expect(ENGINE_RECOMMENDATIONS.MEDIUM_GRAPHS).toContain('canvas-2d');
    expect(ENGINE_RECOMMENDATIONS.HIGH_PERFORMANCE).toContain('canvas-2d');
  });

  it('should include implemented engines in performance categories', () => {
    expect(PERFORMANCE_CATEGORIES.FEATURE_RICH).toContain('cytoscape');
    expect(PERFORMANCE_CATEGORIES.BALANCED).toContain('d3-force');
    expect(PERFORMANCE_CATEGORIES.BALANCED).toContain('canvas-2d');
    expect(PERFORMANCE_CATEGORIES.MEMORY_EFFICIENT).toContain('canvas-2d');
    expect(PERFORMANCE_CATEGORIES.MEMORY_EFFICIENT).toContain('d3-force');
  });

  it('should be able to create D3 Force engine', async () => {
    const engine = await createEngineByType('d3-force');
    
    expect(engine).toBeDefined();
    expect(engine.id).toBe('d3-force');
    expect(engine.name).toBe('D3.js Force Simulation');
    expect(engine.isImplemented).toBe(true);
  });

  it('should be able to create Cytoscape engine', async () => {
    const engine = await createEngineByType('cytoscape');
    
    expect(engine).toBeDefined();
    expect(engine.id).toBe('cytoscape');
    expect(engine.name).toBe('Cytoscape.js');
    expect(engine.description).toContain('network visualization');
  });

  it('should be able to create Canvas engine', async () => {
    const engine = await createEngineByType('canvas-2d');
    
    expect(engine).toBeDefined();
    expect(engine.id).toBe('canvas');  // Actual ID from implementation
    expect(engine.name).toBe('HTML5 Canvas Renderer');
    expect(engine.description).toContain('2D rendering');
  });

  it('should be able to create WebGL engine', async () => {
    const engine = await createEngineByType('webgl');
    
    expect(engine).toBeDefined();
    expect(engine.id).toBe('webgl');
    expect(engine.name).toBe('WebGL Renderer');
    expect(engine.description).toContain('GPU-accelerated');
  });

  it('should throw error for unimplemented engines', async () => {
    await expect(createEngineByType('svg')).rejects.toThrow('Engine svg is not yet implemented');
    await expect(createEngineByType('vis-network')).rejects.toThrow('Engine vis-network is not yet implemented');
  });
});