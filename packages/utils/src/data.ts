/**
 * Generic data manipulation utilities
 * These utilities are domain-agnostic and can be used across packages
 */

// Native JavaScript implementations replacing lodash-es

/**
 * Debounce function calls
 */
function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number): (...args: T) => void {
	let timeout: NodeJS.Timeout | undefined
	return (...args: T) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), wait)
	}
}

/**
 * Remove duplicate items from an array by a specific key
 */
function uniqBy<T>(array: T[], key: keyof T | ((item: T) => unknown)): T[] {
	const seen = new Set()
	return array.filter(item => {
		const k = typeof key === 'function' ? key(item) : item[key]
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
}

/**
 * Sort items by a property
 */
function sortBy<T>(array: T[], key: keyof T | ((item: T) => unknown)): T[] {
	return [...array].sort((a, b) => {
		const aVal = typeof key === 'function' ? key(a) : a[key]
		const bVal = typeof key === 'function' ? key(b) : b[key]
		if (aVal < bVal) return -1
		if (aVal > bVal) return 1
		return 0
	})
}

/**
 * Group items by a property
 */
function groupBy<T>(array: T[], key: keyof T | ((item: T) => unknown)): Record<string, T[]> {
	return array.reduce((groups, item) => {
		const k = typeof key === 'function' ? key(item) : item[key]
		const groupKey = String(k)
		if (!groups[groupKey]) groups[groupKey] = []
		groups[groupKey].push(item)
		return groups
	}, {} as Record<string, T[]>)
}

/**
 * Create a new object without specified keys
 */
function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
	const result = { ...obj }
	keys.forEach(key => delete result[key])
	return result
}

/**
 * Create a new object with only specified keys
 */
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
	const result = {} as Pick<T, K>
	keys.forEach(key => {
		if (key in obj) result[key] = obj[key]
	})
	return result
}

/**
 * Check if value is empty
 */
function isEmpty(value: unknown): boolean {
	if (value == null) return true
	if (Array.isArray(value) || typeof value === 'string') return value.length === 0
	if (typeof value === 'object') return Object.keys(value).length === 0
	return false
}

/**
 * Check if value is an array
 */
function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value)
}

/**
 * Check if value is a string
 */
function isString(value: unknown): value is string {
	return typeof value === 'string'
}

/**
 * Debounced search function for user input
 */
export const debouncedSearch = debounce((searchFn: (query: string) => void, query: string) => {
	searchFn(query)
}, 300)

/**
 * Remove duplicate items from an array by a specific key
 */
export function removeDuplicatesBy<T>({ array, key }: { array: T[]; key: keyof T }): T[] {
	return uniqBy(array, key)
}

/**
 * Sort items by a numeric property (descending by default)
 */
export function sortByNumericProperty<T>({
	items,
	getProperty,
	ascending = false,
}: {
	items: T[]
	getProperty: (item: T) => number | null | undefined
	ascending?: boolean
}): T[] {
	const sorted = sortBy(items, (item) => getProperty(item) ?? 0)
	return ascending ? sorted : sorted.reverse()
}

/**
 * Sort items by a string property (ascending by default)
 */
export function sortByStringProperty<T>(
	items: T[],
	getProperty: (item: T) => string | null | undefined,
	ascending = true
): T[] {
	const sorted = sortBy(items, (item) => getProperty(item) ?? "")
	return ascending ? sorted : sorted.reverse()
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
		const key = getGroupKey(item)
		return key.toString()
	})
}

/**
 * Extract safe properties from an object, omitting undefined/null values
 */
export function extractSafeProperties<T extends Record<string, unknown>, K extends keyof T>({
	obj,
	keys,
}: {
	obj: T
	keys: K[]
}): Pick<T, K> {
	return pick(obj, keys)
}

/**
 * Remove sensitive or unnecessary properties from objects
 */
export function sanitizeObject<T extends Record<string, unknown>>({
	obj,
	keysToOmit,
}: {
	obj: T
	keysToOmit: (keyof T)[]
}): Omit<T, keyof T> {
	return omit(obj, keysToOmit)
}

/**
 * Check if a search query is valid (not empty, not just whitespace)
 */
export function isValidSearchQuery(query: unknown): query is string {
	return isString(query) && query.trim().length > 0
}

/**
 * Normalize search query (trim, lowercase)
 */
export function normalizeSearchQuery(query: string): string {
	return query.trim().toLowerCase()
}

/**
 * Check if an array contains valid data
 */
export function hasValidData<T>(data: unknown): data is T[] {
	return isArray(data) && !isEmpty(data)
}

/**
 * Get display name with fallback from multiple possible properties
 */
export function getDisplayName(
	item: {
		display_name?: string | null
		title?: string | null
		name?: string | null
	},
	fallback = "Untitled"
): string {
	return item.display_name ?? item.title ?? item.name ?? fallback
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatLargeNumber(num: number | null | undefined): string {
	if (!num || num === 0) return "0"

	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`
	}

	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`
	}

	return num.toString()
}

