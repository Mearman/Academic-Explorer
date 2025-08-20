/**
 * Accessibility-focused interaction integration for graph components
 * Provides comprehensive screen reader support and keyboard navigation
 */

import {
  InteractionHandler,
  InteractionHandlerConfig,
  KeyboardInteractionStrategy as _KeyboardInteractionStrategy,
  KeyboardInteractionEvent,
  InteractionResult as _InteractionResult,
  InteractionResults,
  GraphElement,
  GraphPosition
} from './interaction-handlers';
import {
  KeyboardShortcutManager,
  NavigationKeyboardStrategy,
  KeyBinding,
  createStandardKeyboardShortcuts,
  formatKeyboardHelp,
  KeyboardHelpEntry
} from './keyboard-shortcuts';
import { createStandardMouseInteractions } from './mouse-interactions';
import { createStandardTouchInteractions } from './touch-interactions';

// Accessibility-specific interfaces
export interface AccessibilityConfig {
  readonly enableScreenReader?: boolean;
  readonly enableKeyboardNavigation?: boolean;
  readonly enableHighContrast?: boolean;
  readonly enableReducedMotion?: boolean;
  readonly announceChanges?: boolean;
  readonly verboseDescriptions?: boolean;
  readonly customAriaLabels?: Record<string, string>;
  readonly skipLinks?: boolean;
  readonly focusIndicator?: boolean;
}

export interface ScreenReaderAnnouncement {
  readonly message: string;
  readonly priority: 'polite' | 'assertive' | 'off';
  readonly delay?: number; // Delay before announcement (ms)
}

export interface AccessibilityState<TElement extends GraphElement = GraphElement> {
  readonly focusedElement: TElement | null;
  readonly selectedElements: readonly string[];
  readonly screenReaderEnabled: boolean;
  readonly highContrastMode: boolean;
  readonly reducedMotionMode: boolean;
  readonly currentZoom: number;
  readonly viewportBounds: { x: number; y: number; width: number; height: number };
}

export interface AccessibilityCallbacks<TElement extends GraphElement = GraphElement> {
  onFocusChange?(element: TElement | null, previousElement: TElement | null): void;
  onSelectionChange?(selectedElements: readonly string[]): void;
  onAnnouncement?(announcement: ScreenReaderAnnouncement): void;
  onNavigationCommand?(command: string, element: TElement | null): void;
  getElementDescription?(element: TElement): string;
  getElementRole?(element: TElement): string;
  getElementState?(element: TElement): Record<string, boolean | string | number>;
}

// Screen reader management
export class ScreenReaderManager {
  private readonly liveRegion: HTMLElement;
  private readonly politeRegion: HTMLElement;
  private readonly assertiveRegion: HTMLElement;
  private announcementQueue: ScreenReaderAnnouncement[] = [];
  private isProcessing = false;

  constructor(container: HTMLElement) {
    // Create live regions for announcements
    this.liveRegion = this.createLiveRegion(container, 'sr-live-region', 'polite');
    this.politeRegion = this.createLiveRegion(container, 'sr-polite-region', 'polite');
    this.assertiveRegion = this.createLiveRegion(container, 'sr-assertive-region', 'assertive');
  }

  private createLiveRegion(
    container: HTMLElement,
    id: string,
    priority: 'polite' | 'assertive'
  ): HTMLElement {
    const region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    container.appendChild(region);
    return region;
  }

  announce(announcement: ScreenReaderAnnouncement): void {
    this.announcementQueue.push(announcement);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.announcementQueue.length === 0) return;

    this.isProcessing = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift()!;
      
      if (announcement.priority === 'off') continue;

      if (announcement.delay) {
        await new Promise(resolve => setTimeout(resolve, announcement.delay));
      }

      const region = announcement.priority === 'assertive' 
        ? this.assertiveRegion 
        : this.politeRegion;

      // Clear previous content
      region.textContent = '';
      
      // Add new announcement (triggers screen reader)
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          region.textContent = announcement.message;
          resolve(void 0);
        });
      });

      // Wait a bit before processing next announcement
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.liveRegion.textContent = '';
    this.politeRegion.textContent = '';
    this.assertiveRegion.textContent = '';
    this.announcementQueue.length = 0;
  }

  destroy(): void {
    this.clear();
    this.liveRegion.remove();
    this.politeRegion.remove();
    this.assertiveRegion.remove();
  }
}

