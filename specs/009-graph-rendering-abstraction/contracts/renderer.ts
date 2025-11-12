/**
 * Graph Rendering Abstraction Contracts
 *
 * TypeScript interface definitions for pluggable graph renderer adapters.
 * This contract enables multiple rendering implementations (Canvas, SVG, WebGL)
 * while maintaining a consistent API surface.
 *
 * @see specs/009-graph-rendering-abstraction/data-model.md
 */

/**
 * Base node structure for graph visualization.
 *
 * Generic type parameter TData allows domain-specific metadata while maintaining
 * renderer independence per FR-017 and FR-020.
 *
 * @template TData - Custom metadata type (must be JSON-serializable)
 */
export interface Node<TData = unknown> {
	/**
	 * Unique node identifier.
	 * Must be non-empty and unique within the graph.
	 */
	id: string;

	/**
	 * Type discriminator for visual configuration mapping.
	 * Used to look up visual properties in VisualConfigMap.
	 */
	type: string;

	/**
	 * X-coordinate position in viewport space.
	 * Must be a finite number (no NaN or Infinity).
	 */
	x: number;

	/**
	 * Y-coordinate position in viewport space.
	 * Must be a finite number (no NaN or Infinity).
	 */
	y: number;

	/**
	 * X-axis velocity (pixels per second).
	 * Used by physics simulation engines.
	 * @default 0
	 */
	vx?: number;

	/**
	 * Y-axis velocity (pixels per second).
	 * Used by physics simulation engines.
	 * @default 0
	 */
	vy?: number;

	/**
	 * X-axis force accumulator (Newtons).
	 * Forces are accumulated here during simulation ticks.
	 * @default 0
	 */
	fx?: number;

	/**
	 * Y-axis force accumulator (Newtons).
	 * Forces are accumulated here during simulation ticks.
	 * @default 0
	 */
	fy?: number;

	/**
	 * Pin node to current position.
	 * When true, position is locked and forces are ignored.
	 * @default false
	 */
	fixed?: boolean;

	/**
	 * Domain-specific metadata (generic).
	 * Examples: academic paper metadata, user profile data, etc.
	 * Must be JSON-serializable for persistence.
	 */
	data?: TData;
}

/**
 * Base edge structure representing connections between nodes.
 *
 * Generic type parameter TData allows domain-specific relationship metadata.
 *
 * @template TData - Custom metadata type (must be JSON-serializable)
 */
export interface Edge<TData = unknown> {
	/**
	 * Unique edge identifier.
	 * Must be non-empty and unique within the graph.
	 */
	id: string;

	/**
	 * Type discriminator for visual configuration mapping.
	 * Used to look up visual properties in VisualConfigMap.
	 */
	type: string;

	/**
	 * Source node ID.
	 * Must reference an existing node in the graph (FR-016).
	 */
	source: string;

	/**
	 * Target node ID.
	 * Must reference an existing node in the graph (FR-016).
	 */
	target: string;

	/**
	 * Directionality flag.
	 * When true, edge is rendered with an arrow pointing to target.
	 * @default true
	 */
	directed?: boolean;

	/**
	 * Spring strength for attraction force.
	 * Higher values pull connected nodes together more strongly.
	 * Must be a finite positive number.
	 * @default 1.0
	 */
	strength?: number;

	/**
	 * Ideal length for spring force (pixels).
	 * Connected nodes will try to maintain this distance.
	 * Must be a finite positive number.
	 * @default 30
	 */
	distance?: number;

	/**
	 * Exclude edge from rendering but include in force calculations.
	 * Useful for maintaining graph structure without visual clutter.
	 * @default false
	 */
	hidden?: boolean;

	/**
	 * Domain-specific relationship metadata (generic).
	 * Examples: citation count, collaboration strength, etc.
	 * Must be JSON-serializable for persistence.
	 */
	data?: TData;
}

/**
 * Visual configuration for rendering nodes.
 *
 * Defines how nodes of a specific type should appear visually.
 * All properties are optional to allow incremental configuration.
 */
export interface NodeVisualConfig<TNode extends Node = Node> {
	/**
	 * Node radius in pixels.
	 * @default 5
	 */
	size?: number;

	/**
	 * Fill color (CSS color string).
	 * Examples: "#FF0000", "rgb(255, 0, 0)", "red"
	 * @default "#999999"
	 */
	color?: string;

	/**
	 * Node shape variant.
	 * @default "circle"
	 */
	shape?: "circle" | "square" | "triangle";

