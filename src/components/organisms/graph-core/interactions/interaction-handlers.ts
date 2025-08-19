/**
 * Generic interaction handling system for graph components
 * Provides pluggable interaction strategies with zero coupling to specific data types
 */

// Base interaction event types
export interface GraphElement {
  readonly id: string;
  readonly type: 'vertex' | 'edge' | 'background';
}

export interface GraphPosition {
  readonly x: number;
  readonly y: number;
}

export interface GraphBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

// Generic interaction events
export interface InteractionEvent<TElement = GraphElement> {
  readonly element: TElement | null;
  readonly position: GraphPosition;
  readonly originalEvent: Event;
  readonly timestamp: number;
  readonly modifiers: {
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
}

export interface MouseInteractionEvent<TElement = GraphElement> extends InteractionEvent<TElement> {
  readonly button: number;
  readonly buttons: number;
  readonly movementX: number;
  readonly movementY: number;
}

export interface TouchInteractionEvent<TElement = GraphElement> extends InteractionEvent<TElement> {
  readonly touches: readonly TouchPoint[];
  readonly changedTouches: readonly TouchPoint[];
}

export interface TouchPoint {
  readonly id: number;
  readonly position: GraphPosition;
  readonly force: number;
}

export interface KeyboardInteractionEvent {
  readonly key: string;
  readonly code: string;
  readonly originalEvent: KeyboardEvent;
  readonly timestamp: number;
  readonly modifiers: {
    readonly shift: boolean;
    readonly ctrl: boolean;
    readonly alt: boolean;
    readonly meta: boolean;
  };
}

// Interaction strategy interfaces
export interface InteractionStrategy<TElement = GraphElement> {
  readonly name: string;
  readonly priority: number;
  readonly enabled: boolean;
  
  canHandle(event: InteractionEvent<TElement>): boolean;
  handle(event: InteractionEvent<TElement>): InteractionResult;
  cleanup?(): void;
}

export interface MouseInteractionStrategy<TElement = GraphElement> extends InteractionStrategy<TElement> {
  onMouseDown?(event: MouseInteractionEvent<TElement>): InteractionResult;
  onMouseMove?(event: MouseInteractionEvent<TElement>): InteractionResult;
  onMouseUp?(event: MouseInteractionEvent<TElement>): InteractionResult;
  onWheel?(event: MouseInteractionEvent<TElement> & { deltaX: number; deltaY: number; deltaZ: number }): InteractionResult;
  onDoubleClick?(event: MouseInteractionEvent<TElement>): InteractionResult;
  onContextMenu?(event: MouseInteractionEvent<TElement>): InteractionResult;
}

export interface TouchInteractionStrategy<TElement = GraphElement> extends InteractionStrategy<TElement> {
  onTouchStart?(event: TouchInteractionEvent<TElement>): InteractionResult;
  onTouchMove?(event: TouchInteractionEvent<TElement>): InteractionResult;
  onTouchEnd?(event: TouchInteractionEvent<TElement>): InteractionResult;
  onTouchCancel?(event: TouchInteractionEvent<TElement>): InteractionResult;
}

export interface KeyboardInteractionStrategy {
  readonly name: string;
  readonly priority: number;
  readonly enabled: boolean;
  
  canHandle(event: KeyboardInteractionEvent): boolean;
  handle(event: KeyboardInteractionEvent): InteractionResult;
  cleanup?(): void;
}

// Interaction results
export enum InteractionResultType {
  Handled = 'handled',
  Ignored = 'ignored',
  Consumed = 'consumed', // Prevents other strategies from handling
  Error = 'error'
}

export interface InteractionResult {
  readonly type: InteractionResultType;
  readonly message?: string;
  readonly data?: unknown;
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
}

// Element detection and targeting
export interface ElementDetector<TElement = GraphElement> {
  detectElement(position: GraphPosition, context: unknown): TElement | null;
  getElementBounds(element: TElement): GraphBounds | null;
  isElementVisible(element: TElement): boolean;
}

// Transformation and coordinate system
export interface CoordinateTransform {
  screenToWorld(position: GraphPosition): GraphPosition;
  worldToScreen(position: GraphPosition): GraphPosition;
  getScale(): number;
  getTranslation(): GraphPosition;
}

// Main interaction handler manager
export interface InteractionHandlerConfig<TElement = GraphElement> {
  readonly element: HTMLElement;
  readonly elementDetector: ElementDetector<TElement>;
  readonly coordinateTransform?: CoordinateTransform;
  readonly enableAccessibility?: boolean;
  readonly ariaLabel?: string;
  readonly ariaDescription?: string;
}

export class InteractionHandler<TElement extends GraphElement = GraphElement> {
  private readonly config: InteractionHandlerConfig<TElement>;
  private readonly mouseStrategies = new Set<MouseInteractionStrategy<TElement>>();
  private readonly touchStrategies = new Set<TouchInteractionStrategy<TElement>>();
  private readonly keyboardStrategies = new Set<KeyboardInteractionStrategy>();
  private readonly eventListeners = new Map<string, EventListener>();
  