/**
 * Format percentage with specified decimal places
 */
export function formatPercentage(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`
}

/**
 * Clamp a number between min and max values
 */
export function clamp({ value, min, max }: { value: number; min: number; max: number }): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * Create a range of numbers from start to end
 */
export function range(start: number, end: number, step = 1): number[] {
	const result: number[] = []
	for (let i = start; i < end; i += step) {
		result.push(i)
	}
	return result
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function chunk<T>({ array, size }: { array: T[]; size: number }): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size))
	}
	return chunks
}

/**
 * Flatten a nested array by one level
 */
export function flatten<T>(arrays: T[][]): T[] {
	return arrays.reduce((acc, arr) => acc.concat(arr), [])
}

/**
 * Create a Map from an array using a key function
 */
export function arrayToMap<T, K>({
	array,
	getKey,
}: {
	array: T[]
	getKey: (item: T) => K
}): Map<K, T> {
	const map = new Map<K, T>()
	for (const item of array) {
		map.set(getKey(item), item)
	}
	return map
}

/**
 * Create a lookup object from an array using a key function
 */
export function arrayToLookup<T>({
	array,
	getKey,
}: {
	array: T[]
	getKey: (item: T) => string | number
}): Record<string, T> {
	const lookup: Record<string, T> = {}
	for (const item of array) {
		const key = getKey(item).toString()
		lookup[key] = item
	}
	return lookup
}

/**
 * Get unique values from an array
 */
export function unique<T>(array: T[]): T[] {
	return Array.from(new Set(array))
}

/**
 * Get intersection of two arrays
 */
export function intersection<T>({ array1, array2 }: { array1: T[]; array2: T[] }): T[] {
	const set2 = new Set(array2)
	return array1.filter((item) => set2.has(item))
}

/**
 * Get difference between two arrays (items in first but not second)
 */
export function difference<T>({ array1, array2 }: { array1: T[]; array2: T[] }): T[] {
	const set2 = new Set(array2)
	return array1.filter((item) => !set2.has(item))
}

/**
 * Sample random items from an array
 */
export function sample<T>({ array, count }: { array: T[]; count: number }): T[] {
	if (count >= array.length) return [...array]

	const shuffled = [...array].sort(() => Math.random() - 0.5)
	return shuffled.slice(0, count)
}

/**
 * Deep clone an object/array using JSON methods
 * Note: This only works with JSON-serializable data
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj)) as T
}

/**
 * Merge arrays and remove duplicates
 */
export function mergeUnique<T>(...arrays: T[][]): T[] {
	return unique(flatten(arrays))
}

/**
 * Partition an array into two arrays based on a predicate
 */
export function partition<T>({
	array,
	predicate,
}: {
	array: T[]
	predicate: (item: T) => boolean
}): [T[], T[]] {
	const truthy: T[] = []
	const falsy: T[] = []

	for (const item of array) {
		if (predicate(item)) {
			truthy.push(item)
		} else {
			falsy.push(item)
		}
	}

	return [truthy, falsy]
}

/**
 * Get the maximum value in an array using a selector function
 */
export function maxBy<T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): T | undefined {
	if (array.length === 0) return undefined

	return array.reduce((max, current) => (selector(current) > selector(max) ? current : max))
}

/**
 * Get the minimum value in an array using a selector function
 */
export function minBy<T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): T | undefined {
	if (array.length === 0) return undefined

	return array.reduce((min, current) => (selector(current) < selector(min) ? current : min))
}

/**
 * Sum values in an array using a selector function
 */
export function sumBy<T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): number {
	return array.reduce((sum, item) => sum + selector(item), 0)
}

/**
 * Calculate average of values in an array using a selector function
 */
export function averageBy<T>({
	array,
	selector,
}: {
	array: T[]
	selector: (item: T) => number
}): number {
	if (array.length === 0) return 0
	return sumBy({ array, selector }) / array.length
}

/**
 * Safely access nested object properties
 */
export function safeGet<T>({
	obj,
	path,
	defaultValue,
}: {
	obj: unknown
	path: string
	defaultValue?: T
}): T | undefined {
	const keys = path.split(".")
	let current = obj

	for (const key of keys) {
		if (current === null || current === undefined || typeof current !== "object") {
			return defaultValue
		}
		current = (current as Record<string, unknown>)[key]
	}

	return (current as T) ?? defaultValue
}

/**
 * Throttle function calls
 */
export function throttle<TArgs extends unknown[], TReturn>({
	func,
	delay,
}: {
	func: (...args: TArgs) => TReturn
	delay: number
}): (...args: TArgs) => TReturn | undefined {
	let lastCall = 0
	return (...args: TArgs): TReturn | undefined => {
		const now = Date.now()
		if (now - lastCall >= delay) {
			lastCall = now
			return func(...args)
		}
		return undefined
	}
}
