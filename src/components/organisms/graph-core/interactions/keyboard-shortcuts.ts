/**
 * Keyboard shortcut system for graph components
 * Provides customizable keyboard bindings and accessible navigation
 */

import {
  KeyboardInteractionStrategy,
  KeyboardInteractionEvent,
  InteractionResult,
  InteractionResults,
  GraphElement
} from './interaction-handlers';

// Key combination and binding interfaces
export interface KeyCombination {
  readonly key: string; // Main key (e.g., 'a', 'Enter', 'ArrowLeft')
  readonly shift?: boolean;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
  readonly code?: string; // Physical key code for international keyboards
}

export interface KeyBinding<TContext = unknown> {
  readonly id: string;
  readonly combination: KeyCombination;
  readonly description: string;
  readonly category?: string; // Grouping for help/documentation
  readonly repeatDelay?: number; // Delay before key repeat starts (ms)
  readonly repeatInterval?: number; // Interval for key repeat (ms)
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
  readonly enabled?: boolean;
  readonly condition?: (context: TContext) => boolean; // Conditional activation
  readonly action: (event: KeyboardInteractionEvent, context: TContext) => InteractionResult | Promise<InteractionResult>;
}

export interface NavigationAction<TElement extends GraphElement = GraphElement> {
  readonly type: 'focus' | 'select' | 'activate' | 'navigate';
  readonly element?: TElement;
  readonly direction?: 'up' | 'down' | 'left' | 'right' | 'next' | 'previous' | 'first' | 'last';
  readonly data?: unknown;
}

export interface KeyboardNavigationCallbacks<TElement extends GraphElement = GraphElement> {
  onFocusElement?(element: TElement | null, event: KeyboardInteractionEvent): void;
  onSelectElement?(element: TElement, event: KeyboardInteractionEvent): void;
  onActivateElement?(element: TElement, event: KeyboardInteractionEvent): void;
  onNavigate?(action: NavigationAction<TElement>, event: KeyboardInteractionEvent): void;
}