  private isDestroyed = false;
  private focusedElement: TElement | null = null;
  private activeInteractions = new Set<string>();

  constructor(config: InteractionHandlerConfig<TElement>) {
    this.config = config;
    this.setupEventListeners();
    this.setupAccessibility();
  }

  // Strategy management
  addMouseStrategy(strategy: MouseInteractionStrategy<TElement>): void {
    if (this.isDestroyed) return;
    this.mouseStrategies.add(strategy);
  }

  removeMouseStrategy(strategy: MouseInteractionStrategy<TElement>): void {
    if (this.isDestroyed) return;
    this.mouseStrategies.delete(strategy);
    strategy.cleanup?.();
  }

  addTouchStrategy(strategy: TouchInteractionStrategy<TElement>): void {
    if (this.isDestroyed) return;
    this.touchStrategies.add(strategy);
  }

  removeTouchStrategy(strategy: TouchInteractionStrategy<TElement>): void {
    if (this.isDestroyed) return;
    this.touchStrategies.delete(strategy);
    strategy.cleanup?.();
  }

  addKeyboardStrategy(strategy: KeyboardInteractionStrategy): void {
    if (this.isDestroyed) return;
    this.keyboardStrategies.add(strategy);
  }

  removeKeyboardStrategy(strategy: KeyboardInteractionStrategy): void {
    if (this.isDestroyed) return;
    this.keyboardStrategies.delete(strategy);
    strategy.cleanup?.();
  }

  // Focus management for accessibility
  setFocusedElement(element: TElement | null): void {
    if (this.focusedElement === element) return;
    
    this.focusedElement = element;
    this.updateAriaProperties();
  }

  getFocusedElement(): TElement | null {
    return this.focusedElement;
  }

  // Event handling
  private setupEventListeners(): void {
    const {element} = this.config;

    // Mouse events
    this.addEventListenerSafely('mousedown', this.handleMouseDown);
    this.addEventListenerSafely('mousemove', this.handleMouseMove);
    this.addEventListenerSafely('mouseup', this.handleMouseUp);
    this.addEventListenerSafely('wheel', this.handleWheel);
    this.addEventListenerSafely('dblclick', this.handleDoubleClick);
    this.addEventListenerSafely('contextmenu', this.handleContextMenu);

    // Touch events
    this.addEventListenerSafely('touchstart', this.handleTouchStart, { passive: false });
    this.addEventListenerSafely('touchmove', this.handleTouchMove, { passive: false });
    this.addEventListenerSafely('touchend', this.handleTouchEnd);
    this.addEventListenerSafely('touchcancel', this.handleTouchCancel);

    // Keyboard events (only if element can receive focus)
    if (element.tabIndex >= 0 || element.contentEditable === 'true') {
      this.addEventListenerSafely('keydown', this.handleKeyDown);
      this.addEventListenerSafely('keyup', this.handleKeyUp);
    }

    // Focus events for accessibility
    this.addEventListenerSafely('focus', this.handleFocus);
    this.addEventListenerSafely('blur', this.handleBlur);
  }

  private addEventListenerSafely(
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    this.config.element.addEventListener(type, listener, options);
    this.eventListeners.set(type, listener);
  }

