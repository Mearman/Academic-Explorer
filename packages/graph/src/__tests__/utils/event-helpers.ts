/**
 * Event listener testing helpers
 * Provides utilities for testing event-driven behavior in graph components
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';

/**
 * Event tracking state
 */
export interface EventTrackingState {
  events: Array<{
    type: string;
    data: unknown;
    timestamp: number;
    source?: string;
  }>;
  listeners: Map<EventEmitter, Map<string, Set<(...args: unknown[]) => void>>>;
}

/**
 * Event testing helper class
 */
export class EventTestHelper {
  private state: EventTrackingState = {
    events: [],
    listeners: new Map(),
  };

  private originalEmit?: typeof EventEmitter.prototype.emit;

  /**
   * Start tracking events from an emitter
   */
  track(emitter: EventEmitter, events?: string[], sourceLabel?: string): void {
    if (!this.state.listeners.has(emitter)) {
      this.state.listeners.set(emitter, new Map());
    }

    const emitterListeners = this.state.listeners.get(emitter)!;

    const eventsToTrack = events || ['*']; // Track all events if none specified

    for (const eventType of eventsToTrack) {
      if (!emitterListeners.has(eventType)) {
        emitterListeners.set(eventType, new Set());
      }

      const listener = (...args: unknown[]) => {
        this.state.events.push({
          type: eventType,
          data: args.length === 1 ? args[0] : args,
          timestamp: Date.now(),
          source: sourceLabel,
        });
      };

      emitterListeners.get(eventType)!.add(listener);

      if (eventType === '*') {
        // For tracking all events, we need to monkey-patch emit
        if (!this.originalEmit) {
          this.originalEmit = emitter.emit;
        }

        emitter.emit = function(this: EventEmitter, event: string, ...args: unknown[]) {
          listener(event, ...args);
          return (emitter as any).originalEmit.call(this, event, ...args);
        } as any;
      } else {
        emitter.on(eventType, listener);
      }
    }
  }

  /**
   * Stop tracking events from an emitter
   */
  untrack(emitter: EventEmitter, events?: string[]): void {
    const emitterListeners = this.state.listeners.get(emitter);
    if (!emitterListeners) return;

    const eventsToUntrack = events || Array.from(emitterListeners.keys());

    for (const eventType of eventsToUntrack) {
      const listeners = emitterListeners.get(eventType);
      if (!listeners) continue;

      for (const listener of listeners) {
        if (eventType === '*') {
          // Restore original emit if this was the only wildcard listener
          if (this.originalEmit) {
            emitter.emit = this.originalEmit;
            this.originalEmit = undefined;
          }
        } else {
          emitter.removeListener(eventType, listener);
        }
      }

      emitterListeners.delete(eventType);
    }

    if (emitterListeners.size === 0) {
      this.state.listeners.delete(emitter);
    }
  }

  /**
   * Clear all tracked events
   */
  clearEvents(): void {
    this.state.events.length = 0;
  }

  /**
   * Get all tracked events
   */
  getEvents(): EventTrackingState['events'] {
    return [...this.state.events];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): EventTrackingState['events'] {
    return this.state.events.filter(event => event.type === type);
  }

  /**
   * Get events by source
   */
  getEventsBySource(source: string): EventTrackingState['events'] {
    return this.state.events.filter(event => event.source === source);
  }

