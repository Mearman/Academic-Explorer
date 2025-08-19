/**
 * Mouse interaction strategies for graph components
 * Provides pluggable mouse-based interactions (pan, zoom, select, hover, drag)
 */

import {
  MouseInteractionStrategy,
  MouseInteractionEvent,
  InteractionResult,
  InteractionResults,
  GraphElement,
  GraphPosition,
  InteractionResultType
} from './interaction-handlers';

// Configuration interfaces
export interface PanInteractionConfig {
  readonly button?: number; // Mouse button for panning (default: 0 = left click)
  readonly requireModifier?: 'shift' | 'ctrl' | 'alt' | 'meta' | null;
  readonly minDistance?: number; // Minimum distance before panning starts
  readonly maxVelocity?: number; // Maximum pan velocity for performance
  readonly momentum?: boolean; // Enable momentum scrolling
  readonly momentumDecay?: number; // Momentum decay factor (0-1)
}

export interface ZoomInteractionConfig {
  readonly minZoom?: number; // Minimum zoom level
  readonly maxZoom?: number; // Maximum zoom level
  readonly zoomStep?: number; // Zoom step per wheel event
  readonly zoomToPoint?: boolean; // Zoom towards mouse cursor
  readonly smoothZoom?: boolean; // Enable smooth zoom transitions
  readonly wheelSensitivity?: number; // Wheel sensitivity multiplier
}

export interface SelectInteractionConfig {
  readonly button?: number; // Mouse button for selection (default: 0 = left click)
  readonly multiSelect?: boolean; // Enable multi-selection with Ctrl/Cmd
  readonly rectangleSelect?: boolean; // Enable rectangle selection
  readonly selectOnClick?: boolean; // Select on click vs drag
  readonly clearOnBackground?: boolean; // Clear selection when clicking background
  readonly selectRadius?: number; // Selection radius for small elements
}

export interface HoverInteractionConfig {
  readonly hoverDelay?: number; // Delay before hover triggers (ms)
  readonly hoverRadius?: number; // Hover detection radius
  readonly showTooltip?: boolean; // Show tooltips on hover
  readonly persistOnLeave?: boolean; // Keep hover state when mouse leaves
}

export interface DragInteractionConfig {
  readonly button?: number; // Mouse button for dragging (default: 0 = left click)
  readonly dragElements?: readonly ('vertex' | 'edge')[];
  readonly snapToGrid?: boolean; // Snap dragged elements to grid
  readonly gridSize?: number; // Grid size for snapping
  readonly dragBounds?: { x: number; y: number; width: number; height: number } | null;
  readonly multiDrag?: boolean; // Drag multiple selected elements
}

// State tracking interfaces
interface PanState {
  active: boolean;
  startPosition: GraphPosition;
  lastPosition: GraphPosition;
  velocity: GraphPosition;
  momentum: boolean;
}

interface DragState {
  active: boolean;
  element: GraphElement | null;
  startPosition: GraphPosition;
  elementStartPosition: GraphPosition;
  offset: GraphPosition;
}

interface SelectionState {
  active: boolean;
  startPosition: GraphPosition | null;
  currentPosition: GraphPosition | null;
  selectedElements: Set<string>;
  rectangleSelection: boolean;
}

