/**
 * Generic data manipulation utilities
 * These utilities are domain-agnostic and can be used across packages
 */

import {
  debounce,
  uniqBy,
  sortBy,
  groupBy,
  omit,
  pick,
  isEmpty,
  isArray,
  isString
} from "lodash-es";

/**
 * Debounced search function for user input
 */
export const debouncedSearch = debounce((searchFn: (query: string) => void, query: string) => {
  searchFn(query);
}, 300);

/**
 * Remove duplicate items from an array by a specific key
 */
export function removeDuplicatesBy<T>(array: T[], key: keyof T): T[] {
  return uniqBy(array, key);
}

/**
 * Sort items by a numeric property (descending by default)
 */
export function sortByNumericProperty<T>(
  items: T[],
  getProperty: (item: T) => number | null | undefined,
  ascending = false
): T[] {
  const sorted = sortBy(items, (item) => getProperty(item) ?? 0);
  return ascending ? sorted : sorted.reverse();
}

/**
 * Sort items by a string property (ascending by default)
 */
export function sortByStringProperty<T>(
  items: T[],
  getProperty: (item: T) => string | null | undefined,
  ascending = true
): T[] {
  const sorted = sortBy(items, (item) => getProperty(item) ?? "");
  return ascending ? sorted : sorted.reverse();
}

/**
 * Group items by a property value
 */
export function groupByProperty<T>(
  items: T[],
  getGroupKey: (item: T) => string | number,
  _defaultKey = "Unknown"
): Record<string, T[]> {
  return groupBy(items, (item) => {
    const key = getGroupKey(item);
    return key.toString();
  });
}

/**
 * Extract safe properties from an object, omitting undefined/null values
 */
export function extractSafeProperties<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return pick(obj, keys);
}

/**
 * Remove sensitive or unnecessary properties from objects
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  keysToOmit: (keyof T)[]
): Omit<T, keyof T> {
  return omit(obj, keysToOmit);
}

/**
 * Check if a search query is valid (not empty, not just whitespace)
 */
export function isValidSearchQuery(query: unknown): query is string {
  return isString(query) && query.trim().length > 0;
}

/**
 * Normalize search query (trim, lowercase)
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Check if an array contains valid data
 */
export function hasValidData<T>(data: unknown): data is T[] {
  return isArray(data) && !isEmpty(data);
}

/**
 * Get display name with fallback from multiple possible properties
 */
export function getDisplayName(item: {
  display_name?: string | null;
  title?: string | null;
  name?: string | null;
}, fallback = "Untitled"): string {
  return item.display_name ?? item.title ?? item.name ?? fallback;
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatLargeNumber(num: number | null | undefined): string {
  if (!num || num === 0) return "0";

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }

  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toString();
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Create a range of numbers from start to end
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten a nested array by one level
 */
export function flatten<T>(arrays: T[][]): T[] {
  return arrays.reduce((acc, arr) => acc.concat(arr), []);
}

/**
 * Create a Map from an array using a key function
 */
export function arrayToMap<T, K>(
  array: T[],
  getKey: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of array) {
    map.set(getKey(item), item);
  }
  return map;
}

/**
 * Create a lookup object from an array using a key function
 */
export function arrayToLookup<T>(
  array: T[],
  getKey: (item: T) => string | number
): Record<string, T> {
  const lookup: Record<string, T> = {};
  for (const item of array) {
    const key = getKey(item).toString();
    lookup[key] = item;
  }
  return lookup;
}

/**
 * Get unique values from an array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Get intersection of two arrays
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => set2.has(item));
}

/**
 * Get difference between two arrays (items in first but not second)
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter(item => !set2.has(item));
}

/**
 * Sample random items from an array
 */
export function sample<T>(array: T[], count: number): T[] {
  if (count >= array.length) return [...array];

  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Deep clone an object/array using JSON methods
 * Note: This only works with JSON-serializable data
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Merge arrays and remove duplicates
 */
export function mergeUnique<T>(...arrays: T[][]): T[] {
  return unique(flatten(arrays));
}

/**
 * Partition an array into two arrays based on a predicate
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * Get the maximum value in an array using a selector function
 */
export function maxBy<T>(
  array: T[],
  selector: (item: T) => number
): T | undefined {
  if (array.length === 0) return undefined;

  return array.reduce((max, current) =>
    selector(current) > selector(max) ? current : max
  );
}

/**
 * Get the minimum value in an array using a selector function
 */
export function minBy<T>(
  array: T[],
  selector: (item: T) => number
): T | undefined {
  if (array.length === 0) return undefined;

  return array.reduce((min, current) =>
    selector(current) < selector(min) ? current : min
  );
}

/**
 * Sum values in an array using a selector function
 */
export function sumBy<T>(
  array: T[],
  selector: (item: T) => number
): number {
  return array.reduce((sum, item) => sum + selector(item), 0);
}

/**
 * Calculate average of values in an array using a selector function
 */
export function averageBy<T>(
  array: T[],
  selector: (item: T) => number
): number {
  if (array.length === 0) return 0;
  return sumBy(array, selector) / array.length;
}

/**
 * Safely access nested object properties
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T ?? defaultValue;
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  let lastCall = 0;
  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func(...args);
    }
    return undefined;
  }) as T;
}