// Focus management for complex graph structures
export class FocusManager<TElement extends GraphElement = GraphElement> {
  private elements: TElement[] = [];
  private focusHistory: TElement[] = [];
  private currentIndex = -1;
  private readonly maxHistory = 10;

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: {
      onFocusChange?: (element: TElement | null, previous: TElement | null) => void;
      getElementPosition?: (element: TElement) => GraphPosition | null;
      isElementVisible?: (element: TElement) => boolean;
    } = {}
  ) {
    this.setupFocusIndicator();
  }

  setElements(elements: TElement[]): void {
    this.elements = [...elements];
    
    // Remove invalid current focus
    if (this.currentIndex >= 0 && !this.elements[this.currentIndex]) {
      this.setFocus(null);
    }
  }

  getCurrentElement(): TElement | null {
    return this.currentIndex >= 0 ? this.elements[this.currentIndex] : null;
  }

  setFocus(element: TElement | null, addToHistory = true): void {
    const previousElement = this.getCurrentElement();
    
    if (element) {
      const index = this.elements.findIndex(el => el.id === element.id);
      if (index >= 0) {
        this.currentIndex = index;
        
        if (addToHistory && previousElement && previousElement.id !== element.id) {
          this.addToHistory(previousElement);
        }
      }
    } else {
      this.currentIndex = -1;
    }

    this.updateFocusIndicator();
    this.callbacks.onFocusChange?.(element, previousElement);
  }

  focusNext(wrap = true): boolean {
    if (this.elements.length === 0) return false;

    let newIndex = this.currentIndex + 1;
    
    if (newIndex >= this.elements.length) {
      if (!wrap) return false;
      newIndex = 0;
    }

    // Skip invisible elements
    while (newIndex !== this.currentIndex) {
      const element = this.elements[newIndex];
      if (!element || this.callbacks.isElementVisible?.(element) !== false) {
        this.setFocus(element);
        return true;
      }
      
      newIndex++;
      if (newIndex >= this.elements.length) {
        if (!wrap) break;
        newIndex = 0;
      }
    }

    return false;
  }

  focusPrevious(wrap = true): boolean {
    if (this.elements.length === 0) return false;

    let newIndex = this.currentIndex - 1;
    
    if (newIndex < 0) {
      if (!wrap) return false;
      newIndex = this.elements.length - 1;
    }

    // Skip invisible elements
    while (newIndex !== this.currentIndex) {
      const element = this.elements[newIndex];
      if (!element || this.callbacks.isElementVisible?.(element) !== false) {
        this.setFocus(element);
        return true;
      }
      
      newIndex--;
      if (newIndex < 0) {
        if (!wrap) break;
        newIndex = this.elements.length - 1;
      }
    }

    return false;
  }

  focusFirst(): boolean {
    if (this.elements.length === 0) return false;
    
    for (let i = 0; i < this.elements.length; i++) {
      const element = this.elements[i];
      if (this.callbacks.isElementVisible?.(element) !== false) {
        this.setFocus(element);
        return true;
      }
    }
    
    return false;
  }

  focusLast(): boolean {
    if (this.elements.length === 0) return false;
    
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const element = this.elements[i];
      if (this.callbacks.isElementVisible?.(element) !== false) {
        this.setFocus(element);
        return true;
      }
    }
    
    return false;
  }

  restoreFromHistory(): boolean {
    if (this.focusHistory.length === 0) return false;
    
    const lastElement = this.focusHistory.pop()!;
    this.setFocus(lastElement, false);
    return true;
  }

  private addToHistory(element: TElement): void {
    // Remove duplicate if exists
    const existingIndex = this.focusHistory.findIndex(el => el.id === element.id);
    if (existingIndex >= 0) {
      this.focusHistory.splice(existingIndex, 1);
    }

    this.focusHistory.push(element);

    // Limit history size
    if (this.focusHistory.length > this.maxHistory) {
      this.focusHistory.shift();
    }
  }

  private setupFocusIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'graph-focus-indicator';
    indicator.style.position = 'absolute';
    indicator.style.pointerEvents = 'none';
    indicator.style.border = '2px solid #0066cc';
    indicator.style.borderRadius = '4px';
    indicator.style.zIndex = '1000';
    indicator.style.display = 'none';
    indicator.setAttribute('aria-hidden', 'true');
    
    this.container.appendChild(indicator);
  }

  private updateFocusIndicator(): void {
    const indicator = this.container.querySelector('.graph-focus-indicator') as HTMLElement;
    if (!indicator) return;

    const currentElement = this.getCurrentElement();
    
    if (!currentElement) {
      indicator.style.display = 'none';
      return;
    }

    const position = this.callbacks.getElementPosition?.(currentElement);
    if (!position) {
      indicator.style.display = 'none';
      return;
    }

    // Position and show focus indicator
    const padding = 4;
    indicator.style.left = `${position.x - padding}px`;
    indicator.style.top = `${position.y - padding}px`;
    indicator.style.width = `${20 + padding * 2}px`; // Default element size + padding
    indicator.style.height = `${20 + padding * 2}px`;
    indicator.style.display = 'block';
  }

  destroy(): void {
    const indicator = this.container.querySelector('.graph-focus-indicator');
    indicator?.remove();
  }
}