// Event callback interfaces
export interface PanEventCallbacks<TElement extends GraphElement = GraphElement> {
  onPanStart?(position: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onPanMove?(delta: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onPanEnd?(velocity: GraphPosition, event: MouseInteractionEvent<TElement>): void;
}

export interface ZoomEventCallbacks<TElement extends GraphElement = GraphElement> {
  onZoom?(zoom: number, center: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onZoomStart?(zoom: number, center: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onZoomEnd?(zoom: number, center: GraphPosition, event: MouseInteractionEvent<TElement>): void;
}

export interface SelectEventCallbacks<TElement extends GraphElement = GraphElement> {
  onSelectionChange?(selectedElements: readonly string[], event: MouseInteractionEvent<TElement>): void;
  onSelectStart?(position: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onSelectEnd?(selectedElements: readonly string[], event: MouseInteractionEvent<TElement>): void;
}

export interface HoverEventCallbacks<TElement extends GraphElement = GraphElement> {
  onHoverStart?(element: TElement, event: MouseInteractionEvent<TElement>): void;
  onHoverEnd?(element: TElement | null, event: MouseInteractionEvent<TElement>): void;
}

export interface DragEventCallbacks<TElement extends GraphElement = GraphElement> {
  onDragStart?(element: TElement, position: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onDragMove?(element: TElement, position: GraphPosition, delta: GraphPosition, event: MouseInteractionEvent<TElement>): void;
  onDragEnd?(element: TElement, position: GraphPosition, event: MouseInteractionEvent<TElement>): void;
}

// Pan interaction strategy
export class PanInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements MouseInteractionStrategy<TElement> {
  
  readonly name = 'pan';
  readonly priority = 10;
  public enabled = true;

  private readonly config: Required<PanInteractionConfig>;
  private readonly callbacks: PanEventCallbacks<TElement>;
  private readonly state: PanState = {
    active: false,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    momentum: false
  };

  private momentumAnimation: number | null = null;

  constructor(
    config: PanInteractionConfig = {},
    callbacks: PanEventCallbacks<TElement> = {}
  ) {
    this.config = {
      button: 0,
      requireModifier: null,
      minDistance: 3,
      maxVelocity: 50,
      momentum: true,
      momentumDecay: 0.95,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: MouseInteractionEvent<TElement>): boolean {
    if (!this.enabled) return false;
    
    // Check if required modifier is pressed
    if (this.config.requireModifier) {
      const modifierKey = `${this.config.requireModifier}Key` as keyof typeof event.modifiers;
      if (!event.modifiers[modifierKey]) return false;
    }

    return true;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific mouse event methods
  }

  onMouseDown(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (event.button !== this.config.button) {
      return InteractionResults.ignored();
    }

    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    // Cancel any ongoing momentum
    this.cancelMomentum();

    this.state.active = true;
    this.state.startPosition = event.position;
    this.state.lastPosition = event.position;
    this.state.velocity = { x: 0, y: 0 };

    this.callbacks.onPanStart?.(event.position, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onMouseMove(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active) {
      return InteractionResults.ignored();
    }

    const delta = {
      x: event.position.x - this.state.lastPosition.x,
      y: event.position.y - this.state.lastPosition.y
    };

    // Check minimum distance threshold
    const totalDistance = Math.sqrt(
      Math.pow(event.position.x - this.state.startPosition.x, 2) +
      Math.pow(event.position.y - this.state.startPosition.y, 2)
    );

    if (totalDistance < this.config.minDistance) {
      return InteractionResults.handled();
    }

    // Update velocity
    this.state.velocity = {
      x: Math.min(Math.max(delta.x, -this.config.maxVelocity), this.config.maxVelocity),
      y: Math.min(Math.max(delta.y, -this.config.maxVelocity), this.config.maxVelocity)
    };

    this.state.lastPosition = event.position;

    this.callbacks.onPanMove?.(delta, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onMouseUp(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active || event.button !== this.config.button) {
      return InteractionResults.ignored();
    }

    this.state.active = false;

    // Start momentum if enabled
    if (this.config.momentum && (Math.abs(this.state.velocity.x) > 1 || Math.abs(this.state.velocity.y) > 1)) {
      this.startMomentum();
    }

    this.callbacks.onPanEnd?.(this.state.velocity, event);

    return InteractionResults.handled();
  }

  private startMomentum(): void {
    if (this.momentumAnimation) return;

    const animate = (): void => {
      if (Math.abs(this.state.velocity.x) < 0.1 && Math.abs(this.state.velocity.y) < 0.1) {
        this.cancelMomentum();
        return;
      }

      // Create fake event for momentum
      const fakeEvent = {
        position: this.state.lastPosition,
        originalEvent: new MouseEvent('mousemove'),
        timestamp: Date.now(),
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        button: 0,
        buttons: 0,
        movementX: this.state.velocity.x,
        movementY: this.state.velocity.y,
        element: null
      } as MouseInteractionEvent<TElement>;

      this.callbacks.onPanMove?.(this.state.velocity, fakeEvent);

      // Apply decay
      this.state.velocity = {
        x: this.state.velocity.x * this.config.momentumDecay,
        y: this.state.velocity.y * this.config.momentumDecay
      };

      this.momentumAnimation = requestAnimationFrame(animate);
    };

    this.momentumAnimation = requestAnimationFrame(animate);
  }

  private cancelMomentum(): void {
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
      this.momentumAnimation = null;
    }
  }

  cleanup(): void {
    this.cancelMomentum();
    this.state.active = false;
  }
}

// Zoom interaction strategy
export class ZoomInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements MouseInteractionStrategy<TElement> {
  
  readonly name = 'zoom';
  readonly priority = 15;
  public enabled = true;

  private readonly config: Required<ZoomInteractionConfig>;
  private readonly callbacks: ZoomEventCallbacks<TElement>;
  private currentZoom = 1;

  constructor(
    config: ZoomInteractionConfig = {},
    callbacks: ZoomEventCallbacks<TElement> = {}
  ) {
    this.config = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomStep: 0.1,
      zoomToPoint: true,
      smoothZoom: true,
      wheelSensitivity: 1,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(): boolean {
    return this.enabled;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific mouse event methods
  }

  onWheel(event: MouseInteractionEvent<TElement> & { deltaX: number; deltaY: number; deltaZ: number }): InteractionResult {
    if (!this.canHandle()) {
      return InteractionResults.ignored();
    }

    const delta = -event.deltaY * this.config.wheelSensitivity;
    const zoomFactor = 1 + (delta > 0 ? this.config.zoomStep : -this.config.zoomStep);
    const newZoom = Math.min(Math.max(this.currentZoom * zoomFactor, this.config.minZoom), this.config.maxZoom);

    if (newZoom === this.currentZoom) {
      return InteractionResults.handled(); // At zoom limits
    }

    const center = this.config.zoomToPoint ? event.position : { x: 0, y: 0 };
    
    this.callbacks.onZoomStart?.(this.currentZoom, center, event);
    this.currentZoom = newZoom;
    this.callbacks.onZoom?.(newZoom, center, event);
    this.callbacks.onZoomEnd?.(newZoom, center, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  getCurrentZoom(): number {
    return this.currentZoom;
  }

  setZoom(zoom: number): void {
    this.currentZoom = Math.min(Math.max(zoom, this.config.minZoom), this.config.maxZoom);
  }
}

// Selection interaction strategy
export class SelectInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements MouseInteractionStrategy<TElement> {
  
  readonly name = 'select';
  readonly priority = 20;
  public enabled = true;

  private readonly config: Required<SelectInteractionConfig>;
  private readonly callbacks: SelectEventCallbacks<TElement>;
  private readonly state: SelectionState = {
    active: false,
    startPosition: null,
    currentPosition: null,
    selectedElements: new Set(),
    rectangleSelection: false
  };

  constructor(
    config: SelectInteractionConfig = {},
    callbacks: SelectEventCallbacks<TElement> = {}
  ) {
    this.config = {
      button: 0,
      multiSelect: true,
      rectangleSelect: true,
      selectOnClick: true,
      clearOnBackground: true,
      selectRadius: 5,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: MouseInteractionEvent<TElement>): boolean {
    return this.enabled && event.button === this.config.button;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific mouse event methods
  }

  onMouseDown(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    this.state.active = true;
    this.state.startPosition = event.position;
    this.state.currentPosition = event.position;
    this.state.rectangleSelection = false;

    this.callbacks.onSelectStart?.(event.position, event);

    // Handle immediate selection on click
    if (this.config.selectOnClick && event.element) {
      this.handleElementSelection(event.element.id, event);
      return InteractionResults.consumed(undefined, true, false);
    }

    // Clear selection if clicking on background (unless multi-select is active)
    if (!event.element && this.config.clearOnBackground && !event.modifiers.ctrl && !event.modifiers.meta) {
      this.clearSelection(event);
    }

    return InteractionResults.consumed(undefined, true, false);
  }

  onMouseMove(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active || !this.state.startPosition) {
      return InteractionResults.ignored();
    }

    this.state.currentPosition = event.position;

    // Check if we should start rectangle selection
    const distance = Math.sqrt(
      Math.pow(event.position.x - this.state.startPosition.x, 2) +
      Math.pow(event.position.y - this.state.startPosition.y, 2)
    );

    if (distance > 5 && this.config.rectangleSelect) {
      this.state.rectangleSelection = true;
    }

    return InteractionResults.handled();
  }

  onMouseUp(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active) {
      return InteractionResults.ignored();
    }

    this.state.active = false;

    // Handle rectangle selection
    if (this.state.rectangleSelection && this.state.startPosition && this.state.currentPosition) {
      this.handleRectangleSelection(this.state.startPosition, this.state.currentPosition, event);
    }

    this.callbacks.onSelectEnd?.(Array.from(this.state.selectedElements), event);

    this.state.startPosition = null;
    this.state.currentPosition = null;
    this.state.rectangleSelection = false;

    return InteractionResults.handled();
  }

  private handleElementSelection(elementId: string, event: MouseInteractionEvent<TElement>): void {
    const isMultiSelect = this.config.multiSelect && (event.modifiers.ctrl || event.modifiers.meta);

    if (isMultiSelect) {
      if (this.state.selectedElements.has(elementId)) {
        this.state.selectedElements.delete(elementId);
      } else {
        this.state.selectedElements.add(elementId);
      }
    } else {
      this.state.selectedElements.clear();
      this.state.selectedElements.add(elementId);
    }

    this.callbacks.onSelectionChange?.(Array.from(this.state.selectedElements), event);
  }

  private handleRectangleSelection(start: GraphPosition, end: GraphPosition, event: MouseInteractionEvent<TElement>): void {
    // This would need to be implemented by the consumer with knowledge of element positions
    // For now, we just notify that rectangle selection occurred
    const bounds = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };

    // Consumer would implement element detection within bounds
    console.log('Rectangle selection:', bounds);
  }

  private clearSelection(event: MouseInteractionEvent<TElement>): void {
    this.state.selectedElements.clear();
    this.callbacks.onSelectionChange?.([], event);
  }

  getSelectedElements(): readonly string[] {
    return Array.from(this.state.selectedElements);
  }

  setSelectedElements(elementIds: readonly string[]): void {
    this.state.selectedElements.clear();
    for (const id of elementIds) {
      this.state.selectedElements.add(id);
    }
  }

  selectElement(elementId: string): void {
    this.state.selectedElements.add(elementId);
  }

  deselectElement(elementId: string): void {
    this.state.selectedElements.delete(elementId);
  }

  clearSelected(): void {
    this.state.selectedElements.clear();
  }
}

// Hover interaction strategy
export class HoverInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements MouseInteractionStrategy<TElement> {
  
  readonly name = 'hover';
  readonly priority = 5;
  public enabled = true;

  private readonly config: Required<HoverInteractionConfig>;
  private readonly callbacks: HoverEventCallbacks<TElement>;
  private hoveredElement: TElement | null = null;
  private hoverTimeout: number | null = null;

  constructor(
    config: HoverInteractionConfig = {},
    callbacks: HoverEventCallbacks<TElement> = {}
  ) {
    this.config = {
      hoverDelay: 500,
      hoverRadius: 10,
      showTooltip: true,
      persistOnLeave: false,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(): boolean {
    return this.enabled;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific mouse event methods
  }

  onMouseMove(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle()) {
      return InteractionResults.ignored();
    }

    const currentElement = event.element;

    // Check if hover changed
    if (currentElement?.id !== this.hoveredElement?.id) {
      this.clearHoverTimeout();

      // End previous hover
      if (this.hoveredElement) {
        this.callbacks.onHoverEnd?.(this.hoveredElement, event);
      }

      this.hoveredElement = currentElement;

      // Start new hover with delay
      if (currentElement && this.config.hoverDelay > 0) {
        this.hoverTimeout = window.setTimeout(() => {
          this.callbacks.onHoverStart?.(currentElement, event);
        }, this.config.hoverDelay);
      } else if (currentElement) {
        this.callbacks.onHoverStart?.(currentElement, event);
      }
    }

    return InteractionResults.handled();
  }

  onMouseLeave(): InteractionResult {
    if (!this.config.persistOnLeave && this.hoveredElement) {
      const fakeEvent = {
        element: null,
        position: { x: 0, y: 0 },
        originalEvent: new MouseEvent('mouseleave'),
        timestamp: Date.now(),
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        button: 0,
        buttons: 0,
        movementX: 0,
        movementY: 0
      } as MouseInteractionEvent<TElement>;

      this.callbacks.onHoverEnd?.(this.hoveredElement, fakeEvent);
      this.hoveredElement = null;
    }

    this.clearHoverTimeout();
    return InteractionResults.handled();
  }

  private clearHoverTimeout(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  getHoveredElement(): TElement | null {
    return this.hoveredElement;
  }

  cleanup(): void {
    this.clearHoverTimeout();
    this.hoveredElement = null;
  }
}

// Drag interaction strategy
export class DragInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements MouseInteractionStrategy<TElement> {
  
  readonly name = 'drag';
  readonly priority = 25;
  public enabled = true;

  private readonly config: Required<DragInteractionConfig>;
  private readonly callbacks: DragEventCallbacks<TElement>;
  private readonly state: DragState = {
    active: false,
    element: null,
    startPosition: { x: 0, y: 0 },
    elementStartPosition: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  };

  constructor(
    config: DragInteractionConfig = {},
    callbacks: DragEventCallbacks<TElement> = {}
  ) {
    this.config = {
      button: 0,
      dragElements: ['vertex'],
      snapToGrid: false,
      gridSize: 10,
      dragBounds: null,
      multiDrag: true,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: MouseInteractionEvent<TElement>): boolean {
    if (!this.enabled || event.button !== this.config.button) return false;
    if (!event.element) return false;
    
    return this.config.dragElements.includes(event.element.type as 'vertex' | 'edge');
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific mouse event methods
  }

  onMouseDown(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event) || !event.element) {
      return InteractionResults.ignored();
    }

    this.state.active = true;
    this.state.element = event.element;
    this.state.startPosition = event.position;
    this.state.elementStartPosition = event.position; // Would need actual element position
    this.state.offset = { x: 0, y: 0 };

    this.callbacks.onDragStart?.(event.element as TElement, event.position, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onMouseMove(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active || !this.state.element) {
      return InteractionResults.ignored();
    }

    let newPosition = event.position;

    // Apply snap to grid
    if (this.config.snapToGrid) {
      newPosition = {
        x: Math.round(newPosition.x / this.config.gridSize) * this.config.gridSize,
        y: Math.round(newPosition.y / this.config.gridSize) * this.config.gridSize
      };
    }

    // Apply bounds constraints
    if (this.config.dragBounds) {
      const bounds = this.config.dragBounds;
      newPosition = {
        x: Math.min(Math.max(newPosition.x, bounds.x), bounds.x + bounds.width),
        y: Math.min(Math.max(newPosition.y, bounds.y), bounds.y + bounds.height)
      };
    }

    const delta = {
      x: newPosition.x - this.state.startPosition.x,
      y: newPosition.y - this.state.startPosition.y
    };

    this.callbacks.onDragMove?.(this.state.element as TElement, newPosition, delta, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onMouseUp(event: MouseInteractionEvent<TElement>): InteractionResult {
    if (!this.state.active || !this.state.element) {
      return InteractionResults.ignored();
    }

    const element = this.state.element as TElement;
    const finalPosition = event.position;

    this.callbacks.onDragEnd?.(element, finalPosition, event);

    this.state.active = false;
    this.state.element = null;

    return InteractionResults.handled();
  }

  isDragging(): boolean {
    return this.state.active;
  }

  getDraggedElement(): TElement | null {
    return this.state.element as TElement | null;
  }

  cleanup(): void {
    this.state.active = false;
    this.state.element = null;
  }
}

// Factory function for creating common mouse interaction sets
export function createStandardMouseInteractions<TElement extends GraphElement = GraphElement>(configs: {
  pan?: PanInteractionConfig & { callbacks?: PanEventCallbacks<TElement> };
  zoom?: ZoomInteractionConfig & { callbacks?: ZoomEventCallbacks<TElement> };
  select?: SelectInteractionConfig & { callbacks?: SelectEventCallbacks<TElement> };
  hover?: HoverInteractionConfig & { callbacks?: HoverEventCallbacks<TElement> };
  drag?: DragInteractionConfig & { callbacks?: DragEventCallbacks<TElement> };
} = {}): MouseInteractionStrategy<TElement>[] {
  const strategies: MouseInteractionStrategy<TElement>[] = [];

  if (configs.pan) {
    const { callbacks, ...config } = configs.pan;
    strategies.push(new PanInteractionStrategy(config, callbacks || {}));
  }

  if (configs.zoom) {
    const { callbacks, ...config } = configs.zoom;
    strategies.push(new ZoomInteractionStrategy(config, callbacks || {}));
  }

  if (configs.select) {
    const { callbacks, ...config } = configs.select;
    strategies.push(new SelectInteractionStrategy(config, callbacks || {}));
  }

  if (configs.hover) {
    const { callbacks, ...config } = configs.hover;
    strategies.push(new HoverInteractionStrategy(config, callbacks || {}));
  }

  if (configs.drag) {
    const { callbacks, ...config } = configs.drag;
    strategies.push(new DragInteractionStrategy(config, callbacks || {}));
  }

  return strategies;
}