	/**
	 * Function to extract label text from node.
	 * Return empty string to hide label.
	 *
	 * @param node - Node instance to generate label for
	 * @returns Label text to display
	 *
	 * @example
	 * ```typescript
	 * label: (node) => node.data?.title || node.id
	 * ```
	 */
	label?: (node: TNode) => string;
}

/**
 * Visual configuration for rendering edges.
 *
 * Defines how edges of a specific type should appear visually.
 * All properties are optional to allow incremental configuration.
 */
export interface EdgeVisualConfig<TEdge extends Edge = Edge> {
	/**
	 * Stroke color (CSS color string).
	 * Examples: "#0000FF", "rgba(0, 0, 255, 0.5)", "blue"
	 * @default "#CCCCCC"
	 */
	color?: string;

	/**
	 * Line width in pixels.
	 * @default 1
	 */
	width?: number;

	/**
	 * Line style variant.
	 * @default "solid"
	 */
	style?: "solid" | "dashed" | "dotted";

	/**
	 * Arrow head style for directed edges.
	 * Only applies when edge.directed is true.
	 * @default "triangle"
	 */
	arrowStyle?: "triangle" | "arrow" | "diamond";
}

/**
 * Mapping from node/edge types to visual configurations.
 *
 * Provides type-safe lookup of visual properties based on node.type and edge.type.
 *
 * @template TNode - Node type with specific data shape
 * @template TEdge - Edge type with specific data shape
 *
 * @example
 * ```typescript
 * const config: VisualConfigMap<AcademicNode, CitationEdge> = {
 *   node: {
 *     work: { size: 10, color: "#4A90E2", label: (n) => n.data.title },
 *     author: { size: 8, color: "#E94B3C", label: (n) => n.data.name }
 *   },
 *   edge: {
 *     citation: { color: "#666666", width: 1, style: "solid" },
 *     collaboration: { color: "#00CC66", width: 2, style: "dashed" }
 *   }
 * };
 * ```
 */
export interface VisualConfigMap<
	TNode extends Node = Node,
	TEdge extends Edge = Edge,
> {
	/**
	 * Node type to visual configuration mapping.
	 * Key is node.type, value is configuration object.
	 */
	node: Record<string, NodeVisualConfig<TNode>>;

	/**
	 * Edge type to visual configuration mapping.
	 * Key is edge.type, value is configuration object.
	 */
	edge: Record<string, EdgeVisualConfig<TEdge>>;
}

/**
 * Graph data structure container.
 *
 * Simple container for nodes and edges without enforcing graph invariants.
 * Validation should be performed by the consuming renderer or simulation.
 *
 * @template TNode - Node type with specific data shape
 * @template TEdge - Edge type with specific data shape
 */
export interface Graph<TNode extends Node = Node, TEdge extends Edge = Edge> {
	/**
	 * Array of nodes in the graph.
	 * IDs should be unique but this is not enforced at the type level.
	 */
	nodes: TNode[];

	/**
	 * Array of edges in the graph.
	 * IDs should be unique and source/target should reference existing nodes,
	 * but this is not enforced at the type level.
	 */
	edges: TEdge[];
}

/**
 * Event handler types for user interaction.
 */

/**
 * Handler for node or edge click events.
 *
 * @template T - Node or Edge type
 * @param target - The clicked node or edge
 */
export type ClickHandler<T> = (target: T) => void;

/**
 * Handler for node or edge hover events.
 *
 * @template T - Node or Edge type
 * @param target - The hovered node/edge, or null when hover ends
 */
export type HoverHandler<T> = (target: T | null) => void;

/**
 * Handler for node drag events.
 *
 * @template TNode - Node type
 * @param node - The node being dragged
 * @param position - New position after drag
 */
export type DragHandler<TNode extends Node> = (
	node: TNode,
	position: { x: number; y: number }
) => void;

/**
 * Event type discriminator for event handler registration.
 */
export type RendererEventType = "click" | "hover" | "drag";

/**
 * Pluggable renderer adapter interface.
 *
 * This contract enables multiple rendering implementations (Canvas, SVG, WebGL)
 * to be used interchangeably. Renderers are responsible for:
 * - Lifecycle management (init, destroy, resize)
 * - Visual rendering (render, clear)
 * - Event delegation (on)
 *
 * @template TNode - Node type with specific data shape
 * @template TEdge - Edge type with specific data shape
 *
 * @remarks
 * Implementations must handle their own internal state and cleanup.
 * The adapter pattern ensures renderers can be swapped without changing
 * consuming code (FR-017).
 *
 * @example
 * ```typescript
 * class CanvasRenderer implements RendererAdapter<AcademicNode, CitationEdge> {
 *   private ctx: CanvasRenderingContext2D | null = null;
 *
 *   init(container: HTMLElement, width: number, height: number): void {
 *     const canvas = document.createElement('canvas');
 *     canvas.width = width;
 *     canvas.height = height;
 *     this.ctx = canvas.getContext('2d');
 *     container.appendChild(canvas);
 *   }
 *
 *   render(graph: Graph<AcademicNode, CitationEdge>, config: VisualConfigMap): void {
 *     if (!this.ctx) return;
 *     // Canvas rendering logic...
 *   }
 *
 *   destroy(): void {
 *     this.ctx = null;
 *     // Cleanup...
 *   }
 * }
 * ```
 */