// Main accessibility interaction manager
export class AccessibilityInteractionManager<TElement extends GraphElement = GraphElement> {
  private readonly interactionHandler: InteractionHandler<TElement>;
  private readonly keyboardManager: KeyboardShortcutManager<AccessibilityState<TElement>>;
  private readonly navigationStrategy: NavigationKeyboardStrategy<TElement>;
  private readonly screenReader: ScreenReaderManager;
  private readonly focusManager: FocusManager<TElement>;
  private readonly config: Required<AccessibilityConfig>;
  private readonly callbacks: AccessibilityCallbacks<TElement>;
  
  private state: AccessibilityState<TElement> = {
    focusedElement: null,
    selectedElements: [],
    screenReaderEnabled: this.detectScreenReader(),
    highContrastMode: this.detectHighContrast(),
    reducedMotionMode: this.detectReducedMotion(),
    currentZoom: 1,
    viewportBounds: { x: 0, y: 0, width: 0, height: 0 }
  };

  constructor(
    handlerConfig: InteractionHandlerConfig<TElement>,
    accessibilityConfig: AccessibilityConfig = {},
    callbacks: AccessibilityCallbacks<TElement> = {}
  ) {
    this.config = {
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      enableReducedMotion: false,
      announceChanges: true,
      verboseDescriptions: false,
      customAriaLabels: {},
      skipLinks: true,
      focusIndicator: true,
      ...accessibilityConfig
    };
    
    this.callbacks = callbacks;

    // Initialize core systems
    this.screenReader = new ScreenReaderManager(handlerConfig.element);
    this.focusManager = new FocusManager(handlerConfig.element, {
      onFocusChange: this.handleFocusChange.bind(this),
      getElementPosition: this.getElementPosition.bind(this),
      isElementVisible: this.isElementVisible.bind(this)
    });

    // Setup keyboard strategies
    this.navigationStrategy = new NavigationKeyboardStrategy({
      onFocusElement: this.handleNavigationFocus.bind(this),
      onSelectElement: this.handleNavigationSelect.bind(this),
      onActivateElement: this.handleNavigationActivate.bind(this),
      onNavigate: this.handleNavigationCommand.bind(this)
    });

    // Create keyboard shortcuts
    const shortcuts = this.createAccessibilityShortcuts();
    this.keyboardManager = new KeyboardShortcutManager(shortcuts);
    this.keyboardManager.setContext(this.state);

    // Setup interaction handler
    const enhancedConfig = {
      ...handlerConfig,
      enableAccessibility: true,
      ariaLabel: this.config.customAriaLabels['graph'] || 'Interactive graph visualization'
    };

    this.interactionHandler = new InteractionHandler(enhancedConfig);
    
    // Add strategies
    this.interactionHandler.addKeyboardStrategy(this.navigationStrategy);
    this.interactionHandler.addKeyboardStrategy(this.keyboardManager);

    // Add mouse interactions with accessibility enhancements
    const mouseStrategies = createStandardMouseInteractions<TElement>({
      hover: {
        callbacks: {
          onHoverStart: this.handleMouseHover.bind(this),
          onHoverEnd: this.handleMouseHoverEnd.bind(this)
        }
      },
      select: {
        callbacks: {
          onSelectionChange: this.handleSelectionChange.bind(this)
        }
      }
    });

    for (const strategy of mouseStrategies) {
      this.interactionHandler.addMouseStrategy(strategy);
    }

    // Add touch interactions
    const touchStrategies = createStandardTouchInteractions<TElement>({
      tap: {
        callbacks: {
          onTap: this.handleTouchTap.bind(this),
          onDoubleTap: this.handleTouchDoubleTap.bind(this)
        }
      }
    });

    for (const strategy of touchStrategies) {
      this.interactionHandler.addTouchStrategy(strategy);
    }

    // Setup accessibility monitoring
    this.setupAccessibilityMonitoring();
    this.announceInitialState();
  }

