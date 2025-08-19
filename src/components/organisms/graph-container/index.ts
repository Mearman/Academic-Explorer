/**
 * Universal Graph Container System
 * 
 * Provides a universal graph container with support for multiple rendering engines.
 * 
 * @version 1.0.0
 * @author Academic Explorer Team
 */

// ============================================================================
// Core Components
// ============================================================================

// Re-export the enhanced GraphSection that now includes engine support
export { GraphSection } from '../graph-section/GraphSection';

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Basic GraphSection usage
 * 
 * ```typescript
 * <GraphSection
 *   showEngineSelector={true}
 *   showTransitionOverlay={true}
 *   onVertexClick={handleVertexClick}
 * />
 * ```
 * 
 * Example: Advanced configuration
 * 
 * ```typescript
 * import { GraphEngineProvider } from '../graph-engines';
 * 
 * <GraphEngineProvider>
 *   <GraphSection
 *     engineType="webgl"
 *     showEngineSelector={true}
 *     showTransitionOverlay={true}
 *     onVertexClick={handleVertexClick}
 *   />
 * </GraphEngineProvider>
 * ```
 */

// ============================================================================
// Features
// ============================================================================

/**
 * AVAILABLE FEATURES
 * ==================
 * 
 * 1. MULTIPLE RENDERING ENGINES
 *    - Canvas 2D: High performance for medium graphs
 *    - SVG: Vector graphics with crisp rendering
 *    - WebGL: GPU-accelerated for large graphs
 *    - D3 Force: Interactive physics simulation
 *    - Cytoscape: Feature-rich graph analysis
 * 
 * 2. ENGINE MANAGEMENT
 *    - Automatic performance optimisation
 *    - Smooth engine transitions
 *    - Engine-specific settings
 *    - Better error handling and recovery
 * 
 * 3. USER INTERFACE
 *    - Engine selector for user control
 *    - Transition overlays for smooth switches
 *    - Performance monitoring
 *    - Configuration panels
 */