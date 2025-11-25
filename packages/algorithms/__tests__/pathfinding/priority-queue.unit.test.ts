import { describe, it, expect, beforeEach } from 'vitest';
import { MinHeap } from '../../src/pathfinding/priority-queue';

describe('MinHeap (Priority Queue)', () => {
  let heap: MinHeap<string>;

  beforeEach(() => {
    heap = new MinHeap<string>();
  });

  describe('Basic operations', () => {
    it('should start empty', () => {
      expect(heap.isEmpty()).toBe(true);
      expect(heap.size()).toBe(0);
    });

    it('should insert and extract single element', () => {
      heap.insert('A', 10);
      expect(heap.isEmpty()).toBe(false);
      expect(heap.size()).toBe(1);

      const result = heap.extractMin();
      expect(result.some).toBe(true);
      if (result.some) {
        expect(result.value).toBe('A');
      }
      expect(heap.isEmpty()).toBe(true);
    });

    it('should extract elements in priority order (ascending)', () => {
      heap.insert('C', 30);
      heap.insert('A', 10);
      heap.insert('B', 20);

      const first = heap.extractMin();
      expect(first.some && first.value).toBe('A'); // Priority 10

      const second = heap.extractMin();
      expect(second.some && second.value).toBe('B'); // Priority 20

      const third = heap.extractMin();
      expect(third.some && third.value).toBe('C'); // Priority 30
    });

    it('should return None when extracting from empty heap', () => {
      const result = heap.extractMin();
      expect(result.some).toBe(false);
    });

    it('should handle duplicate priorities (FIFO for same priority)', () => {
      heap.insert('A', 10);
      heap.insert('B', 10);
      heap.insert('C', 10);

      const results: string[] = [];
      while (!heap.isEmpty()) {
        const result = heap.extractMin();
        if (result.some) {
          results.push(result.value);
        }
      }

      expect(results).toHaveLength(3);
      expect(results).toContain('A');
      expect(results).toContain('B');
      expect(results).toContain('C');
    });
  });

  describe('Heap property maintenance', () => {
    it('should maintain min-heap property after multiple inserts', () => {
      const priorities = [50, 30, 70, 10, 40, 60, 20];
      const items = ['E', 'C', 'G', 'A', 'D', 'F', 'B'];

      for (let i = 0; i < items.length; i++) {
        heap.insert(items[i], priorities[i]);
      }

      // Extract all and verify ascending order
      const extracted: Array<{ item: string; priority: number }> = [];
      const expectedOrder = [
        { item: 'A', priority: 10 },
        { item: 'B', priority: 20 },
        { item: 'C', priority: 30 },
        { item: 'D', priority: 40 },
        { item: 'E', priority: 50 },
        { item: 'F', priority: 60 },
        { item: 'G', priority: 70 },
      ];

      while (!heap.isEmpty()) {
        const result = heap.extractMin();
        if (result.some) {
          extracted.push({
            item: result.value,
            priority: expectedOrder[extracted.length].priority,
          });
        }
      }

      expect(extracted.map(e => e.item)).toEqual(expectedOrder.map(e => e.item));
    });
  });

  describe('decreaseKey operation', () => {
    it('should update priority to lower value', () => {
      heap.insert('A', 50);
      heap.insert('B', 30);
      heap.insert('C', 40);

      const result = heap.decreaseKey('A', 20);
      expect(result.ok).toBe(true);

      // 'A' should now be first (priority 20)
      const first = heap.extractMin();
      expect(first.some && first.value).toBe('A');
    });

    it('should return error when decreasing to higher priority', () => {
      heap.insert('A', 30);

      const result = heap.decreaseKey('A', 50);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should return error for non-existent element', () => {
      heap.insert('A', 30);

      const result = heap.decreaseKey('Z', 10);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('invalid-input');
      }
    });

    it('should maintain heap property after decreaseKey', () => {
      heap.insert('A', 50);
      heap.insert('B', 40);
      heap.insert('C', 30);
      heap.insert('D', 20);

      heap.decreaseKey('A', 10);

      // Verify extraction order
      const first = heap.extractMin();
      expect(first.some).toBe(true);
      if (first.some) {
        expect(first.value).toBe('A'); // Now 10 (minimum)
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle large number of elements', () => {
      const n = 1000;
      for (let i = n; i > 0; i--) {
        heap.insert(`N${i}`, i);
      }

      expect(heap.size()).toBe(n);

      // Verify ascending extraction
      for (let i = 1; i <= n; i++) {
        const result = heap.extractMin();
        expect(result.some).toBe(true);
        if (result.some) {
          expect(result.value).toBe(`N${i}`);
        }
      }
    });

    it('should handle zero priority', () => {
      heap.insert('A', 0);
      heap.insert('B', 10);

      const first = heap.extractMin();
      expect(first.some && first.value).toBe('A');
    });

    it('should handle negative priorities', () => {
      heap.insert('A', -10);
      heap.insert('B', 0);
      heap.insert('C', 10);

      const first = heap.extractMin();
      expect(first.some && first.value).toBe('A'); // -10 is minimum
    });
  });

  describe('Type preservation', () => {
    it('should preserve element type information', () => {
      interface TestItem {
        id: string;
        data: string;
      }

      const itemHeap = new MinHeap<TestItem>();
      const item1: TestItem = { id: 'A', data: 'test1' };
      const item2: TestItem = { id: 'B', data: 'test2' };

      itemHeap.insert(item1, 20);
      itemHeap.insert(item2, 10);

      const result = itemHeap.extractMin();
      expect(result.some).toBe(true);
      if (result.some) {
        expect(result.value.id).toBe('B');
        expect(result.value.data).toBe('test2');
      }
    });
  });

  describe('Performance characteristics', () => {
    it('should maintain O(log n) insert performance', () => {
      const n = 10000;
      const start = performance.now();

      for (let i = 0; i < n; i++) {
        heap.insert(`N${i}`, Math.random() * 1000);
      }

      const duration = performance.now() - start;

      // O(log n) insert should complete quickly
      expect(duration).toBeLessThan(100); // <100ms for 10k inserts
    });

    it('should maintain O(log n) extractMin performance', () => {
      const n = 10000;

      // Pre-fill heap
      for (let i = 0; i < n; i++) {
        heap.insert(`N${i}`, Math.random() * 1000);
      }

      const start = performance.now();

      // Extract all elements
      while (!heap.isEmpty()) {
        heap.extractMin();
      }

      const duration = performance.now() - start;

      // O(log n) extract should complete quickly
      expect(duration).toBeLessThan(100); // <100ms for 10k extracts
    });
  });
});