  // Element management
  setElements(elements: TElement[]): void {
    this.focusManager.setElements(elements);
    this.navigationStrategy.setElements(elements);
    
    if (this.config.announceChanges) {
      this.announce({
        message: `Graph updated with ${elements.length} elements`,
        priority: 'polite'
      });
    }
  }

  // Focus and selection management
  setFocusedElement(element: TElement | null): void {
    this.focusManager.setFocus(element);
    this.interactionHandler.setFocusedElement(element);
  }

  getFocusedElement(): TElement | null {
    return this.state.focusedElement;
  }

  getSelectedElements(): readonly string[] {
    return this.state.selectedElements;
  }

  // Announcement system
  announce(announcement: ScreenReaderAnnouncement): void {
    if (!this.config.enableScreenReader || !this.state.screenReaderEnabled) return;
    
    this.screenReader.announce(announcement);
    this.callbacks.onAnnouncement?.(announcement);
  }

  // Keyboard help system
  getKeyboardHelp(): KeyboardHelpEntry[] {
    return formatKeyboardHelp(this.keyboardManager);
  }

  showKeyboardHelp(): void {
    const help = this.getKeyboardHelp();
    const helpText = help
      .map(entry => `${entry.combination}: ${entry.description}`)
      .join('. ');

    this.announce({
      message: `Keyboard shortcuts: ${helpText}`,
      priority: 'polite'
    });
  }

  // Event handlers
  private handleFocusChange(element: TElement | null, previous: TElement | null): void {
    this.state = { ...this.state, focusedElement: element };
    this.keyboardManager.setContext(this.state);
    
    if (element && this.config.announceChanges) {
      const description = this.getElementDescription(element);
      this.announce({
        message: `Focused: ${description}`,
        priority: 'polite',
        delay: 100
      });
    }

    this.callbacks.onFocusChange?.(element, previous);
  }

  private handleNavigationFocus(element: TElement, _event: KeyboardInteractionEvent): void {
    this.setFocusedElement(element);
  }

  private handleNavigationSelect(element: TElement, _event: KeyboardInteractionEvent): void {
    const newSelection = this.state.selectedElements.includes(element.id)
      ? this.state.selectedElements.filter(id => id !== element.id)
      : [...this.state.selectedElements, element.id];
    
    this.handleSelectionChange(newSelection, null as unknown as any);
  }

  private handleNavigationActivate(element: TElement, _event: KeyboardInteractionEvent): void {
    const description = this.getElementDescription(element);
    this.announce({
      message: `Activated: ${description}`,
      priority: 'assertive'
    });

    this.callbacks.onNavigationCommand?.('activate', element);
  }

  private handleNavigationCommand(action: any, _event: KeyboardInteractionEvent): void {
    this.callbacks.onNavigationCommand?.(action.type, action.element);
  }

  private handleMouseHover(element: TElement, _event: any): void {
    if (this.config.announceChanges && this.state.screenReaderEnabled) {
      const description = this.getElementDescription(element);
      this.announce({
        message: `Hovering: ${description}`,
        priority: 'polite',
        delay: 200
      });
    }
  }

  private handleMouseHoverEnd(): void {
    // Optional: announce hover end
  }

  private handleTouchTap(state: any, _event: any): void {
    if (state.element) {
      this.setFocusedElement(state.element);
    }
  }

  private handleTouchDoubleTap(state: any, event: any): void {
    if (state.element) {
      this.handleNavigationActivate(state.element, event as any);
    }
  }

  private handleSelectionChange(selectedElements: readonly string[], _event?: any): void {
    this.state = { ...this.state, selectedElements };
    this.keyboardManager.setContext(this.state);

    if (this.config.announceChanges) {
      const count = selectedElements.length;
      const message = count === 0 
        ? 'Selection cleared'
        : count === 1
          ? `1 element selected`
          : `${count} elements selected`;
      
      this.announce({
        message,
        priority: 'polite'
      });
    }

    this.callbacks.onSelectionChange?.(selectedElements);
  }

