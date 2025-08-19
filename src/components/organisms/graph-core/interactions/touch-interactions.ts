/**
 * Touch and gesture interaction strategies for graph components
 * Provides mobile-optimized interactions with multi-touch support
 */

import {
  TouchInteractionStrategy,
  TouchInteractionEvent,
  TouchPoint,
  InteractionResult,
  InteractionResults,
  GraphElement,
  GraphPosition
} from './interaction-handlers';

// Touch gesture interfaces
export interface GestureState {
  readonly active: boolean;
  readonly startTime: number;
  readonly touches: readonly TouchPoint[];
  readonly center: GraphPosition;
  readonly bounds?: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
}

export interface PinchGestureState extends GestureState {
  readonly initialDistance: number;
  readonly currentDistance: number;
  readonly scale: number;
}

export interface PanGestureState extends GestureState {
  readonly initialPosition: GraphPosition;
  readonly currentPosition: GraphPosition;
  readonly velocity: GraphPosition;
}

export interface RotationGestureState extends GestureState {
  readonly initialAngle: number;
  readonly currentAngle: number;
  readonly rotation: number;
}

export interface TapGestureState extends GestureState {
  readonly tapCount: number;
  readonly element: GraphElement | null;
}

// Configuration interfaces
export interface TouchPanConfig {
  readonly minTouches?: number; // Minimum touches for pan (default: 1)
  readonly maxTouches?: number; // Maximum touches for pan (default: 1)
  readonly threshold?: number; // Minimum movement threshold
  readonly momentum?: boolean; // Enable momentum scrolling
  readonly momentumDecay?: number; // Momentum decay factor (0-1)
  readonly maxVelocity?: number; // Maximum pan velocity
}

export interface PinchZoomConfig {
  readonly minScale?: number; // Minimum zoom scale
  readonly maxScale?: number; // Maximum zoom scale
  readonly threshold?: number; // Minimum pinch distance change
  readonly zoomToCenter?: boolean; // Zoom towards gesture center
  readonly smoothing?: boolean; // Enable gesture smoothing
}

export interface RotationConfig {
  readonly threshold?: number; // Minimum rotation angle (degrees)
  readonly smoothing?: boolean; // Enable rotation smoothing
  readonly snapAngle?: number; // Snap to angle increments (degrees)
}

export interface TapConfig {
  readonly maxDistance?: number; // Maximum movement for tap recognition
  readonly maxDuration?: number; // Maximum duration for tap (ms)
  readonly doubleTapDelay?: number; // Double tap recognition window (ms)
  readonly tapRadius?: number; // Tap detection radius
  readonly longPressDelay?: number; // Long press delay (ms)
}

export interface SwipeConfig {
  readonly minDistance?: number; // Minimum swipe distance
  readonly maxDuration?: number; // Maximum swipe duration (ms)
  readonly velocityThreshold?: number; // Minimum velocity for swipe
  readonly directionThreshold?: number; // Direction tolerance (degrees)
}

// Event callback interfaces
export interface TouchPanEventCallbacks<TElement extends GraphElement = GraphElement> {
  onPanStart?(state: PanGestureState, event: TouchInteractionEvent<TElement>): void;
  onPanMove?(state: PanGestureState, event: TouchInteractionEvent<TElement>): void;
  onPanEnd?(state: PanGestureState, event: TouchInteractionEvent<TElement>): void;
}

export interface PinchZoomEventCallbacks<TElement extends GraphElement = GraphElement> {
  onPinchStart?(state: PinchGestureState, event: TouchInteractionEvent<TElement>): void;
  onPinchMove?(state: PinchGestureState, event: TouchInteractionEvent<TElement>): void;
  onPinchEnd?(state: PinchGestureState, event: TouchInteractionEvent<TElement>): void;
}

