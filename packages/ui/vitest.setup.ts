import { vi } from "vitest"

// Fix lru-cache ES module compatibility issue
vi.mock('lru-cache', () => ({
  LRUCache: class CompatibleLRUCache {
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
  },
  default: class CompatibleLRUCache {
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
}))

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