  // Accessibility detection and setup
  private detectScreenReader(): boolean {
    // Basic screen reader detection
    if (typeof window === 'undefined') return false;
    
    return !!(
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      window.speechSynthesis ||
      (window as any).speechSynthesis
    );
  }

  private detectHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  private detectReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private setupAccessibilityMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor preference changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    contrastQuery.addEventListener('change', (e) => {
      this.state = { ...this.state, highContrastMode: e.matches };
      if (e.matches) {
        this.announce({
          message: 'High contrast mode enabled',
          priority: 'polite'
        });
      }
    });

    motionQuery.addEventListener('change', (e) => {
      this.state = { ...this.state, reducedMotionMode: e.matches };
      if (e.matches) {
        this.announce({
          message: 'Reduced motion mode enabled',
          priority: 'polite'
        });
      }
    });
  }

  private announceInitialState(): void {
    if (!this.config.announceChanges) return;

    const messages: string[] = [];
    
    if (this.state.screenReaderEnabled) {
      messages.push('Screen reader support enabled');
    }
    
    if (this.state.highContrastMode) {
      messages.push('High contrast mode detected');
    }
    
    if (this.state.reducedMotionMode) {
      messages.push('Reduced motion mode detected');
    }

    messages.push('Use Tab to navigate elements, Space to select, Enter to activate, ? for help');

    if (messages.length > 0) {
      this.announce({
        message: messages.join('. '),
        priority: 'polite',
        delay: 1000
      });
    }
  }

  private createAccessibilityShortcuts(): KeyBinding<AccessibilityState<TElement>>[] {
    return createStandardKeyboardShortcuts({
      FOCUS_NEXT: () => {
        this.focusManager.focusNext();
        return InteractionResults.consumed();
      },
      FOCUS_PREVIOUS: () => {
        this.focusManager.focusPrevious();
        return InteractionResults.consumed();
      },
      SELECT_ALL: () => {
        // Implementation would depend on available elements
        return InteractionResults.consumed();
      },
      CLEAR_SELECTION: () => {
        this.handleSelectionChange([]);
        return InteractionResults.consumed();
      },
      SHOW_HELP: () => {
        this.showKeyboardHelp();
        return InteractionResults.consumed();
      }
    });
  }

  private getElementDescription(element: TElement): string {
    const customDescription = this.callbacks.getElementDescription?.(element);
    if (customDescription) return customDescription;

    const role = this.callbacks.getElementRole?.(element) || element.type;
    const state = this.callbacks.getElementState?.(element);
    
    let description = `${role} ${element.id}`;
    
    if (state) {
      const stateDescriptions = Object.entries(state)
        .filter(([_, value]) => value)
        .map(([key, value]) => typeof value === 'boolean' ? key : `${key}: ${value}`);
      
      if (stateDescriptions.length > 0) {
        description += `, ${stateDescriptions.join(', ')}`;
      }
    }

    return description;
  }

  private getElementPosition(_element: TElement): GraphPosition | null {
    // This would be implemented by the consumer with actual element positioning
    return null;
  }

  private isElementVisible(_element: TElement): boolean {
    // This would be implemented by the consumer with actual visibility logic
    return true;
  }

  // Cleanup
  destroy(): void {
    this.interactionHandler.destroy();
    this.screenReader.destroy();
    this.focusManager.destroy();
    this.keyboardManager.cleanup();
    this.navigationStrategy.cleanup?.();
  }

  // State access
  getState(): AccessibilityState<TElement> {
    return { ...this.state };
  }

  updateState(updates: Partial<AccessibilityState<TElement>>): void {
    this.state = { ...this.state, ...updates };
    this.keyboardManager.setContext(this.state);
  }
}

// Factory function for easy setup
export function createAccessibleGraphInteractions<TElement extends GraphElement = GraphElement>(
  element: HTMLElement,
  elementDetector: InteractionHandlerConfig<TElement>['elementDetector'],
  options: {
    accessibility?: AccessibilityConfig;
    callbacks?: AccessibilityCallbacks<TElement>;
    coordinateTransform?: InteractionHandlerConfig<TElement>['coordinateTransform'];
  } = {}
): AccessibilityInteractionManager<TElement> {
  const handlerConfig: InteractionHandlerConfig<TElement> = {
    element,
    elementDetector,
    coordinateTransform: options.coordinateTransform,
    enableAccessibility: true
  };

  return new AccessibilityInteractionManager(
    handlerConfig,
    options.accessibility,
    options.callbacks
  );
}