import { vi } from "vitest"
import "@testing-library/jest-dom/vitest"

// Fix lru-cache ES module compatibility issue
let originalLruCache: any = null

try {
  originalLruCache = require('lru-cache')
} catch (error) {
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
  if (!originalLruCache.LRUCache && originalLruCache.default) {
    originalLruCache.LRUCache = originalLruCache.default
  }
  if (!originalLruCache.LRUCache) {
    originalLruCache.LRUCache = CompatibleLRUCache
  }
} else {
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

vi.mock('@asamuzakjp/dom-selector', () => ({
  DOMSelector: class MockDOMSelector {
    constructor() {}
    select() { return [] }
    selectOne() { return null }
  },
}))

vi.mock('cssstyle', () => ({
  parse: () => ({}),
  stringify: () => '',
}))

// Mock IntersectionObserver for tests
global.IntersectionObserver = class IntersectionObserver {
	root = null
	rootMargin = ""
	thresholds = []
	observe() {}
	disconnect() {}
	unobserve() {}
	takeRecords() {
		return []
	}
} as unknown as typeof IntersectionObserver

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

// Mock window.matchMedia for Mantine components
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
	value: {
		writeText: vi.fn().mockResolvedValue(undefined),
		readText: vi.fn().mockResolvedValue(""),
	},
})
