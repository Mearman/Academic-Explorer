import { vi } from "vitest"

// Global Vitest setup for the Academic Explorer monorepo
// This handles common testing issues across all packages

// Fix lru-cache ES module compatibility issue system-wide
// Multiple packages in the dependency tree try to import LRUCache from lru-cache
// but face ES module compatibility issues in the Node.js test environment

// Store original module if it exists
let originalLruCache: any = null

try {
  // Try to require the original lru-cache module
  originalLruCache = require('lru-cache')
} catch (error) {
  // lru-cache might not be available or have issues
  console.warn('lru-cache module not available during setup:', error)
}

// Create a compatible LRUCache class that works in both CommonJS and ES module contexts
class CompatibleLRUCache {
  private cache = new Map()
  private maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get(key: any) {
    return this.cache.get(key)
  }

  set(key: any, value: any) {
    if (this.cache.size >= this.maxSize) {
      // Simple LRU eviction: delete the first item
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
    return this
  }

  has(key: any) {
    return this.cache.has(key)
  }

  delete(key: any) {
    return this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  get size() {
    return this.cache.size
  }
}

// Patch the lru-cache module globally before any tests run
if (originalLruCache) {
  // If LRUCache constructor is missing (ES module issue), patch it
  if (!originalLruCache.LRUCache && originalLruCache.default) {
    originalLruCache.LRUCache = originalLruCache.default
  }

  // If still no LRUCache, provide our compatible implementation
  if (!originalLruCache.LRUCache) {
    originalLruCache.LRUCache = CompatibleLRUCache
  }
} else {
  // If no original module, provide a complete mock
  vi.mock('lru-cache', () => ({
    LRUCache: CompatibleLRUCache,
    default: CompatibleLRUCache
  }))
}

// Mock problematic CSS-related packages that cause lru-cache issues
vi.mock('@asamuzakjp/css-color', () => ({
  Color: class MockColor {
    constructor(hex: string) {
      this.hex = hex || '#000000'
    }
    hex = '#000000'
    rgb() { return { r: 0, g: 0, b: 0 } }
    hsl() { return { h: 0, s: 0, l: 0 } }
    toString() { return this.hex }
  },
}))

// Mock DOM selector to prevent lru-cache issues
vi.mock('@asamuzakjp/dom-selector', () => ({
  DOMSelector: class MockDOMSelector {
    constructor() {}
    select() { return [] }
    selectOne() { return null }
  },
}))

// Mock cssstyle to prevent lru-cache issues
vi.mock('cssstyle', () => ({
  parse: () => ({}),
  stringify: () => '',
}))

console.log('✅ Vitest global setup completed - lru-cache compatibility patched')