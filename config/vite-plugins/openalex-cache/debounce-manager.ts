export class DebounceManager {
  private pendingUpdates = new Map<string, NodeJS.Timeout>();
  private readonly DEBOUNCE_DELAY = 100; // 100ms delay

  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    ...args: Parameters<T>
  ): void {
    // Clear existing timeout for this path
    const existingTimeout = this.pendingUpdates.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        this.pendingUpdates.delete(key);
        await fn(...args);
      } catch (error) {
        console.error(`[openalex-cache] Failed in debounced update: ${error}`);
      }
    }, this.DEBOUNCE_DELAY);

    this.pendingUpdates.set(key, timeout);
  }

  clear(key: string): void {
    const existingTimeout = this.pendingUpdates.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.pendingUpdates.delete(key);
    }
  }

  clearAll(): void {
    for (const timeout of this.pendingUpdates.values()) {
      clearTimeout(timeout);
    }
    this.pendingUpdates.clear();
  }
}