export interface RotationEventCallbacks<TElement extends GraphElement = GraphElement> {
  onRotationStart?(state: RotationGestureState, event: TouchInteractionEvent<TElement>): void;
  onRotationMove?(state: RotationGestureState, event: TouchInteractionEvent<TElement>): void;
  onRotationEnd?(state: RotationGestureState, event: TouchInteractionEvent<TElement>): void;
}

export interface TapEventCallbacks<TElement extends GraphElement = GraphElement> {
  onTap?(state: TapGestureState, event: TouchInteractionEvent<TElement>): void;
  onDoubleTap?(state: TapGestureState, event: TouchInteractionEvent<TElement>): void;
  onLongPress?(state: TapGestureState, event: TouchInteractionEvent<TElement>): void;
}

export interface SwipeEventCallbacks<TElement extends GraphElement = GraphElement> {
  onSwipe?(direction: 'up' | 'down' | 'left' | 'right', velocity: number, event: TouchInteractionEvent<TElement>): void;
}

// Utility functions for gesture calculations
export function calculateDistance(point1: GraphPosition, point2: GraphPosition): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

export function calculateCenter(touches: readonly TouchPoint[]): GraphPosition {
  if (touches.length === 0) return { x: 0, y: 0 };
  
  const sum = touches.reduce(
    (acc, touch) => ({
      x: acc.x + touch.position.x,
      y: acc.y + touch.position.y
    }),
    { x: 0, y: 0 }
  );
  
  return {
    x: sum.x / touches.length,
    y: sum.y / touches.length
  };
}

export function calculateAngle(point1: GraphPosition, point2: GraphPosition): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x) * (180 / Math.PI);
}

export function calculateVelocity(
  previousPosition: GraphPosition,
  currentPosition: GraphPosition,
  deltaTime: number
): GraphPosition {
  if (deltaTime <= 0) return { x: 0, y: 0 };
  
  return {
    x: (currentPosition.x - previousPosition.x) / deltaTime,
    y: (currentPosition.y - previousPosition.y) / deltaTime
  };
}

// Touch pan interaction strategy
export class TouchPanInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements TouchInteractionStrategy<TElement> {
  
  readonly name = 'touch-pan';
  readonly priority = 10;
  public enabled = true;

  private readonly config: Required<TouchPanConfig>;
  private readonly callbacks: TouchPanEventCallbacks<TElement>;
  private gestureState: PanGestureState | null = null;
  private lastUpdateTime = 0;
  private momentumAnimation: number | null = null;

