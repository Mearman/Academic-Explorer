# Static Data Caching System

The Academic Explorer implements a sophisticated multi-tier caching system designed to optimize OpenAlex API usage while providing fast, reliable access to academic data. This document covers the complete caching architecture, deployment strategies, and troubleshooting guidance.

## Table of Contents

- [Architecture Overview](#architecture-overview)
  - [Multi-Tier Cache System](#multi-tier-cache-system)
  - [URL Collision Handling](#url-collision-handling)
- [Development vs Production Behavior](#development-vs-production-behavior)
- [Setup and Deployment](#setup-and-deployment)
- [Configuration Options](#configuration-options)
- [Performance Characteristics](#performance-characteristics)
- [CLI Management Tools](#cli-management-tools)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Advanced Usage](#advanced-usage)

## Architecture Overview

### Multi-Tier Cache System

The caching system implements a **Synthetic Response Cache** with five distinct tiers, each serving specific performance and reliability goals:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Request  │───▶│  Request Layer  │───▶│  Cache Manager  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CACHE TIER HIERARCHY                           │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Memory Cache     │ Fastest • Limited Size • Session Only        │
│ 2. localStorage     │ Fast • 5-10MB Limit • Persistent             │
│ 3. IndexedDB        │ Medium • Large Storage • Persistent          │
│ 4. Static Data      │ Bundled • Pre-generated • Always Available   │
│ 5. OpenAlex API     │ Slowest • Authoritative • Rate Limited       │
└─────────────────────────────────────────────────────────────────────┘
```

### Cache Tier Details

#### 1. Memory Cache (In-Memory)
- **Purpose**: Ultra-fast access for frequently used entities
- **Scope**: Current browser session only
- **Size**: Configurable, typically 50-100 entities
- **Use Case**: Active graph nodes, recently viewed entities

#### 2. Local Storage (Browser)
- **Purpose**: Cross-session persistence for popular entities
- **Scope**: Domain-specific, survives browser restarts
- **Size**: 5-10MB browser limit
- **Use Case**: User's recently accessed entities, preferences

#### 3. IndexedDB (Browser Database)
- **Purpose**: Large-scale local entity storage
- **Scope**: Domain-specific, survives browser restarts
- **Size**: Hundreds of MB to GB (browser dependent)
- **Use Case**: Extended entity collections, search results

#### 4. Static Data Cache (Bundled)
- **Purpose**: Pre-generated popular entities included in build
- **Scope**: Application-wide, always available
- **Size**: Controlled by build process
- **Use Case**: Popular authors, high-cited works, major institutions

#### 5. OpenAlex API (Network)
- **Purpose**: Authoritative source for all academic data
- **Scope**: Global, real-time data
- **Limitations**: Rate limiting, network dependency
- **Use Case**: Fallback for uncached entities, real-time updates

### URL Collision Handling

The static data cache now supports multi-URL collision handling to optimize storage and improve debugging. Multiple equivalent URLs (differing only in sensitive or normalized parameters) map to the same cache file, preventing data duplication while preserving request history.

#### Multi-URL Support
- **FileEntry Structure**: Enhanced with `equivalentUrls` (array of colliding URLs, primary first), `urlTimestamps` (when each URL was associated), and `collisionInfo` (merge statistics: `mergedCount`, `firstCollision`, `lastMerge`, `totalUrls`).
- **Backward Compatibility**: Legacy single-URL entries are automatically migrated to multi-URL format during access, initializing fields with the original URL. No data loss occurs.
- **Index Structure Updates**: Directory indexes now include `aggregatedCollisions` (directory-level stats: total merges, files with collisions, latest collision timestamp) for hierarchical insights.

#### Collision Detection and Merging
Collisions are detected when URLs normalize to the same filename (via `getCacheFilePath`). Common scenarios:
- **Sensitive Parameters**: `?api_key=secret1` and `?api_key=secret2` both strip to `?` (base collection).
- **Email Parameters**: `?mailto=user1@example.com` and `?mailto=user2@example.com` normalize identically.
- **Pagination Normalization**: All `cursor=ABC123` values become `cursor=*`.

**Example**: Two requests to works with different API keys:
```
Request 1: https://api.openalex.org/works?filter=doi:10.1234/abc&api_key=secret1
Request 2: https://api.openalex.org/works?filter=doi:10.1234/abc&api_key=secret2
```
Both normalize to `public/data/openalex/works/queries/filter=doi_10.1234_abc.json`. The second request merges via `mergeCollision`, adding to `equivalentUrls` and updating `collisionInfo.mergedCount`.

#### Migration Strategy
- **Automatic Migration**: Use `migrateToMultiUrl` on legacy entries (those without `equivalentUrls` field) during index rebuilds (e.g., via Vite plugin or CLI).
- **Detection**: Legacy entries are identified by the absence of the `equivalentUrls` field, triggering inline migration to the multi-URL format.
- **Dry-Run Testing**: Enable `dryRun: true` in the OpenAlex cache plugin to preview migrations without writing files. Logs show reconstructed URLs and merged entries.
- **Validation**: `validateFileEntry` ensures consistency post-migration (e.g., all URLs map to same path, timestamps complete).

#### Impact on Invalidation and Debugging
- **Invalidation**: Invalidate by primary URL or pattern matching `equivalentUrls`. Use `cache-invalidator.ts` for entity-specific purges.
- **Debugging**: Query `equivalentUrls` via cache browser tools or CLI (`pnpm cli cache:inspect works/queries/filter=doi_10.1234_abc.json`). `collisionInfo` reveals merge history.
- **Performance**: Minimal overhead—collision data stored only in indexes (not data files). Merges happen O(1) via hash checks.

#### Usage Notes
- **Plugin Option**: `dryRun` for safe testing: `{ dryRun: true }` in Vite config.
- **Testing**: Run collision tests with `pnpm vitest --project=unit` (focus on `cache-utilities.test.ts`) or integration tests simulating multi-key requests.
- **Querying Equivalents**: For debugging, use `reconstructPossibleCollisions` to generate variations from filenames.

### Cache Flow Diagram

```mermaid
graph TD
    A[Entity Request] --> B{Memory Cache?}
    B -->|Hit| Z[Return Entity]
    B -->|Miss| C{localStorage?}
    C -->|Hit| D[Update Memory] --> Z
    C -->|Miss| E{IndexedDB?}
    E -->|Hit| F[Update localStorage] --> D
    E -->|Miss| G{Static Data?}
    G -->|Hit| H[Update IndexedDB] --> F
    G -->|Miss| I[OpenAlex API]
    I --> J[Update All Tiers<br/>(Handle Collisions)] --> Z

    style A fill:#e1f5fe
    style Z fill:#c8e6c9
    style I fill:#ffecb3
```

## Development vs Production Behavior

### Development Mode (`pnpm dev`)

**Characteristics:**
- Hot Module Replacement (HMR) enabled
- Debug logging active
- Cache validation more aggressive
- Live API requests for testing
- Source maps available for debugging

**Cache Behavior:**
```typescript
// Development cache configuration
const devCacheConfig = {
  memory: {
    maxEntities: 50,
    ttl: 1000 * 60 * 5, // 5 minutes
  },
  localStorage: {
    enabled: true,
    prefix: 'ae_dev_',
  },
  indexedDB: {
    enabled: true,
    version: 1,
  },
  staticData: {
    enabled: false, // Uses API for fresh data
  },
  api: {
    rateLimit: false, // Disabled for development
    timeout: 30000,
  }
}
```

**Environment Variables:**
```bash
NODE_ENV=development
VITE_API_ENDPOINT=https://api.openalex.org
VITE_CACHE_DEBUG=true
VITE_ENABLE_STATIC_CACHE=false
```

### Production Mode (`pnpm build`)

**Characteristics:**
- Optimized bundle with code splitting
- Static data cache pre-generated
- Aggressive browser caching headers
- Error tracking enabled
- Performance monitoring active

**Cache Behavior:**
```typescript
// Production cache configuration
const prodCacheConfig = {
  memory: {
    maxEntities: 100,
    ttl: 1000 * 60 * 30, // 30 minutes
  },
  localStorage: {
    enabled: true,
    prefix: 'ae_prod_',
  },
  indexedDB: {
    enabled: true,
    version: 1,
  },
  staticData: {
    enabled: true, // Pre-bundled popular entities
    entities: ['authors', 'works', 'institutions'],
  },
  api: {
    rateLimit: true,
    timeout: 10000,
  }
}
```

**Build-time Static Generation:**
```bash
# Generate static cache during build
pnpm cli static:analyze
pnpm cli static:generate --entity-type authors
pnpm cli static:generate --entity-type works
```

## Setup and Deployment

### Local Development Setup

1. **Initial Setup:**
```bash
cd "Academic Explorer"
pnpm install
```

2. **Development Server:**
```bash
pnpm dev  # Starts on http://localhost:5173
```

3. **Cache Management:**
```bash
# View cache statistics
pnpm cli cache:stats

# Clear development cache
pnpm cli cache:clear --confirm
```

### GitHub Pages Deployment

The application is configured for deployment to GitHub Pages using hash-based routing for compatibility with static hosting.

#### Deployment Configuration

**Vite Configuration for GitHub Pages:**
```typescript
// apps/web/vite.config.ts
export default defineConfig({
  base: './', // Relative paths for GitHub Pages
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mantine': ['@mantine/core', '@mantine/hooks'],
          // ... additional chunks
        }
      }
    }
  }
})
```

**Router Configuration:**
```typescript
// Hash-based routing for GitHub Pages compatibility
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/authors/:id', element: <AuthorPage /> },
      { path: '/works/:id', element: <WorkPage /> },
      // ... additional routes
    ]
  }
])
```

#### Deployment Steps

1. **Build Production Bundle:**
```bash
pnpm build
```

2. **Generate Static Cache:**
```bash
pnpm cli static:analyze
pnpm cli static:generate
```

3. **Deploy to GitHub Pages:**
```bash
# Manual deployment
cp -r apps/web/dist/* docs/

# Automated via GitHub Actions
git push origin main
```

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate static cache
        run: |
          pnpm cli static:analyze
          pnpm cli static:generate

      - name: Build application
        run: pnpm build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./apps/web/dist
```

### Custom Domain Setup

For custom domains, update the `base` configuration:

```typescript
// For custom domain deployment
export default defineConfig({
  base: '/', // Root path for custom domains
  // ... rest of configuration
})
```

## Configuration Options

### Environment Variables

#### Development Environment
```bash
# API Configuration
VITE_OPENALEX_EMAIL=your.email@domain.com
VITE_API_BASE_URL=https://api.openalex.org
VITE_API_TIMEOUT=30000

# Cache Configuration
VITE_CACHE_DEBUG=true
VITE_MEMORY_CACHE_SIZE=50
VITE_ENABLE_STATIC_CACHE=false

# Performance
VITE_BUNDLE_ANALYZER=false
VITE_HMR_OVERLAY=false
```

#### Production Environment
```bash
# API Configuration
VITE_OPENALEX_EMAIL=your.email@domain.com
VITE_API_BASE_URL=https://api.openalex.org
VITE_API_TIMEOUT=10000

# Cache Configuration
VITE_CACHE_DEBUG=false
VITE_MEMORY_CACHE_SIZE=100
VITE_ENABLE_STATIC_CACHE=true

# Performance
VITE_BUNDLE_ANALYZER=false
VITE_ERROR_TRACKING=true
```

### Cache Time Configuration

Entity-specific cache durations are defined in `packages/utils/src/cache/index.ts`:

```typescript
export const ENTITY_CACHE_TIMES = {
  works: {
    stale: 1000 * 60 * 60 * 24,       // 1 day
    gc: 1000 * 60 * 60 * 24 * 7,      // 7 days
  },
  authors: {
    stale: 1000 * 60 * 60 * 12,       // 12 hours
    gc: 1000 * 60 * 60 * 24 * 3,      // 3 days
  },
  sources: {
    stale: 1000 * 60 * 60 * 24 * 7,   // 7 days
    gc: 1000 * 60 * 60 * 24 * 30,     // 30 days
  },
  institutions: {
    stale: 1000 * 60 * 60 * 24 * 30,  // 30 days
    gc: 1000 * 60 * 60 * 24 * 90,     // 90 days
  },
  // ... additional entity types
} as const;
```

### Memory Configuration

For large datasets, adjust Node.js memory settings:

```bash
# Package.json scripts
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=8192' vite build",
    "test": "NODE_OPTIONS='--max-old-space-size=8192' vitest",
    "cli": "NODE_OPTIONS='--max-old-space-size=4096' tsx apps/cli/src/openalex-cli.ts"
  }
}
```

## Performance Characteristics

### Response Time Targets

| Cache Tier | Target Response Time | Typical Size | Use Case |
|------------|---------------------|--------------|----------|
| Memory | < 1ms | 50-100 entities | Active graph nodes |
| localStorage | < 5ms | 5-10MB | Recent entities |
| IndexedDB | < 50ms | 100MB+ | Historical data |
| Static Data | < 100ms | Build-time | Popular entities |
| OpenAlex API | 200-2000ms | Unlimited | Fresh data |

### System Limitations

#### Browser Storage Limits
- **localStorage**: ~5-10MB per domain
- **IndexedDB**: ~50% of available disk space (varies by browser)
- **Memory Cache**: Limited by available RAM
- **Static Data**: Limited by bundle size constraints

#### Performance Considerations
```typescript
// Serial test execution required to prevent OOM
// vitest.config.ts
export default defineConfig({
  test: {
    maxConcurrency: 1, // Critical for memory management
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
```

#### Rate Limiting
- OpenAlex API: 10 requests per second per email
- Cached responses bypass rate limits
- Static data provides offline capability

### Memory Management

#### Force Simulation Performance
```typescript
// Deterministic force layouts with memory optimization
const seededRandom = d3.randomUniform.source(d3.randomLcg(0x12345678));
simulation.randomSource(seededRandom);

// Performance targets
// < 5 seconds for < 1000 nodes
// Progress logging enabled
// Cancellation support for large datasets
```

#### Cache Eviction Strategy
```typescript
// LRU eviction for memory cache
// Time-based eviction for persistent storage
// Size-based limits for IndexedDB
// User-triggered clearing available via CLI
```

## CLI Management Tools

The Academic Explorer provides a comprehensive CLI for cache management and static data generation.

### Installation and Basic Usage

```bash
# Access CLI from project root
cd "Academic Explorer"
pnpm cli --help
```

### Entity Operations

#### Retrieving Entities
```bash
# Auto-detect entity type from ID
pnpm cli get A5017898742  # Author
pnpm cli get W2241997964  # Work

# Explicit entity type
pnpm cli get-typed authors A5017898742

# Search entities
pnpm cli search authors "machine learning"
pnpm cli search works "natural language processing"

# List all cached entities
pnpm cli list authors
pnpm cli list works --count
```

#### Cache Control Options
```bash
# Skip cache, fetch directly from API
pnpm cli get A5017898742 --no-cache

# Don't save results to cache
pnpm cli get A5017898742 --no-save

# Only use cache, don't fetch if missing
pnpm cli get A5017898742 --cache-only

# Pretty print JSON output
pnpm cli get A5017898742 --format json --pretty
```

### Cache Statistics and Analysis

#### Viewing Cache Status
```bash
# Overall cache statistics
pnpm cli cache:stats

# Field coverage for specific entity
pnpm cli cache:field-coverage authors A5017898742

# Popular entities with extensive field coverage
pnpm cli cache:popular-entities authors --limit 20

# Popular cached collections
pnpm cli cache:popular-collections --limit 10
```

#### Sample Output
```bash
$ pnpm cli cache:stats

Synthetic Cache Statistics:
==================================================
Performance Metrics:
  Total Requests: 1,247
  Cache Hit Rate: 87.3%
  Surgical Requests: 203
  Bandwidth Saved: 2.1 MB

Memory Storage:
  Entities: 89
  Fields: 1,205
  Collections: 15
  Size: 458.2 KB
```

### Static Data Management

#### Analyzing Usage Patterns
```bash
# Analyze current static data effectiveness
pnpm cli static:analyze

# Example output format
pnpm cli static:analyze --format json
```

#### Generating Static Cache
```bash
# Generate static cache for all entity types
pnpm cli static:generate

# Generate for specific entity type
pnpm cli static:generate --entity-type authors

# Dry run to preview changes
pnpm cli static:generate --dry-run

# Force regeneration
pnpm cli static:generate --force
```

#### Advanced Query Operations
```bash
# Complex API queries with cache control
pnpm cli fetch authors \
  --filter "works_count:>100" \
  --select "id,display_name,works_count" \
  --sort "works_count:desc" \
  --per-page 50 \
  --no-cache

# Save results to cache for future use
pnpm cli fetch works \
  --filter "publication_year:2023" \
  --select "id,title,authors,publication_year"
```

### Cache Maintenance

#### Clearing Cache Data
```bash
# Clear all synthetic cache (requires confirmation)
pnpm cli cache:clear --confirm

# View what would be cleared
pnpm cli cache:clear
```

#### Statistics and Monitoring
```bash
# Application-wide statistics
pnpm cli stats

# Entity type distribution
pnpm cli stats --format json | jq '.authors.count'
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Memory Errors During Testing
**Symptoms:**
- "Maximum call stack size exceeded"
- "Out of memory" errors during test execution
- Tests hanging or failing randomly

**Solution:**
```bash
# Increase Node.js memory allocation
NODE_OPTIONS='--max-old-space-size=8192' pnpm test

# Ensure serial test execution
# Verify vitest.config.ts has maxConcurrency: 1
```

**Root Cause:** Parallel test execution with large datasets exceeds memory limits.

#### Issue: Cache Hit Rate Too Low
**Symptoms:**
- Slow application performance
- High API request volume
- Rate limiting errors

**Diagnosis:**
```bash
# Check cache statistics
pnpm cli cache:stats

# Analyze field coverage
pnpm cli cache:field-coverage authors A5017898742
```

**Solutions:**
```bash
# Generate static cache for popular entities
pnpm cli static:analyze
pnpm cli static:generate --entity-type authors

# Clear corrupted cache
pnpm cli cache:clear --confirm

# Increase memory cache size (development)
export VITE_MEMORY_CACHE_SIZE=200
```

#### Issue: GitHub Pages Deployment Fails
**Symptoms:**
- 404 errors on deployed site
- Routes not working
- Assets not loading

**Diagnosis:**
- Check base URL configuration in `vite.config.ts`
- Verify hash routing is enabled
- Check GitHub Pages settings

**Solutions:**
```typescript
// Ensure correct base configuration
export default defineConfig({
  base: './', // For GitHub Pages subdirectory
  // OR
  base: '/', // For custom domain
})
```

```bash
# Regenerate routes with hash router
# Verify TanStack Router configuration
# Check 404.html fallback exists
```

#### Issue: IndexedDB Quota Exceeded
**Symptoms:**
- "QuotaExceededError" in browser console
- Cache operations failing silently
- Performance degradation over time

**Solutions:**
```bash
# Clear IndexedDB storage
# Browser Developer Tools > Application > Storage > Clear Storage

# Or via CLI
pnpm cli cache:clear --confirm

# Reduce cache retention times
# Modify ENTITY_CACHE_TIMES in packages/utils/src/cache/index.ts
```

#### Issue: API Rate Limiting
**Symptoms:**
- 429 "Too Many Requests" errors
- Slow or failed API responses
- Inconsistent data loading

**Solutions:**
```bash
# Configure email for higher rate limits
export VITE_OPENALEX_EMAIL=your.email@domain.com

# Use cache-only mode for development
pnpm cli get A5017898742 --cache-only

# Generate static cache to reduce API dependency
pnpm cli static:generate
```

#### Issue: Build Size Too Large
**Symptoms:**
- Bundle size warnings during build
- Slow initial page load
- Memory issues in browsers

**Diagnosis:**
```bash
# Analyze bundle size
pnpm build
# Check chunk sizes in output

# Use bundle analyzer
VITE_BUNDLE_ANALYZER=true pnpm build
```

**Solutions:**
```typescript
// Optimize chunk splitting in vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-heavy': ['large-library'],
          // Split by feature/route
        }
      }
    },
    chunkSizeWarningLimit: 800 // Adjust threshold
  }
})
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Development debug mode
export VITE_CACHE_DEBUG=true
pnpm dev

# CLI debug output
pnpm cli cache:stats --format json | jq '.'
```

### Performance Profiling

#### Browser Performance
1. Open Chrome DevTools
2. Navigate to Performance tab
3. Record while navigating the application
4. Look for:
   - Long tasks (>50ms)
   - Cache miss patterns
   - Memory leaks

#### Memory Usage Analysis
```bash
# Monitor memory during testing
NODE_OPTIONS='--expose-gc --inspect' pnpm test

# CLI memory profiling
NODE_OPTIONS='--inspect' pnpm cli cache:stats
```

### Recovery Procedures

#### Complete Cache Reset
```bash
# 1. Clear all cache layers
pnpm cli cache:clear --confirm

# 2. Clear browser storage manually
# Chrome: DevTools > Application > Storage > Clear Storage

# 3. Regenerate static cache
pnpm cli static:generate --force

# 4. Restart development server
pnpm dev
```

#### Build Issues Recovery
```bash
# 1. Clean all build artifacts
pnpm clean

# 2. Clear node_modules cache
rm -rf node_modules/.cache

# 3. Reinstall dependencies
pnpm install

# 4. Rebuild with memory allocation
NODE_OPTIONS='--max-old-space-size=8192' pnpm build
```

## Advanced Usage

### Custom Cache Strategies

#### Implementing Custom Cache Tiers
```typescript
// packages/utils/src/cache/custom-tier.ts
export class CustomCacheTier implements CacheTier {
  async get(key: string): Promise<Entity | null> {
    // Custom cache logic
  }

  async set(key: string, value: Entity): Promise<void> {
    // Custom storage logic
  }

  async invalidate(pattern: string): Promise<void> {
    // Custom invalidation logic
  }
}
```

#### Field-Level Caching
```typescript
// Selective field caching for bandwidth optimization
const authorFields = ['id', 'display_name', 'works_count'];
const workFields = ['id', 'title', 'publication_year', 'cited_by_count'];

// CLI usage
pnpm cli fetch authors --select "id,display_name,works_count"
```

### Monitoring and Analytics

#### Performance Metrics Collection
```typescript
// Real-time cache performance monitoring
const metrics = {
  cacheHitRate: 0.87,
  avgResponseTime: 125,
  bandwidthSaved: 2048576,
  totalRequests: 1247
};
```

#### Usage Pattern Analysis
```bash
# Analyze entity access patterns
pnpm cli static:analyze --format json > cache-analysis.json

# Generate optimization recommendations
jq '.recommendedForGeneration[]' cache-analysis.json
```

### Integration with External Systems

#### Webhook-Based Cache Invalidation
```typescript
// Integration point for real-time cache updates
export function setupCacheInvalidation(webhookUrl: string) {
  // Listen for OpenAlex data updates
  // Invalidate affected cache entries
}
```

#### Export/Import Cache Data
```bash
# Export cache for backup or sharing
pnpm cli cache:export --output cache-backup.json

# Import cache data
pnpm cli cache:import --input cache-backup.json
```

---

## Summary

The Academic Explorer's static data caching system provides a robust, multi-tier approach to academic data management. By understanding the architecture, configuration options, and troubleshooting procedures outlined in this guide, developers can effectively optimize performance, manage deployments, and maintain reliable access to OpenAlex data.

Key takeaways:
- **Use the CLI tools** for cache management and monitoring
- **Configure cache times** based on data update patterns
- **Monitor performance** with built-in analytics
- **Follow serial execution** for memory-intensive operations
- **Generate static cache** for production deployments

For additional support, refer to the [project CLAUDE.md files](./CLAUDE.md) and the [CLI tool documentation](../apps/cli/README.md).