  private handleMouseDown = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof MouseEvent)) return;

    const interactionEvent = this.createMouseEvent(event);
    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onMouseDown?.(interactionEvent)
    );
  }

  private handleMouseMove = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof MouseEvent)) return;

    const interactionEvent = this.createMouseEvent(event);
    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onMouseMove?.(interactionEvent)
    );
  }

  private handleMouseUp = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof MouseEvent)) return;

    const interactionEvent = this.createMouseEvent(event);
    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onMouseUp?.(interactionEvent)
    );
  }

  private handleWheel = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof WheelEvent)) return;

    const interactionEvent = {
      ...this.createMouseEvent(event),
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ
    };

    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onWheel?.(interactionEvent)
    );
  }

  private handleDoubleClick = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof MouseEvent)) return;

    const interactionEvent = this.createMouseEvent(event);
    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onDoubleClick?.(interactionEvent)
    );
  }

  private handleContextMenu = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof MouseEvent)) return;

    const interactionEvent = this.createMouseEvent(event);
    this.handleInteractionWithStrategies(
      this.mouseStrategies,
      interactionEvent,
      (strategy) => strategy.onContextMenu?.(interactionEvent)
    );
  }

  private handleTouchStart = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof TouchEvent)) return;

    const interactionEvent = this.createTouchEvent(event);
    this.handleInteractionWithStrategies(
      this.touchStrategies,
      interactionEvent,
      (strategy) => strategy.onTouchStart?.(interactionEvent)
    );
  }

  private handleTouchMove = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof TouchEvent)) return;

    const interactionEvent = this.createTouchEvent(event);
    this.handleInteractionWithStrategies(
      this.touchStrategies,
      interactionEvent,
      (strategy) => strategy.onTouchMove?.(interactionEvent)
    );
  }

  private handleTouchEnd = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof TouchEvent)) return;

    const interactionEvent = this.createTouchEvent(event);
    this.handleInteractionWithStrategies(
      this.touchStrategies,
      interactionEvent,
      (strategy) => strategy.onTouchEnd?.(interactionEvent)
    );
  }

  private handleTouchCancel = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof TouchEvent)) return;

    const interactionEvent = this.createTouchEvent(event);
    this.handleInteractionWithStrategies(
      this.touchStrategies,
      interactionEvent,
      (strategy) => strategy.onTouchCancel?.(interactionEvent)
    );
  }

  private handleKeyDown = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof KeyboardEvent)) return;

    const interactionEvent = this.createKeyboardEvent(event);
    this.handleKeyboardInteraction(interactionEvent);
  }

  private handleKeyUp = (event: Event): void => {
    if (this.isDestroyed || !(event instanceof KeyboardEvent)) return;

    const interactionEvent = this.createKeyboardEvent(event);
    this.handleKeyboardInteraction(interactionEvent);
  }

  private handleFocus = (): void => {
    if (this.isDestroyed) return;
    this.updateAriaProperties();
  }

  private handleBlur = (): void => {
    if (this.isDestroyed) return;
    this.setFocusedElement(null);
  }

  // Event creation helpers
  private createMouseEvent(event: MouseEvent): MouseInteractionEvent<TElement> {
    const rect = this.config.element.getBoundingClientRect();
    const position: GraphPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    const worldPosition = this.config.coordinateTransform?.screenToWorld(position) ?? position;
    const element = this.config.elementDetector.detectElement(worldPosition, this.config);

    return {
      element,
      position: worldPosition,
      originalEvent: event,
      timestamp: Date.now(),
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      },
      button: event.button,
      buttons: event.buttons,
      movementX: event.movementX,
      movementY: event.movementY
    };
  }

  private createTouchEvent(event: TouchEvent): TouchInteractionEvent<TElement> {
    const rect = this.config.element.getBoundingClientRect();
    const touches = Array.from(event.touches).map(touch => this.createTouchPoint(touch, rect));
    const changedTouches = Array.from(event.changedTouches).map(touch => this.createTouchPoint(touch, rect));

    // Use first touch for element detection
    const firstTouch = touches[0] || changedTouches[0];
    const element = firstTouch 
      ? this.config.elementDetector.detectElement(firstTouch.position, this.config)
      : null;

    return {
      element,
      position: firstTouch?.position ?? { x: 0, y: 0 },
      originalEvent: event,
      timestamp: Date.now(),
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      },
      touches,
      changedTouches
    };
  }

  private createTouchPoint(touch: Touch, rect: DOMRect): TouchPoint {
    const screenPosition: GraphPosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    const worldPosition = this.config.coordinateTransform?.screenToWorld(screenPosition) ?? screenPosition;

    return {
      id: touch.identifier,
      position: worldPosition,
      force: touch.force
    };
  }

  private createKeyboardEvent(event: KeyboardEvent): KeyboardInteractionEvent {
    return {
      key: event.key,
      code: event.code,
      originalEvent: event,
      timestamp: Date.now(),
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
        meta: event.metaKey
      }
    };
  }

  // Strategy execution
  private handleInteractionWithStrategies<T extends InteractionStrategy<TElement>>(
    strategies: Set<T>,
    event: InteractionEvent<TElement>,
    handler: (strategy: T) => InteractionResult | undefined | void
  ): void {
    // Sort strategies by priority (higher priority first)
    const sortedStrategies = Array.from(strategies)
      .filter(strategy => strategy.enabled && strategy.canHandle(event))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of sortedStrategies) {
      try {
        const result = handler(strategy);
        
        if (result) {
          this.processInteractionResult(result, event.originalEvent);
          
          if (result.type === InteractionResultType.Consumed) {
            break; // Stop processing other strategies
          }
        }
      } catch (error) {
        console.error(`Error in interaction strategy ${strategy.name}:`, error);
      }
    }
  }

  private handleKeyboardInteraction(event: KeyboardInteractionEvent): void {
    // Sort strategies by priority (higher priority first)
    const sortedStrategies = Array.from(this.keyboardStrategies)
      .filter(strategy => strategy.enabled && strategy.canHandle(event))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of sortedStrategies) {
      try {
        const result = strategy.handle(event);
        
        if (result) {
          this.processInteractionResult(result, event.originalEvent);
          
          if (result.type === InteractionResultType.Consumed) {
            break; // Stop processing other strategies
          }
        }
      } catch (error) {
        console.error(`Error in keyboard strategy ${strategy.name}:`, error);
      }
    }
  }

  private processInteractionResult(result: InteractionResult, originalEvent: Event): void {
    if (result.preventDefault) {
      originalEvent.preventDefault();
    }
    
    if (result.stopPropagation) {
      originalEvent.stopPropagation();
    }
  }

  // Accessibility support
  private setupAccessibility(): void {
    if (!this.config.enableAccessibility) return;

    const {element} = this.config;
    
    // Ensure element can receive focus
    if (element.tabIndex < 0) {
      element.tabIndex = 0;
    }

    // Set ARIA attributes
    if (this.config.ariaLabel) {
      element.setAttribute('aria-label', this.config.ariaLabel);
    }
    
    if (this.config.ariaDescription) {
      element.setAttribute('aria-description', this.config.ariaDescription);
    }

    // Set role for screen readers
    if (!element.getAttribute('role')) {
      element.setAttribute('role', 'img'); // Graph is treated as an image by default
    }
  }

  private updateAriaProperties(): void {
    if (!this.config.enableAccessibility) return;

    const {element} = this.config;
    
    if (this.focusedElement) {
      const bounds = this.config.elementDetector.getElementBounds(this.focusedElement);
      const description = `Focused on ${this.focusedElement.type} ${this.focusedElement.id}${
        bounds ? ` at position ${Math.round(bounds.x)}, ${Math.round(bounds.y)}` : ''
      }`;
      
      element.setAttribute('aria-description', description);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Remove event listeners
    for (const [type, listener] of this.eventListeners) {
      this.config.element.removeEventListener(type, listener);
    }
    this.eventListeners.clear();

    // Cleanup strategies
    for (const strategy of this.mouseStrategies) {
      strategy.cleanup?.();
    }
    for (const strategy of this.touchStrategies) {
      strategy.cleanup?.();
    }
    for (const strategy of this.keyboardStrategies) {
      strategy.cleanup?.();
    }

    this.mouseStrategies.clear();
    this.touchStrategies.clear();
    this.keyboardStrategies.clear();
    this.activeInteractions.clear();
  }
}

// Helper functions for creating common interaction results
export const InteractionResults = {
  handled: (data?: unknown): InteractionResult => ({
    type: InteractionResultType.Handled,
    data
  }),

  ignored: (): InteractionResult => ({
    type: InteractionResultType.Ignored
  }),

  consumed: (data?: unknown, preventDefault = false, stopPropagation = false): InteractionResult => ({
    type: InteractionResultType.Consumed,
    data,
    preventDefault,
    stopPropagation
  }),

  error: (message: string): InteractionResult => ({
    type: InteractionResultType.Error,
    message
  })
};