  /**
   * Get events within a time range
   */
  getEventsInRange(startTime: number, endTime: number): EventTrackingState['events'] {
    return this.state.events.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Wait for specific event sequence
   */
  async waitForSequence(
    sequence: string[],
    options: {
      timeout?: number;
      source?: string;
      allowIntermediateEvents?: boolean;
    } = {}
  ): Promise<EventTrackingState['events']> {
    const { timeout = 5000, source, allowIntermediateEvents = true } = options;
    const startTime = Date.now();
    let sequenceIndex = 0;
    const matchedEvents: EventTrackingState['events'] = [];

    return new Promise((resolve, reject) => {
      const checkSequence = () => {
        const relevantEvents = source
          ? this.state.events.filter(e => e.source === source)
          : this.state.events;

        for (let i = matchedEvents.length; i < relevantEvents.length; i++) {
          const event = relevantEvents[i];

          if (event.type === sequence[sequenceIndex]) {
            matchedEvents.push(event);
            sequenceIndex++;

            if (sequenceIndex >= sequence.length) {
              resolve(matchedEvents);
              return;
            }
          } else if (!allowIntermediateEvents) {
            reject(new Error(`Unexpected event "${event.type}" at position ${sequenceIndex}. Expected "${sequence[sequenceIndex]}"`));
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for event sequence: ${sequence.join(' → ')}. Got: ${matchedEvents.map(e => e.type).join(' → ')}`));
          return;
        }

        setTimeout(checkSequence, 10);
      };

      checkSequence();
    });
  }

  /**
   * Assert event count
   */
  expectEventCount(type: string, expectedCount: number): void {
    const events = this.getEventsByType(type);
    if (events.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} "${type}" events, but got ${events.length}`);
    }
  }

  /**
   * Assert event was fired with specific data
   */
  expectEventWithData(type: string, expectedData: unknown): void {
    const events = this.getEventsByType(type);
    const matchingEvent = events.find(event =>
      JSON.stringify(event.data) === JSON.stringify(expectedData)
    );

    if (!matchingEvent) {
      throw new Error(`Expected "${type}" event with data ${JSON.stringify(expectedData)}, but none found`);
    }
  }

  /**
   * Assert events were fired in order
   */
  expectEventOrder(types: string[]): void {
    const relevantEvents = this.state.events.filter(event => types.includes(event.type));
    const actualOrder = relevantEvents.map(event => event.type);

    // Check if the actual order matches the expected order (allowing for repetitions)
    let expectedIndex = 0;
    for (const actualType of actualOrder) {
      if (actualType === types[expectedIndex]) {
        expectedIndex++;
      }
    }

    if (expectedIndex < types.length) {
      throw new Error(`Events not fired in expected order. Expected: ${types.join(' → ')}, Actual: ${actualOrder.join(' → ')}`);
    }
  }

  /**
   * Create a spy that tracks calls as events
   */
  createEventSpy(eventType: string, sourceLabel?: string): ReturnType<typeof vi.fn> {
    const spy = vi.fn();
    const originalSpy = spy;

    spy.mockImplementation((...args: unknown[]) => {
      this.state.events.push({
        type: eventType,
        data: args.length === 1 ? args[0] : args,
        timestamp: Date.now(),
        source: sourceLabel,
      });
      return originalSpy(...args);
    });

    return spy;
  }

  /**
   * Mock an EventEmitter for testing
   */
  createMockEmitter(sourceLabel?: string): EventEmitter {
    const emitter = new EventEmitter();
    this.track(emitter, undefined, sourceLabel);
    return emitter;
  }

  /**
   * Clean up all tracking
   */
  cleanup(): void {
    // Untrack all emitters
    for (const emitter of this.state.listeners.keys()) {
      this.untrack(emitter);
    }

    // Restore original methods
    if (this.originalEmit) {
      this.originalEmit = undefined;
    }

    this.clearEvents();
  }

  /**
   * Get event statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventTypes: Record<string, number>;
    sources: Record<string, number>;
    timeline: Array<{ time: number; count: number }>;
  } {
    const eventTypes: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const timelineBuckets: Record<number, number> = {};

    for (const event of this.state.events) {
      // Count by type
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;

      // Count by source
      if (event.source) {
        sources[event.source] = (sources[event.source] || 0) + 1;
      }

      // Timeline (bucket by seconds)
      const bucket = Math.floor(event.timestamp / 1000) * 1000;
      timelineBuckets[bucket] = (timelineBuckets[bucket] || 0) + 1;
    }

    const timeline = Object.entries(timelineBuckets)
      .map(([time, count]) => ({ time: parseInt(time), count }))
      .sort((a, b) => a.time - b.time);

    return {
      totalEvents: this.state.events.length,
      eventTypes,
      sources,
      timeline,
    };
  }
}

/**
 * Event pattern matching utilities
 */
export const eventPatterns = {
  /**
   * Provider lifecycle events
   */
  providerLifecycle: ['requestStart', 'entityFetched', 'requestSuccess'],

  /**
   * Graph update events
   */
  graphUpdate: ['nodesAdded', 'edgesAdded', 'layoutApplied'],

  /**
   * Error handling events
   */
  errorHandling: ['requestError', 'cacheError', 'validationError'],

  /**
   * User interaction events
   */
  userInteraction: ['nodeClick', 'nodeHover', 'backgroundClick'],
};

/**
 * Create event assertions for common patterns
 */
export function createEventAssertions(helper: EventTestHelper) {
  return {
    expectProviderRequest: (providerId?: string) => {
      helper.expectEventCount('requestStart', 1);
      helper.expectEventCount('requestSuccess', 1);
    },

    expectGraphUpdate: () => {
      const updateEvents = helper.getEventsByType('graphUpdate');
      if (updateEvents.length === 0) {
        throw new Error('Expected graph update events');
      }
    },

    expectNoErrors: () => {
      const errorEvents = helper.getEvents().filter(e =>
        e.type.includes('error') || e.type.includes('Error')
      );
      if (errorEvents.length > 0) {
        throw new Error(`Unexpected error events: ${errorEvents.map(e => e.type).join(', ')}`);
      }
    },

    expectUserInteraction: (interactionType: string) => {
      helper.expectEventCount(interactionType, 1);
    },
  };
}

/**
 * Utility for mocking event timing
 */
export class EventTimingMock {
  private mockDate = Date.now();
  private originalDateNow = Date.now;

  start(): void {
    Date.now = vi.fn(() => this.mockDate);
  }

  advance(ms: number): void {
    this.mockDate += ms;
  }

  stop(): void {
    Date.now = this.originalDateNow;
  }
}

/**
 * Global event helper instance
 */
let globalEventHelper: EventTestHelper | null = null;

export function getEventHelper(): EventTestHelper {
  if (!globalEventHelper) {
    globalEventHelper = new EventTestHelper();
  }
  return globalEventHelper;
}

export function resetEventHelper(): void {
  if (globalEventHelper) {
    globalEventHelper.cleanup();
    globalEventHelper = null;
  }
}

// Auto cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', resetEventHelper);
}