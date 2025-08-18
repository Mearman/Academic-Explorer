# Cache Warming Implementation

This document provides a comprehensive overview of the cache warming functionality implemented for the Academic Explorer application.

## Overview

The cache warming system provides intelligent prefetching and cache management for OpenAlex entities, enhancing user experience by reducing loading times and improving application responsiveness. The implementation follows TDD principles and provides comprehensive error handling, background processing, and predictive prefetching capabilities.

## Architecture

### Core Components

1. **CacheWarmingService** (`src/lib/openalex/cache-warming.ts`)
   - Main service class providing all cache warming functionality
   - Handles entity prefetching, batch warming, and related entity discovery
   - Manages background processing and configurable strategies

2. **React Hooks** (`src/hooks/`)
   - `usePrefetchEntity` - Component-level prefetching with queue management
   - `useWarmCache` - Batch cache warming with progress tracking
   - `useBackgroundWarming` - Background warming with idle detection
   - `usePredictiveWarming` - Navigation pattern learning and prediction

3. **Integration** (`src/lib/openalex/cached-client.ts`)
   - Extended cached client with cache warming exports
   - Seamless integration with existing caching infrastructure

## Features

### 1. Entity Prefetching

```typescript
import { prefetchEntity } from '@/lib/openalex';

// Prefetch a single entity
const workData = await prefetchEntity('W2741809807', EntityType.WORK, {
  priority: 'high',
  timeout: 5000
});
```

**Features:**
- Supports all OpenAlex entity types (Work, Author, Source, Institution, etc.)
- Configurable priority levels (low, normal, high)
- Timeout support with automatic cancellation
- Duplicate request deduplication
- Comprehensive error handling

### 2. Batch Cache Warming

```typescript
import { warmCache } from '@/lib/openalex';

// Warm cache for multiple entities
const result = await warmCache(['W2741809807', 'A5017898742'], {
  maxConcurrency: 5,
  batchSize: 10,
  onProgress: (progress) => {
    console.log(`${progress.completed}/${progress.total} completed`);
  }
});
```