export interface RendererAdapter<
	TNode extends Node = Node,
	TEdge extends Edge = Edge,
> {
	// ============================================================
	// Lifecycle Methods
	// ============================================================

	/**
	 * Initialize the renderer within a container element.
	 *
	 * Implementations should:
	 * 1. Create necessary DOM elements (canvas, svg, webgl context)
	 * 2. Append elements to container
	 * 3. Set up initial dimensions
	 * 4. Initialize internal rendering state
	 *
	 * @param container - Parent DOM element to render into
	 * @param width - Initial viewport width in pixels
	 * @param height - Initial viewport height in pixels
	 *
	 * @throws {Error} If initialization fails (missing WebGL support, etc.)
	 */
	init(container: HTMLElement, width: number, height: number): void;

	/**
	 * Clean up and release resources.
	 *
	 * Implementations should:
	 * 1. Remove all DOM elements
	 * 2. Clear event listeners
	 * 3. Release WebGL contexts/Canvas references
	 * 4. Clear internal state
	 *
	 * After calling destroy(), the renderer instance should not be reused.
	 * Create a new instance if rendering is needed again.
	 */
	destroy(): void;

	/**
	 * Resize the renderer viewport.
	 *
	 * Called when container dimensions change (window resize, container mutation).
	 * Implementations should update canvas/SVG dimensions and trigger re-render.
	 *
	 * @param width - New viewport width in pixels
	 * @param height - New viewport height in pixels
	 */
	resize(width: number, height: number): void;

	// ============================================================
	// Rendering Methods
	// ============================================================

	/**
	 * Render the graph with visual configuration.
	 *
	 * This method is called every animation frame when simulation is running,
	 * or on-demand for static layouts.
	 *
	 * Implementations should:
	 * 1. Clear previous frame
	 * 2. Apply transformations (pan, zoom)
	 * 3. Render edges (bottom layer)
	 * 4. Render nodes (top layer)
	 * 5. Apply visual config based on node/edge types
	 *
	 * @param graph - Current graph state (nodes with updated positions)
	 * @param visualConfig - Type-to-visual-property mappings
	 *
	 * @remarks
	 * Rendering must be non-mutating. Do not modify graph nodes or edges.
	 * Use visual config to determine appearance, not node.data directly.
	 */
	render(graph: Graph<TNode, TEdge>, visualConfig: VisualConfigMap<TNode, TEdge>): void;

	/**
	 * Clear the viewport.
	 *
	 * Remove all rendered content without destroying the renderer.
	 * Useful for animations or transitioning between graphs.
	 */
	clear(): void;

	// ============================================================
	// Event Handling
	// ============================================================

	/**
	 * Register event handler for user interactions.
	 *
	 * Implementations should:
	 * 1. Add DOM event listeners on rendering surface
	 * 2. Perform hit detection (spatial index, bounding boxes)
	 * 3. Invoke handler with appropriate target (node or edge)
	 *
	 * @param event - Event type to listen for
	 * @param handler - Callback function to invoke
	 *
	 * @remarks
	 * Multiple handlers can be registered for the same event type.
	 * Handlers should be removed in destroy() to prevent memory leaks.
	 *
	 * @example
	 * ```typescript
	 * renderer.on('click', (target) => {
	 *   if ('entityType' in target) {
	 *     console.log('Clicked node:', target.id);
	 *   } else {
	 *     console.log('Clicked edge:', target.id);
	 *   }
	 * });
	 * ```
	 */
	on(
		event: "click",
		handler: ClickHandler<TNode | TEdge>
	): void;
	on(event: "hover", handler: HoverHandler<TNode | TEdge>): void;
	on(event: "drag", handler: DragHandler<TNode>): void;
}

/**
 * Validation result type for graph validation.
 *
 * Used by validation functions to report success or errors.
 */
export interface ValidationResult {
	/**
	 * Whether validation passed.
	 */
	valid: boolean;

	/**
	 * Error message if validation failed.
	 * Only present when valid is false.
	 */
	error?: string;
}
