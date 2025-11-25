import { type Option, Some, None } from '../types/option';
import { type Result, Ok, Err } from '../types/result';
import { type InvalidInputError } from '../types/errors';

/**
 * Entry in the min-heap priority queue.
 * @internal
 */
interface HeapEntry<T> {
  element: T;
  priority: number;
}

/**
 * Min-Heap based priority queue implementation.
 *
 * Provides O(log n) insert and extractMin operations,
 * and O(log n) decreaseKey with element tracking.
 *
 * Time Complexity:
 * - insert: O(log n)
 * - extractMin: O(log n)
 * - decreaseKey: O(log n)
 * - isEmpty: O(1)
 * - size: O(1)
 *
 * Space Complexity: O(n) for heap array and position map
 *
 * @template T - Type of elements stored in the queue
 *
 * @example
 * ```typescript
 * const heap = new MinHeap<string>();
 * heap.insert('task1', 10);
 * heap.insert('task2', 5);
 * heap.insert('task3', 15);
 *
 * const min = heap.extractMin(); // Some('task2') - priority 5
 * ```
 */
export class MinHeap<T> {
  private heap: HeapEntry<T>[] = [];
  private positions: Map<T, number> = new Map();

  /**
   * Insert an element with given priority.
   *
   * @param element - Element to insert
   * @param priority - Priority value (lower = higher priority)
   */
  insert(element: T, priority: number): void {
    const entry: HeapEntry<T> = { element, priority };
    this.heap.push(entry);
    const index = this.heap.length - 1;
    this.positions.set(element, index);
    this.bubbleUp(index);
  }

  /**
   * Extract and return the element with minimum priority.
   *
   * @returns Option containing the minimum element, or None if heap is empty
   */
  extractMin(): Option<T> {
    if (this.heap.length === 0) {
      return None();
    }

    const min = this.heap[0];
    this.positions.delete(min.element);

    if (this.heap.length === 1) {
      this.heap = [];
      return Some(min.element);
    }

    // Move last element to root and bubble down
    const last = this.heap.pop()!;
    this.heap[0] = last;
    this.positions.set(last.element, 0);
    this.bubbleDown(0);

    return Some(min.element);
  }

  /**
   * Decrease the priority of an existing element.
   *
   * @param element - Element whose priority to decrease
   * @param newPriority - New priority value (must be lower than current)
   * @returns Result indicating success or error
   */
  decreaseKey(element: T, newPriority: number): Result<void, InvalidInputError> {
    const index = this.positions.get(element);

    if (index === undefined) {
      return Err({
        type: 'invalid-input',
        message: `Element not found in heap`,
      });
    }

    const currentPriority = this.heap[index].priority;

    if (newPriority > currentPriority) {
      return Err({
        type: 'invalid-input',
        message: `New priority ${newPriority} is greater than current priority ${currentPriority}`,
      });
    }

    this.heap[index].priority = newPriority;
    this.bubbleUp(index);

    return Ok(undefined);
  }

  /**
   * Check if the heap is empty.
   *
   * @returns true if heap contains no elements
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get the number of elements in the heap.
   *
   * @returns Number of elements
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Bubble up an element to maintain heap property.
   * @internal
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      const current = this.heap[index];

      if (parent.priority <= current.priority) {
        break; // Heap property satisfied
      }

      // Swap with parent
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Bubble down an element to maintain heap property.
   * @internal
   */
  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      // Check if left child is smaller
      if (
        leftChild < this.heap.length &&
        this.heap[leftChild].priority < this.heap[smallest].priority
      ) {
        smallest = leftChild;
      }

      // Check if right child is smaller
      if (
        rightChild < this.heap.length &&
        this.heap[rightChild].priority < this.heap[smallest].priority
      ) {
        smallest = rightChild;
      }

      if (smallest === index) {
        break; // Heap property satisfied
      }

      // Swap with smallest child
      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Swap two elements in the heap and update position map.
   * @internal
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    // Update position map
    this.positions.set(this.heap[i].element, i);
    this.positions.set(this.heap[j].element, j);
  }
}