// Keyboard shortcut manager
export class KeyboardShortcutManager<TContext = unknown> 
  implements KeyboardInteractionStrategy {
  
  readonly name = 'keyboard-shortcuts';
  readonly priority = 30;
  public enabled = true;

  private readonly bindings = new Map<string, KeyBinding<TContext>>();
  private readonly categories = new Map<string, KeyBinding<TContext>[]>();
  private readonly keyState = new Map<string, { pressed: boolean; timestamp: number; repeatTimeout?: number }>();
  private context: TContext | null = null;
  private keyUpHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(initialBindings: KeyBinding<TContext>[] = []) {
    for (const binding of initialBindings) {
      this.addBinding(binding);
    }

    // Listen for keyup to track key state
    if (typeof window !== 'undefined') {
      this.keyUpHandler = this.handleKeyUp.bind(this);
      window.addEventListener('keyup', this.keyUpHandler);
    }
  }

  canHandle(event: KeyboardInteractionEvent): boolean {
    if (!this.enabled) return false;
    
    const bindingId = this.getBindingId(event);
    const binding = this.bindings.get(bindingId);
    
    if (!binding || binding.enabled === false) return false;
    
    // Check condition if provided
    if (binding.condition && this.context && !binding.condition(this.context)) {
      return false;
    }

    return true;
  }

  handle(event: KeyboardInteractionEvent): InteractionResult {
    const bindingId = this.getBindingId(event);
    const binding = this.bindings.get(bindingId);

    if (!binding) {
      return InteractionResults.ignored();
    }

    try {
      // Handle key repeat
      if (!this.shouldExecuteWithRepeat(event.key, binding)) {
        return InteractionResults.handled();
      }

      // Execute the action - handle both sync and async results
      const actionResult = binding.action(event, this.context!);
      
      // If the result is a promise, we need to handle it asynchronously
      if (actionResult instanceof Promise) {
        actionResult
          .then((result) => {
            // Apply event modifications asynchronously
            if (binding.preventDefault || result.preventDefault) {
              event.originalEvent.preventDefault();
            }
            
            if (binding.stopPropagation || result.stopPropagation) {
              event.originalEvent.stopPropagation();
            }
          })
          .catch((error) => {
            console.error(`Error executing async keyboard binding ${binding.id}:`, error);
          });
        
        // Return a placeholder result for async actions
        return InteractionResults.handled();
      }

      // Handle synchronous result
      const result = actionResult as InteractionResult;

      // Apply event modifications
      if (binding.preventDefault || result.preventDefault) {
        event.originalEvent.preventDefault();
      }
      
      if (binding.stopPropagation || result.stopPropagation) {
        event.originalEvent.stopPropagation();
      }

      return result;
    } catch (error) {
      console.error(`Error executing keyboard binding ${binding.id}:`, error);
      return InteractionResults.error(`Failed to execute keyboard binding: ${error}`);
    }
  }

  // Binding management
  addBinding(binding: KeyBinding<TContext>): void {
    const id = this.getBindingIdFromCombination(binding.combination);
    this.bindings.set(id, binding);

    // Add to category
    if (binding.category) {
      if (!this.categories.has(binding.category)) {
        this.categories.set(binding.category, []);
      }
      this.categories.get(binding.category)!.push(binding);
    }
  }

  removeBinding(bindingId: string): void {
    const binding = this.bindings.get(bindingId);
    if (binding) {
      this.bindings.delete(bindingId);

      // Remove from category
      if (binding.category) {
        const categoryBindings = this.categories.get(binding.category);
        if (categoryBindings) {
          const index = categoryBindings.indexOf(binding);
          if (index >= 0) {
            categoryBindings.splice(index, 1);
          }
        }
      }
    }
  }

  getBinding(bindingId: string): KeyBinding<TContext> | undefined {
    return this.bindings.get(bindingId);
  }

  getAllBindings(): ReadonlyMap<string, KeyBinding<TContext>> {
    return this.bindings;
  }

  getBindingsByCategory(category: string): readonly KeyBinding<TContext>[] {
    return this.categories.get(category) || [];
  }

  getCategories(): readonly string[] {
    return Array.from(this.categories.keys());
  }

  // Context management
  setContext(context: TContext): void {
    this.context = context;
  }

  getContext(): TContext | null {
    return this.context;
  }

  // Key state and repeat handling
  private shouldExecuteWithRepeat(key: string, binding: KeyBinding<TContext>): boolean {
    const now = Date.now();
    const keyState = this.keyState.get(key);

    if (!keyState || !keyState.pressed) {
      // First press
      this.keyState.set(key, { 
        pressed: true, 
        timestamp: now,
        repeatTimeout: binding.repeatDelay ? window.setTimeout(() => {
          this.startKeyRepeat(key, binding);
        }, binding.repeatDelay) : undefined
      });
      return true;
    }

    // Key is already pressed - handled by repeat system
    return false;
  }

  private startKeyRepeat(key: string, binding: KeyBinding<TContext>): void {
    if (!binding.repeatInterval) return;

    const repeatAction = (): void => {
      const keyState = this.keyState.get(key);
      if (!keyState || !keyState.pressed) return;

      // Create fake event for repeat
      const fakeEvent: KeyboardInteractionEvent = {
        key,
        code: key,
        originalEvent: new KeyboardEvent('keydown', { key }),
        timestamp: Date.now(),
        modifiers: {
          shift: binding.combination.shift || false,
          ctrl: binding.combination.ctrl || false,
          alt: binding.combination.alt || false,
          meta: binding.combination.meta || false
        }
      };

      this.handle(fakeEvent);

      // Schedule next repeat
      keyState.repeatTimeout = window.setTimeout(repeatAction, binding.repeatInterval);
    };

    const keyState = this.keyState.get(key);
    if (keyState) {
      keyState.repeatTimeout = window.setTimeout(repeatAction, binding.repeatInterval);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const keyState = this.keyState.get(event.key);
    if (keyState) {
      keyState.pressed = false;
      if (keyState.repeatTimeout) {
        clearTimeout(keyState.repeatTimeout);
      }
    }
  }

  // Helper methods
  private getBindingId(event: KeyboardInteractionEvent): string {
    return this.getBindingIdFromCombination({
      key: event.key,
      shift: event.modifiers.shift,
      ctrl: event.modifiers.ctrl,
      alt: event.modifiers.alt,
      meta: event.modifiers.meta,
      code: event.code
    });
  }

  private getBindingIdFromCombination(combination: KeyCombination): string {
    const parts = [];
    
    if (combination.ctrl) parts.push('ctrl');
    if (combination.alt) parts.push('alt');
    if (combination.shift) parts.push('shift');
    if (combination.meta) parts.push('meta');
    
    parts.push(combination.key.toLowerCase());

    return parts.join('+');
  }

  cleanup(): void {
    // Clear all timeouts
    for (const keyState of this.keyState.values()) {
      if (keyState.repeatTimeout) {
        clearTimeout(keyState.repeatTimeout);
      }
    }
    this.keyState.clear();

    // Remove event listener
    if (typeof window !== 'undefined' && this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
      this.keyUpHandler = null;
    }

    // Clear bindings and categories
    this.bindings.clear();
    this.categories.clear();
    this.context = null;
  }
}

// Navigation-specific keyboard strategy
export class NavigationKeyboardStrategy<TElement extends GraphElement = GraphElement> 
  implements KeyboardInteractionStrategy {
  
  readonly name = 'navigation';
  readonly priority = 25;
  public enabled = true;

  private readonly callbacks: KeyboardNavigationCallbacks<TElement>;
  private currentElement: TElement | null = null;
  private elements: TElement[] = [];
  private currentIndex = -1;

  constructor(callbacks: KeyboardNavigationCallbacks<TElement> = {}) {
    this.callbacks = callbacks;
  }

  canHandle(event: KeyboardInteractionEvent): boolean {
    if (!this.enabled) return false;

    const navigationKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Tab', 'Enter', 'Space', 'Home', 'End',
      'PageUp', 'PageDown'
    ];

    return navigationKeys.includes(event.key);
  }

  handle(event: KeyboardInteractionEvent): InteractionResult {
    switch (event.key) {
      case 'ArrowUp':
        return this.handleArrowNavigation('up', event);
      case 'ArrowDown':
        return this.handleArrowNavigation('down', event);
      case 'ArrowLeft':
        return this.handleArrowNavigation('left', event);
      case 'ArrowRight':
        return this.handleArrowNavigation('right', event);
      case 'Tab':
        return this.handleTabNavigation(event);
      case 'Enter':
      case 'Space':
        return this.handleActivation(event);
      case 'Home':
        return this.handleJumpNavigation('first', event);
      case 'End':
        return this.handleJumpNavigation('last', event);
      case 'PageUp':
        return this.handlePageNavigation('up', event);
      case 'PageDown':
        return this.handlePageNavigation('down', event);
      default:
        return InteractionResults.ignored();
    }
  }

  private handleArrowNavigation(direction: 'up' | 'down' | 'left' | 'right', event: KeyboardInteractionEvent): InteractionResult {
    const action: NavigationAction<TElement> = {
      type: 'navigate',
      direction,
      element: this.currentElement || undefined
    };

    this.callbacks.onNavigate?.(action, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  private handleTabNavigation(event: KeyboardInteractionEvent): InteractionResult {
    if (this.elements.length === 0) return InteractionResults.ignored();

    const direction = event.modifiers.shift ? 'previous' : 'next';
    let newIndex: number;

    if (direction === 'next') {
      newIndex = this.currentIndex < this.elements.length - 1 ? this.currentIndex + 1 : 0;
    } else {
      newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.elements.length - 1;
    }

    this.setCurrentElement(this.elements[newIndex], newIndex, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  private handleActivation(event: KeyboardInteractionEvent): InteractionResult {
    if (!this.currentElement) return InteractionResults.ignored();

    if (event.key === 'Enter') {
      this.callbacks.onActivateElement?.(this.currentElement, event);
    } else if (event.key === 'Space') {
      this.callbacks.onSelectElement?.(this.currentElement, event);
    }

    return InteractionResults.consumed(undefined, true, true);
  }

  private handleJumpNavigation(direction: 'first' | 'last', event: KeyboardInteractionEvent): InteractionResult {
    if (this.elements.length === 0) return InteractionResults.ignored();

    const newIndex = direction === 'first' ? 0 : this.elements.length - 1;
    this.setCurrentElement(this.elements[newIndex], newIndex, event);

    return InteractionResults.consumed(undefined, true, true);
  }

  private handlePageNavigation(direction: 'up' | 'down', event: KeyboardInteractionEvent): InteractionResult {
    if (this.elements.length === 0) return InteractionResults.ignored();

    const pageSize = 10; // Could be configurable
    const increment = direction === 'down' ? pageSize : -pageSize;
    const newIndex = Math.max(0, Math.min(this.elements.length - 1, this.currentIndex + increment));

    this.setCurrentElement(this.elements[newIndex], newIndex, event);
    return InteractionResults.consumed(undefined, true, true);
  }

  private setCurrentElement(element: TElement, index: number, event: KeyboardInteractionEvent): void {
    this.currentElement = element;
    this.currentIndex = index;
    this.callbacks.onFocusElement?.(element, event);
  }

  // Public API
  setElements(elements: TElement[]): void {
    this.elements = [...elements];
    
    // Reset current element if it's no longer in the list
    if (this.currentElement && !elements.find(el => el.id === this.currentElement!.id)) {
      this.currentElement = null;
      this.currentIndex = -1;
    }
  }

  getCurrentElement(): TElement | null {
    return this.currentElement;
  }

  setCurrentElementById(elementId: string): boolean {
    const index = this.elements.findIndex(el => el.id === elementId);
    if (index >= 0) {
      this.currentElement = this.elements[index];
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  focusNext(): void {
    if (this.elements.length === 0) return;
    
    const newIndex = this.currentIndex < this.elements.length - 1 ? this.currentIndex + 1 : 0;
    const fakeEvent: KeyboardInteractionEvent = {
      key: 'Tab',
      code: 'Tab',
      originalEvent: new KeyboardEvent('keydown'),
      timestamp: Date.now(),
      modifiers: { shift: false, ctrl: false, alt: false, meta: false }
    };
    
    this.setCurrentElement(this.elements[newIndex], newIndex, fakeEvent);
  }

  focusPrevious(): void {
    if (this.elements.length === 0) return;
    
    const newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.elements.length - 1;
    const fakeEvent: KeyboardInteractionEvent = {
      key: 'Tab',
      code: 'Tab',
      originalEvent: new KeyboardEvent('keydown'),
      timestamp: Date.now(),
      modifiers: { shift: true, ctrl: false, alt: false, meta: false }
    };
    
    this.setCurrentElement(this.elements[newIndex], newIndex, fakeEvent);
  }

  cleanup(): void {
    // Clear current state
    this.currentElement = null;
    this.currentIndex = -1;
    this.elements.length = 0;
  }
}

// Predefined keyboard binding sets
export const StandardGraphBindings = {
  // Navigation
  FOCUS_NEXT: {
    id: 'focus-next',
    combination: { key: 'Tab' },
    description: 'Focus next element',
    category: 'Navigation',
    preventDefault: true
  },
  
  FOCUS_PREVIOUS: {
    id: 'focus-previous',
    combination: { key: 'Tab', shift: true },
    description: 'Focus previous element',
    category: 'Navigation',
    preventDefault: true
  },

  // Selection
  SELECT_ALL: {
    id: 'select-all',
    combination: { key: 'a', ctrl: true },
    description: 'Select all elements',
    category: 'Selection',
    preventDefault: true
  },

  CLEAR_SELECTION: {
    id: 'clear-selection',
    combination: { key: 'Escape' },
    description: 'Clear selection',
    category: 'Selection'
  },

  // View
  FIT_TO_VIEW: {
    id: 'fit-to-view',
    combination: { key: 'f' },
    description: 'Fit graph to view',
    category: 'View'
  },

  ZOOM_IN: {
    id: 'zoom-in',
    combination: { key: '=', ctrl: true },
    description: 'Zoom in',
    category: 'View',
    repeatDelay: 300,
    repeatInterval: 100,
    preventDefault: true
  },

  ZOOM_OUT: {
    id: 'zoom-out',
    combination: { key: '-', ctrl: true },
    description: 'Zoom out',
    category: 'View',
    repeatDelay: 300,
    repeatInterval: 100,
    preventDefault: true
  },

  RESET_ZOOM: {
    id: 'reset-zoom',
    combination: { key: '0', ctrl: true },
    description: 'Reset zoom to 100%',
    category: 'View',
    preventDefault: true
  },

  // Help
  SHOW_HELP: {
    id: 'show-help',
    combination: { key: '?' },
    description: 'Show keyboard shortcuts',
    category: 'Help'
  }
} as const;

// Factory function for creating standard keyboard shortcuts
export function createStandardKeyboardShortcuts<TContext>(
  actions: {
    [K in keyof typeof StandardGraphBindings]?: (
      event: KeyboardInteractionEvent, 
      context: TContext
    ) => InteractionResult | Promise<InteractionResult>;
  }
): KeyBinding<TContext>[] {
  const bindings: KeyBinding<TContext>[] = [];

  for (const [key, template] of Object.entries(StandardGraphBindings)) {
    const actionKey = key as keyof typeof StandardGraphBindings;
    const action = actions[actionKey];
    
    if (action) {
      bindings.push({
        ...template,
        action
      } as KeyBinding<TContext>);
    }
  }

  return bindings;
}

// Help system for displaying keyboard shortcuts
export interface KeyboardHelpEntry {
  readonly id: string;
  readonly combination: string;
  readonly description: string;
  readonly category: string;
}

export function formatKeyboardHelp<TContext>(
  manager: KeyboardShortcutManager<TContext>
): KeyboardHelpEntry[] {
  const entries: KeyboardHelpEntry[] = [];
  
  for (const binding of manager.getAllBindings().values()) {
    entries.push({
      id: binding.id,
      combination: formatKeyCombination(binding.combination),
      description: binding.description,
      category: binding.category || 'Other'
    });
  }

  return entries.sort((a, b) => {
    // Sort by category first, then by description
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.description.localeCompare(b.description);
  });
}

export function formatKeyCombination(combination: KeyCombination): string {
  const parts: string[] = [];
  
  // Use platform-specific modifier names
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  
  if (combination.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (combination.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (combination.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (combination.meta) parts.push(isMac ? 'Cmd' : 'Meta');
  
  // Format special keys
  const keyMap: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space',
    'Enter': '↵',
    'Tab': 'Tab',
    'Escape': 'Esc'
  };
  
  const key = keyMap[combination.key] || combination.key.toUpperCase();
  parts.push(key);
  
  return parts.join(isMac ? '' : '+');
}