**Features:**
- Concurrent processing with configurable limits
- Progress tracking with callbacks
- Batch processing for memory efficiency
- Error isolation (failed entities don't block others)
- Performance metrics and timing

### 3. Related Entity Warming

```typescript
import { warmRelatedEntities } from '@/lib/openalex';

// Warm cache for entity relationships
const result = await warmRelatedEntities('W2741809807', EntityType.WORK, 2);
```

**Features:**
- Automatic relationship discovery based on entity type
- Configurable depth for recursive warming
- Intelligent entity extraction from OpenAlex data structures
- Support for Work → Author → Institution chains
- Author → Institution → Associated Institution chains

### 4. React Hooks Integration

#### usePrefetchEntity Hook

```typescript
import { usePrefetchEntity } from '@/hooks/cache-warming';

function MyComponent() {
  const { prefetch, isPrefetching, prefetchQueue, prefetchedCount } = usePrefetchEntity({
    strategy: CacheWarmingStrategy.AGGRESSIVE,
    maxQueueSize: 20
  });

  const handlePrefetch = async () => {
    await prefetch('W2741809807', EntityType.WORK);
  };

  return (
    <div>
      <button onClick={handlePrefetch} disabled={isPrefetching}>
        Prefetch Work
      </button>
      <p>Queue: {prefetchQueue.length}, Completed: {prefetchedCount}</p>
    </div>
  );
}
```

#### useWarmCache Hook

```typescript
import { useWarmCache } from '@/hooks/cache-warming';

function BatchWarmingComponent() {
  const { warmCache, isWarming, progress, retryFailed } = useWarmCache({
    strategy: CacheWarmingStrategy.CONSERVATIVE,
    retryFailedEntities: true
  });

  const handleBatchWarm = async () => {
    const entityIds = ['W2741809807', 'A5017898742', 'S123456789'];
    await warmCache(entityIds);
  };

  return (
    <div>
      <button onClick={handleBatchWarm} disabled={isWarming}>
        Warm Cache
      </button>
      {progress && (
        <p>{progress.completed}/{progress.total} completed</p>
      )}
      {progress?.errors.length > 0 && (
        <button onClick={retryFailed}>Retry Failed</button>
      )}
    </div>
  );
}
```

#### useBackgroundWarming Hook

```typescript
import { useBackgroundWarming } from '@/hooks/cache-warming';

function BackgroundWarmingProvider() {
  const { scheduleWarming, isBackgroundWarming, backgroundQueue } = useBackgroundWarming({
    enabled: true,
    maxConcurrency: 2,
    idleThreshold: 2000
  });

  // Schedule entities for background warming
  const scheduleEntityWarming = (entityIds: string[]) => {
    scheduleWarming(entityIds, 'low');
  };

  return (
    <div>
      <p>Background queue: {backgroundQueue}</p>
      <p>Status: {isBackgroundWarming ? 'Active' : 'Idle'}</p>
    </div>
  );
}
```

#### usePredictiveWarming Hook

```typescript
import { usePredictiveWarming } from '@/hooks/cache-warming';

function NavigationTracker() {
  const { recordNavigation, getPredictions } = usePredictiveWarming({
    enabled: true,
    confidence: 0.6,
    maxPredictions: 5
  });

  // Record user navigation
  const handleNavigation = (fromId: string, toId: string, entityType: EntityType) => {
    recordNavigation(fromId, toId, entityType);
  };

  // Get predictions for current entity
  const predictions = getPredictions('W2741809807');

  return (
    <div>
      <p>Predicted entities: {predictions.length}</p>
    </div>
  );
}
```

### 5. Configuration and Strategies

#### Cache Warming Strategies

```typescript
enum CacheWarmingStrategy {
  OFF = 'off',           // Disable cache warming
  CONSERVATIVE = 'conservative',  // Limited warming, focus on reliability
  AGGRESSIVE = 'aggressive',      // Extensive warming, maximum performance
  CUSTOM = 'custom'              // User-defined configuration
}
```

#### Configuration Options

```typescript
interface CacheWarmingConfig {
  strategy: CacheWarmingStrategy;
  maxConcurrentRequests: number;    // Default: 5
  relationshipDepth: number;        // Default: 1
  enablePredictive: boolean;        // Default: true
  ttl?: number;                     // Cache TTL override
  backgroundWarming: boolean;       // Default: true
}
```

### 6. Background Processing

The system includes intelligent background processing that:

- **Idle Detection**: Waits for user inactivity before starting background work
- **Priority Queuing**: Processes high-priority items first
- **Resource Management**: Limits concurrent background requests
- **Automatic Retry**: Exponential backoff for failed requests
- **Memory Efficiency**: Clears completed items from queues

### 7. Error Handling

Comprehensive error handling includes:

- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Respect API rate limits with proper delays
- **Timeout Handling**: Configurable timeouts with graceful cancellation
- **Validation Errors**: Proper entity ID validation and normalization
- **Memory Management**: Prevention of memory leaks in background processes

## Integration with Existing Systems

### Cache Infrastructure

The cache warming system integrates seamlessly with the existing caching infrastructure:

- **CacheInterceptor**: Leverages existing cache strategies and TTL management
- **Multi-layer Storage**: Works with memory, localStorage, and IndexedDB caches
- **Cache Statistics**: Provides detailed metrics and performance monitoring
- **Cache Invalidation**: Respects existing cache invalidation patterns

### Entity Detection System

Builds upon the robust entity detection system:

- **Automatic Type Detection**: Determines entity type from ID format
- **ID Normalization**: Handles various ID formats (URLs, bare IDs, etc.)
- **Validation**: Comprehensive ID validation with helpful error messages
- **External IDs**: Support for DOI, ORCID, ROR, and other external identifiers

### React Integration

Designed for seamless React integration:

- **Hook Patterns**: Follows React hooks best practices
- **Component Lifecycle**: Proper cleanup and memory management
- **State Management**: Optimized re-renders and state updates
- **Concurrent Mode**: Compatible with React's Concurrent Mode

## Performance Considerations

### Memory Management

- **Queue Size Limits**: Configurable limits prevent memory exhaustion
- **Background Processing**: Non-blocking background warming
- **Resource Cleanup**: Automatic cleanup of completed requests
- **Memory Monitoring**: Built-in memory usage tracking

### Network Optimization

- **Request Deduplication**: Prevents duplicate concurrent requests
- **Batch Processing**: Efficient batch processing with concurrency limits
- **Intelligent Caching**: Respects existing cache policies and TTLs
- **Rate Limiting**: Built-in rate limiting and backoff strategies

### User Experience

- **Non-blocking**: Cache warming never blocks user interactions
- **Progressive Enhancement**: Application works without cache warming
- **Feedback**: Clear loading states and progress indicators
- **Error Recovery**: Graceful degradation when warming fails

## Testing

The implementation includes comprehensive testing:

### Integration Tests

- **End-to-end Workflows**: Complete cache warming scenarios
- **Hook Integration**: React hook behaviour in realistic contexts
- **Error Scenarios**: Network failures, timeouts, and edge cases
- **Performance Testing**: Large batch operations and memory usage

### Test Coverage

- **Service Layer**: Core cache warming service functionality
- **Hook Layer**: React hook behaviour and state management
- **Integration Layer**: Integration with existing cache infrastructure
- **Error Handling**: Comprehensive error scenario coverage

## Usage Examples

### Basic Prefetching

```typescript
// Simple entity prefetching
import { usePrefetchEntity } from '@/hooks/cache-warming';

function WorkComponent({ workId }: { workId: string }) {
  const { prefetch } = usePrefetchEntity();

  useEffect(() => {
    // Prefetch when component mounts
    prefetch(workId, EntityType.WORK);
  }, [workId, prefetch]);

  return <div>Work component content</div>;
}
```

### Navigation-based Warming

```typescript
// Warm cache based on user navigation
import { useRelatedPrefetch } from '@/hooks/cache-warming';

function EntityPage({ entityId, entityType }: EntityPageProps) {
  const { prefetchRelated } = useRelatedPrefetch({
    enabled: true,
    depth: 2,
    delayMs: 500
  });

  useEffect(() => {
    // Warm related entities after a short delay
    prefetchRelated(entityId, entityType);
  }, [entityId, entityType, prefetchRelated]);

  return <div>Entity page content</div>;
}
```

### Search Result Prefetching

```typescript
// Prefetch search results on hover
import { usePrefetchEntity } from '@/hooks/cache-warming';

function SearchResultItem({ result }: { result: SearchResult }) {
  const { prefetch } = usePrefetchEntity({
    strategy: CacheWarmingStrategy.CONSERVATIVE
  });

  const handleMouseEnter = () => {
    prefetch(result.id, result.type, { priority: 'low' });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <h3>{result.display_name}</h3>
    </div>
  );
}
```

## Configuration Guide

### Service Configuration

```typescript
import { setCacheWarmingConfig } from '@/lib/openalex';

// Configure global cache warming settings
setCacheWarmingConfig({
  strategy: CacheWarmingStrategy.AGGRESSIVE,
  maxConcurrentRequests: 10,
  relationshipDepth: 2,
  enablePredictive: true,
  backgroundWarming: true
});
```

### Strategy Recommendations

- **CONSERVATIVE**: For mobile devices or limited bandwidth
- **AGGRESSIVE**: For desktop applications with good connectivity
- **OFF**: For debugging or when cache warming is not desired
- **CUSTOM**: For fine-tuned control over warming behaviour

## Monitoring and Debugging

### Cache Statistics

```typescript
import { getCacheWarmingStats } from '@/lib/openalex';

const stats = getCacheWarmingStats();
console.log({
  cacheHits: stats.cacheHits,
  cacheMisses: stats.cacheMisses,
  prefetchQueue: stats.prefetchQueue,
  backgroundQueue: stats.backgroundQueue,
  totalWarmed: stats.totalWarmed,
  totalErrors: stats.totalErrors
});
```

### Debug Logging

The system provides comprehensive debug logging:

- **Service Operations**: Entity prefetching and batch warming
- **Hook State Changes**: React hook state transitions
- **Background Processing**: Queue management and processing
- **Error Details**: Detailed error information with context

## Best Practices

### 1. Strategic Implementation

- Start with CONSERVATIVE strategy and adjust based on usage patterns
- Monitor cache hit rates and adjust warming based on actual user behaviour
- Use background warming for predictive scenarios, immediate warming for user-triggered actions

### 2. Memory Management

- Set appropriate queue size limits based on device capabilities
- Clear unused hooks and services when components unmount
- Monitor memory usage in development and adjust configurations

### 3. Error Handling

- Always handle prefetch errors gracefully
- Provide user feedback for failed warming operations
- Implement retry logic for transient failures

### 4. Performance Optimization

- Use appropriate priority levels for different warming scenarios
- Batch related warming operations when possible
- Monitor network usage and adjust concurrency based on connection quality

## Conclusion

The cache warming implementation provides a comprehensive, performant, and user-friendly solution for prefetching OpenAlex entities. It integrates seamlessly with the existing application architecture while providing extensive configuration options and monitoring capabilities.

The system is designed to enhance user experience without compromising application stability or performance, making it suitable for production use in research and academic applications.