  constructor(
    config: TouchPanConfig = {},
    callbacks: TouchPanEventCallbacks<TElement> = {}
  ) {
    this.config = {
      minTouches: 1,
      maxTouches: 1,
      threshold: 10,
      momentum: true,
      momentumDecay: 0.95,
      maxVelocity: 50,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: TouchInteractionEvent<TElement>): boolean {
    if (!this.enabled) return false;
    
    const touchCount = event.touches.length;
    return touchCount >= this.config.minTouches && touchCount <= this.config.maxTouches;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific touch event methods
  }

  onTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    this.cancelMomentum();

    const center = calculateCenter(event.touches);
    const now = Date.now();

    this.gestureState = {
      active: true,
      startTime: now,
      touches: event.touches,
      center,
      initialPosition: center,
      currentPosition: center,
      velocity: { x: 0, y: 0 }
    };

    this.lastUpdateTime = now;
    this.callbacks.onPanStart?.(this.gestureState, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchMove(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState || !this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const center = calculateCenter(event.touches);
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;

    // Check threshold
    const distance = calculateDistance(this.gestureState.initialPosition, center);
    if (distance < this.config.threshold) {
      return InteractionResults.handled();
    }

    // Calculate velocity
    const velocity = calculateVelocity(
      this.gestureState.currentPosition,
      center,
      deltaTime
    );

    // Limit velocity
    const clampedVelocity = {
      x: Math.min(Math.max(velocity.x, -this.config.maxVelocity), this.config.maxVelocity),
      y: Math.min(Math.max(velocity.y, -this.config.maxVelocity), this.config.maxVelocity)
    };

    this.gestureState = {
      ...this.gestureState,
      touches: event.touches,
      center,
      currentPosition: center,
      velocity: clampedVelocity
    };

    this.lastUpdateTime = now;
    this.callbacks.onPanMove?.(this.gestureState, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState) {
      return InteractionResults.ignored();
    }

    // Start momentum if enabled and velocity is sufficient
    if (this.config.momentum && 
        (Math.abs(this.gestureState.velocity.x) > 1 || Math.abs(this.gestureState.velocity.y) > 1)) {
      this.startMomentum();
    }

    this.callbacks.onPanEnd?.(this.gestureState, event);
    this.gestureState = null;

    return InteractionResults.handled();
  }

  private startMomentum(): void {
    if (!this.gestureState || this.momentumAnimation) return;

    const animate = (): void => {
      if (!this.gestureState) return;

      const {velocity} = this.gestureState;
      if (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1) {
        this.cancelMomentum();
        return;
      }

      // Create fake event for momentum
      const fakeEvent = {
        touches: [],
        changedTouches: [],
        element: null,
        position: this.gestureState.currentPosition,
        originalEvent: new TouchEvent('touchmove'),
        timestamp: Date.now(),
        modifiers: { shift: false, ctrl: false, alt: false, meta: false }
      } as TouchInteractionEvent<TElement>;

      const newPosition = {
        x: this.gestureState.currentPosition.x + velocity.x,
        y: this.gestureState.currentPosition.y + velocity.y
      };

      this.gestureState = {
        ...this.gestureState,
        currentPosition: newPosition,
        velocity: {
          x: velocity.x * this.config.momentumDecay,
          y: velocity.y * this.config.momentumDecay
        }
      };

      this.callbacks.onPanMove?.(this.gestureState, fakeEvent);
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
    this.gestureState = null;
  }
}

// Pinch zoom interaction strategy
export class PinchZoomInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements TouchInteractionStrategy<TElement> {
  
  readonly name = 'pinch-zoom';
  readonly priority = 15;
  public enabled = true;

  private readonly config: Required<PinchZoomConfig>;
  private readonly callbacks: PinchZoomEventCallbacks<TElement>;
  private gestureState: PinchGestureState | null = null;

  constructor(
    config: PinchZoomConfig = {},
    callbacks: PinchZoomEventCallbacks<TElement> = {}
  ) {
    this.config = {
      minScale: 0.1,
      maxScale: 10,
      threshold: 10,
      zoomToCenter: true,
      smoothing: true,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: TouchInteractionEvent<TElement>): boolean {
    return this.enabled && event.touches.length === 2;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific touch event methods
  }

  onTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const {touches} = event;
    const center = calculateCenter(touches);
    const distance = calculateDistance(touches[0].position, touches[1].position);

    this.gestureState = {
      active: true,
      startTime: Date.now(),
      touches,
      center,
      initialDistance: distance,
      currentDistance: distance,
      scale: 1
    };

    this.callbacks.onPinchStart?.(this.gestureState, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchMove(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState || !this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const {touches} = event;
    const center = calculateCenter(touches);
    const distance = calculateDistance(touches[0].position, touches[1].position);

    // Check threshold
    if (Math.abs(distance - this.gestureState.initialDistance) < this.config.threshold) {
      return InteractionResults.handled();
    }

    const scale = distance / this.gestureState.initialDistance;
    const clampedScale = Math.min(Math.max(scale, this.config.minScale), this.config.maxScale);

    this.gestureState = {
      ...this.gestureState,
      touches,
      center,
      currentDistance: distance,
      scale: clampedScale
    };

    this.callbacks.onPinchMove?.(this.gestureState, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState) {
      return InteractionResults.ignored();
    }

    this.callbacks.onPinchEnd?.(this.gestureState, event);
    this.gestureState = null;

    return InteractionResults.handled();
  }

  cleanup(): void {
    this.gestureState = null;
  }
}

// Rotation interaction strategy
export class RotationInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements TouchInteractionStrategy<TElement> {
  
  readonly name = 'rotation';
  readonly priority = 12;
  public enabled = true;

  private readonly config: Required<RotationConfig>;
  private readonly callbacks: RotationEventCallbacks<TElement>;
  private gestureState: RotationGestureState | null = null;

  constructor(
    config: RotationConfig = {},
    callbacks: RotationEventCallbacks<TElement> = {}
  ) {
    this.config = {
      threshold: 15, // degrees
      smoothing: true,
      snapAngle: 0, // No snapping by default
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: TouchInteractionEvent<TElement>): boolean {
    return this.enabled && event.touches.length === 2;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific touch event methods
  }

  onTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const {touches} = event;
    const center = calculateCenter(touches);
    const angle = calculateAngle(touches[0].position, touches[1].position);

    this.gestureState = {
      active: true,
      startTime: Date.now(),
      touches,
      center,
      initialAngle: angle,
      currentAngle: angle,
      rotation: 0
    };

    this.callbacks.onRotationStart?.(this.gestureState, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchMove(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState || !this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const {touches} = event;
    const center = calculateCenter(touches);
    const angle = calculateAngle(touches[0].position, touches[1].position);

    let rotation = angle - this.gestureState.initialAngle;
    
    // Normalize angle to -180 to 180 range
    while (rotation > 180) rotation -= 360;
    while (rotation < -180) rotation += 360;

    // Check threshold
    if (Math.abs(rotation) < this.config.threshold) {
      return InteractionResults.handled();
    }

    // Apply snapping if configured
    if (this.config.snapAngle > 0) {
      rotation = Math.round(rotation / this.config.snapAngle) * this.config.snapAngle;
    }

    this.gestureState = {
      ...this.gestureState,
      touches,
      center,
      currentAngle: angle,
      rotation
    };

    this.callbacks.onRotationMove?.(this.gestureState, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  onTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState) {
      return InteractionResults.ignored();
    }

    this.callbacks.onRotationEnd?.(this.gestureState, event);
    this.gestureState = null;

    return InteractionResults.handled();
  }

  cleanup(): void {
    this.gestureState = null;
  }
}

// Tap interaction strategy
export class TapInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements TouchInteractionStrategy<TElement> {
  
  readonly name = 'tap';
  readonly priority = 20;
  public enabled = true;

  private readonly config: Required<TapConfig>;
  private readonly callbacks: TapEventCallbacks<TElement>;
  private gestureState: TapGestureState | null = null;
  private lastTapTime = 0;
  private tapCount = 0;
  private longPressTimeout: number | null = null;

  constructor(
    config: TapConfig = {},
    callbacks: TapEventCallbacks<TElement> = {}
  ) {
    this.config = {
      maxDistance: 10,
      maxDuration: 300,
      doubleTapDelay: 300,
      tapRadius: 20,
      longPressDelay: 500,
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: TouchInteractionEvent<TElement>): boolean {
    return this.enabled && event.touches.length === 1;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific touch event methods
  }

  onTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const touch = event.touches[0];
    const now = Date.now();

    this.gestureState = {
      active: true,
      startTime: now,
      touches: event.touches,
      center: touch.position,
      element: event.element,
      tapCount: this.isDoubleTap(now, touch.position) ? 2 : 1
    };

    // Start long press timer
    this.longPressTimeout = window.setTimeout(() => {
      if (this.gestureState) {
        this.callbacks.onLongPress?.(this.gestureState, event);
        this.gestureState = null;
      }
    }, this.config.longPressDelay);

    return InteractionResults.handled();
  }

  onTouchMove(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState || !this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    const touch = event.touches[0];
    const distance = calculateDistance(this.gestureState.center, touch.position);

    // If movement exceeds threshold, cancel tap
    if (distance > this.config.maxDistance) {
      this.clearLongPressTimeout();
      this.gestureState = null;
      return InteractionResults.ignored();
    }

    return InteractionResults.handled();
  }

  onTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.gestureState) {
      return InteractionResults.ignored();
    }

    this.clearLongPressTimeout();

    const now = Date.now();
    const duration = now - this.gestureState.startTime;

    // Check if it's a valid tap
    if (duration <= this.config.maxDuration) {
      if (this.gestureState.tapCount === 2) {
        this.callbacks.onDoubleTap?.(this.gestureState, event);
        this.tapCount = 0;
      } else {
        this.callbacks.onTap?.(this.gestureState, event);
        this.lastTapTime = now;
        this.tapCount = 1;
      }
    }

    this.gestureState = null;
    return InteractionResults.handled();
  }

  onTouchCancel(event: TouchInteractionEvent<TElement>): InteractionResult {
    this.clearLongPressTimeout();
    this.gestureState = null;
    return InteractionResults.handled();
  }

  private isDoubleTap(currentTime: number, position: GraphPosition): boolean {
    if (this.tapCount === 0 || !this.gestureState) return false;

    const timeDiff = currentTime - this.lastTapTime;
    return timeDiff <= this.config.doubleTapDelay;
  }

  private clearLongPressTimeout(): void {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
  }

  cleanup(): void {
    this.clearLongPressTimeout();
    this.gestureState = null;
  }
}

// Swipe interaction strategy
export class SwipeInteractionStrategy<TElement extends GraphElement = GraphElement> 
  implements TouchInteractionStrategy<TElement> {
  
  readonly name = 'swipe';
  readonly priority = 8;
  public enabled = true;

  private readonly config: Required<SwipeConfig>;
  private readonly callbacks: SwipeEventCallbacks<TElement>;
  private startPosition: GraphPosition | null = null;
  private startTime = 0;

  constructor(
    config: SwipeConfig = {},
    callbacks: SwipeEventCallbacks<TElement> = {}
  ) {
    this.config = {
      minDistance: 50,
      maxDuration: 300,
      velocityThreshold: 0.5,
      directionThreshold: 30, // degrees
      ...config
    };
    this.callbacks = callbacks;
  }

  canHandle(event: TouchInteractionEvent<TElement>): boolean {
    return this.enabled && event.touches.length === 1;
  }

  handle(): InteractionResult {
    return InteractionResults.ignored(); // Handled by specific touch event methods
  }

  onTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.canHandle(event)) {
      return InteractionResults.ignored();
    }

    this.startPosition = event.touches[0].position;
    this.startTime = Date.now();

    return InteractionResults.handled();
  }

  onTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (!this.startPosition || event.changedTouches.length === 0) {
      return InteractionResults.ignored();
    }

    const endPosition = event.changedTouches[0].position;
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Check duration
    if (duration > this.config.maxDuration) {
      this.startPosition = null;
      return InteractionResults.ignored();
    }

    const deltaX = endPosition.x - this.startPosition.x;
    const deltaY = endPosition.y - this.startPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check minimum distance
    if (distance < this.config.minDistance) {
      this.startPosition = null;
      return InteractionResults.ignored();
    }

    const velocity = distance / duration;

    // Check velocity threshold
    if (velocity < this.config.velocityThreshold) {
      this.startPosition = null;
      return InteractionResults.ignored();
    }

    // Determine direction
    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
    let direction: 'up' | 'down' | 'left' | 'right';

    if (angle < this.config.directionThreshold) {
      // Horizontal swipe
      direction = deltaX > 0 ? 'right' : 'left';
    } else if (angle > (90 - this.config.directionThreshold)) {
      // Vertical swipe
      direction = deltaY > 0 ? 'down' : 'up';
    } else {
      // Diagonal - ignore
      this.startPosition = null;
      return InteractionResults.ignored();
    }

    this.callbacks.onSwipe?.(direction, velocity, event);
    this.startPosition = null;

    return InteractionResults.consumed(undefined, true, false);
  }

  onTouchCancel(): InteractionResult {
    this.startPosition = null;
    return InteractionResults.handled();
  }

  cleanup(): void {
    this.startPosition = null;
  }
}

// Factory function for creating standard touch interactions
export function createStandardTouchInteractions<TElement extends GraphElement = GraphElement>(configs: {
  pan?: TouchPanConfig & { callbacks?: TouchPanEventCallbacks<TElement> };
  pinchZoom?: PinchZoomConfig & { callbacks?: PinchZoomEventCallbacks<TElement> };
  rotation?: RotationConfig & { callbacks?: RotationEventCallbacks<TElement> };
  tap?: TapConfig & { callbacks?: TapEventCallbacks<TElement> };
  swipe?: SwipeConfig & { callbacks?: SwipeEventCallbacks<TElement> };
} = {}): TouchInteractionStrategy<TElement>[] {
  const strategies: TouchInteractionStrategy<TElement>[] = [];

  if (configs.pan) {
    const { callbacks, ...config } = configs.pan;
    strategies.push(new TouchPanInteractionStrategy(config, callbacks || {}));
  }

  if (configs.pinchZoom) {
    const { callbacks, ...config } = configs.pinchZoom;
    strategies.push(new PinchZoomInteractionStrategy(config, callbacks || {}));
  }

  if (configs.rotation) {
    const { callbacks, ...config } = configs.rotation;
    strategies.push(new RotationInteractionStrategy(config, callbacks || {}));
  }

  if (configs.tap) {
    const { callbacks, ...config } = configs.tap;
    strategies.push(new TapInteractionStrategy(config, callbacks || {}));
  }

  if (configs.swipe) {
    const { callbacks, ...config } = configs.swipe;
    strategies.push(new SwipeInteractionStrategy(config, callbacks || {}));
  }

  return strategies;
}

// Combined gesture handler for complex multi-touch interactions
export class CombinedGestureHandler<TElement extends GraphElement = GraphElement> {
  private readonly strategies: TouchInteractionStrategy<TElement>[];
  private activeStrategy: TouchInteractionStrategy<TElement> | null = null;

  constructor(strategies: TouchInteractionStrategy<TElement>[]) {
    this.strategies = strategies.sort((a, b) => b.priority - a.priority);
  }

  handleTouchStart(event: TouchInteractionEvent<TElement>): InteractionResult {
    // Find the highest priority strategy that can handle this event
    for (const strategy of this.strategies) {
      if (strategy.enabled && strategy.canHandle(event)) {
        this.activeStrategy = strategy;
        return strategy.onTouchStart?.(event) || InteractionResults.ignored();
      }
    }
    
    return InteractionResults.ignored();
  }

  handleTouchMove(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (this.activeStrategy) {
      return this.activeStrategy.onTouchMove?.(event) || InteractionResults.ignored();
    }

    return InteractionResults.ignored();
  }

  handleTouchEnd(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (this.activeStrategy) {
      const result = this.activeStrategy.onTouchEnd?.(event) || InteractionResults.ignored();
      this.activeStrategy = null;
      return result;
    }

    return InteractionResults.ignored();
  }

  handleTouchCancel(event: TouchInteractionEvent<TElement>): InteractionResult {
    if (this.activeStrategy) {
      const result = this.activeStrategy.onTouchCancel?.(event) || InteractionResults.ignored();
      this.activeStrategy = null;
      return result;
    }

    return InteractionResults.ignored();
  }

  cleanup(): void {
    for (const strategy of this.strategies) {
      strategy.cleanup?.();
    }
    this.activeStrategy = null;
  }
}