import { type InvalidInputError } from '../types/errors';
import { None,type Option, Some } from '../types/option';
import { Err,Ok, type Result } from '../types/result';

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
 * @template T - Type of elements stored in the queue
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
   * @param element - Element to insert
   * @param priority - Priority value (lower = higher priority)
   */
  insert(element: T, priority: number): void {
    const entry: HeapEntry<T> = { element, priority };
    const heap = this.heap;
    heap.push(entry);
    const index = heap.length - 1;
    this.positions.set(element, index);
    this.bubbleUp(index);
  }

  /**
   * Extract and return the element with minimum priority.
   * @returns Option containing the minimum element, or None if heap is empty
   */
  extractMin(): Option<T> {
    const heap = this.heap;
    const heapLength = heap.length;

    if (heapLength === 0) {
      return None();
    }

    const min = heap[0];
    const minElement = min.element;
    this.positions.delete(minElement);

    if (heapLength === 1) {
      heap.length = 0; // Faster than reassignment
      return Some(minElement);
    }

    // Move last element to root and bubble down
    const last = heap.pop();
    if (last === undefined) {
      // This should never happen since we checked heapLength > 1
      return None();
    }
    heap[0] = last;
    this.positions.set(last.element, 0);
    this.bubbleDown(0);

    return Some(minElement);
  }

  /**
   * Decrease the priority of an existing element.
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

    const heap = this.heap;
    const currentPriority = heap[index].priority;

    if (newPriority > currentPriority) {
      return Err({
        type: 'invalid-input',
        message: `New priority ${newPriority} is greater than current priority ${currentPriority}`,
      });
    }

    heap[index].priority = newPriority;
    this.bubbleUp(index);

    return Ok(void 0);
  }

  /**
   * Check if the heap is empty.
   * @returns true if heap contains no elements
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get the number of elements in the heap.
   * @returns Number of elements
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Extract multiple elements efficiently (optimized for performance tests).
   * Returns array of extracted elements to avoid Option wrapper overhead.
   * @param count
   * @internal
   */
  extractMinBatch(count: number): T[] {
    const result: T[] = [];
    const heap = this.heap;

    for (let i = 0; i < count && heap.length > 0; i++) {
      const min = heap[0];
      result.push(min.element);
      this.positions.delete(min.element);

      if (heap.length === 1) {
        heap.length = 0;
        break;
      }

      // Move last element to root and bubble down
      const last = heap.pop();
      if (last === undefined) {
        // This should never happen since we checked heap.length > 1
        break;
      }
      heap[0] = last;
      this.positions.set(last.element, 0);
      this.bubbleDown(0);
    }

    return result;
  }

  /**
   * Bubble up an element to maintain heap property.
   * @param index
   * @internal
   */
  private bubbleUp(index: number): void {
    const heap = this.heap;
    const positions = this.positions;

    while (index > 0) {
      const parentIndex = (index - 1) >> 1; // Bitwise divide by 2, faster than Math.floor
      const parent = heap[parentIndex];
      const current = heap[index];

      if (parent.priority <= current.priority) {
        break; // Heap property satisfied
      }

      // Inline swap for performance
      heap[index] = parent;
      heap[parentIndex] = current;

      // Update position map
      positions.set(current.element, parentIndex);
      positions.set(parent.element, index);

      index = parentIndex;
    }
  }

  /**
   * Bubble down an element to maintain heap property.
   * @param index
   * @internal
   */
  private bubbleDown(index: number): void {
    const heap = this.heap;
    const positions = this.positions;
    const heapLength = heap.length;

    while (true) {
      const leftChild = (index << 1) + 1; // Bitwise multiply by 2, faster
      const rightChild = leftChild + 1;
      let smallest = index;

      // Check if left child is smaller
      if (leftChild < heapLength) {
        const leftPriority = heap[leftChild].priority;
        if (leftPriority < heap[smallest].priority) {
          smallest = leftChild;
        }
      }

      // Check if right child is smaller
      if (rightChild < heapLength) {
        const rightPriority = heap[rightChild].priority;
        if (rightPriority < heap[smallest].priority) {
          smallest = rightChild;
        }
      }

      if (smallest === index) {
        break; // Heap property satisfied
      }

      // Inline swap for performance
      const current = heap[index];
      const swapTarget = heap[smallest];
      heap[index] = swapTarget;
      heap[smallest] = current;

      // Update position map
      positions.set(current.element, smallest);
      positions.set(swapTarget.element, index);

      index = smallest;
    }
  }

  /**
   * Swap two elements in the heap and update position map.
   * @param i
   * @param j
   * @internal
   * @deprecated Use inline swaps in bubbleUp/bubbleDown for better performance
   */
  private swap(i: number, j: number): void {
    const heap = this.heap;
    const positions = this.positions;

    const temp = heap[i];
    heap[i] = heap[j];
    heap[j] = temp;

    // Update position map
    positions.set(heap[i].element, i);
    positions.set(heap[j].element, j);
  }
}
