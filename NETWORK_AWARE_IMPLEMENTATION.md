# Network-Aware Retry Strategies Implementation

This document describes the implementation of network-aware retry strategies for Academic Explorer, providing robust offline-first functionality that adapts to varying network conditions.

## Overview

The network-aware retry system automatically adjusts retry strategies, timeouts, and caching behavior based on the user's current network conditions. It provides seamless offline support with background synchronization when connectivity is restored.

## Core Components

### 1. Network Status Monitoring (`useNetworkStatus`)

**Location**: `src/hooks/use-network-status.ts`

Monitors real-time network status using browser APIs:

- **Online/Offline Detection**: Uses `navigator.onLine` and window events
- **Connection Quality Assessment**: Leverages Network Information API
- **RTT and Bandwidth Tracking**: Measures round-trip time and downlink speed
- **Data Saver Mode Detection**: Respects user's data conservation preferences

**Connection Quality Categories**:
- `fast`: 4G with high bandwidth (>5Mbps, <150ms RTT)
- `moderate`: 4G/3G with medium bandwidth (2-5Mbps, 150-300ms RTT)
- `slow`: 3G with low bandwidth (<2Mbps, 300-500ms RTT)
- `very-slow`: 2G or severely constrained connections (>500ms RTT)
- `unknown`: Unable to determine connection quality

### 2. Adaptive Retry Logic (`useAdaptiveRetry`)

**Location**: `src/hooks/use-adaptive-retry.ts`

Implements intelligent retry strategies that adapt to network conditions:

**Retry Strategies**:
- `exponential`: Exponential backoff (default for stable connections)
- `linear`: Linear increase in delays (for predictable networks)
- `adaptive`: Switches strategy based on connection quality
- `immediate`: No delay between retries (testing/development)
- `none`: No retries (offline mode)

**Network Adaptation**:
- **Fast connections**: Shorter delays (0.5x-0.8x base delay)
- **Slow connections**: Longer delays (1.5x-2.5x base delay)
- **RTT compensation**: Adds RTT-based buffer to delays
- **Timeout scaling**: Adjusts request timeouts based on connection speed

### 3. Offline Request Queue (`useOfflineQueue`)

**Location**: `src/hooks/use-offline-queue.ts`

Manages request queueing and background synchronization:

**Features**:
- **Priority-based queuing**: Critical requests processed first
- **Persistent storage**: Survives page reloads using localStorage
- **Batch processing**: Processes multiple requests efficiently
- **Automatic retry**: Retries failed requests with exponential backoff
- **Background sync**: Automatically syncs when connection is restored

**Priority Levels**:
- `critical` (10): System-critical requests
- `high` (5): User-initiated important actions
- `normal` (3): Standard data fetching
- `low` (1): Background/prefetch requests

### 4. Network Context Provider (`NetworkProvider`)

**Location**: `src/contexts/network-provider.tsx`

Provides centralized network state management:

**Capabilities**:
- **Global network status**: Shared across all components
- **Policy configuration**: Customizable retry policies per connection type
- **Queue management**: Centralized request queue operations
- **Connectivity testing**: Built-in connection health checks
- **Persistence**: Saves configurations to localStorage

### 5. Enhanced Entity Data Hook (`useEntityData`)

**Location**: `src/hooks/use-entity-data-enhanced.ts`

Network-aware version of the entity data fetching hook:

**New Features**:
- **Automatic offline queueing**: Queues requests when offline
- **Adaptive caching**: Adjusts cache behavior based on connection speed
- **Network-aware timeouts**: Scales timeouts with connection quality
- **Priority support**: Allows setting request priority levels
- **Background sync**: Optionally persists requests across sessions
- **Connection quality indicators**: Exposes network info in hook state

## Configuration

### Default Retry Policies

```typescript
{
  fast: {
    strategy: 'exponential',
    maxRetries: 3,
    baseDelay: 500,      // 0.5s
    maxDelay: 5000,      // 5s
    requestTimeout: 5000  // 5s
  },
  moderate: {
    strategy: 'exponential', 
    maxRetries: 4,
    baseDelay: 1000,     // 1s
    maxDelay: 10000,     // 10s
    requestTimeout: 8000  // 8s
  },
  slow: {
    strategy: 'adaptive',
    maxRetries: 5,
    baseDelay: 2000,     // 2s
    maxDelay: 20000,     // 20s
    requestTimeout: 15000 // 15s
  },
  verySlow: {
    strategy: 'adaptive',
    maxRetries: 6,
    baseDelay: 5000,     // 5s
    maxDelay: 30000,     // 30s
    requestTimeout: 30000 // 30s
  }
}
```

### Background Sync Configuration

```typescript
{
  enabled: true,
  syncInterval: 30000,      // 30s between sync attempts
  maxSyncDuration: 300000,  // 5min max sync time
  syncOnConnect: true,      // Auto-sync when coming online
  batchSize: 10            // Max requests per batch
}
```

## Usage Examples

### Basic Network-Aware Fetching

```tsx
import { useEntityData } from '@/hooks/use-entity-data-enhanced';

function MyComponent() {
  const { data, loading, error, networkInfo } = useEntityData('W123456', undefined, {
    networkAware: true,
    priority: 'high',
    backgroundSync: true
  });

  return (
    <div>
      {networkInfo && (
        <div>Connection: {networkInfo.connectionQuality}</div>
      )}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div>{data.display_name}</div>}
    </div>
  );
}
```

### With Network Provider

```tsx
import { NetworkProvider } from '@/contexts/network-provider';

function App() {
  return (
    <NetworkProvider>
      <MyComponent />
    </NetworkProvider>
  );
}
```

### Custom Retry Policies

```tsx
<NetworkProvider
  initialRetryPolicies={{
    fast: {
      strategy: 'immediate',
      maxRetries: 1,
      // ... other config
    }
  }}
  initialSyncConfig={{
    syncInterval: 60000, // 1 minute
    showNotifications: true
  }}
>
  <App />
</NetworkProvider>
```

### Manual Queue Management

```tsx
import { useNetworkContext } from '@/contexts/network-provider';

function QueueManager() {
  const { queueStatus, triggerSync, clearQueue } = useNetworkContext();

  return (
    <div>
      <div>Pending: {queueStatus.pendingRequests}</div>
      <button onClick={() => triggerSync()}>Sync Now</button>
      <button onClick={() => clearQueue()}>Clear Queue</button>
    </div>
  );
}
```

## Testing

### Test Structure

Tests are organized by functionality:

- `use-network-status.unit.test.ts`: Network status detection
- `use-adaptive-retry.unit.test.ts`: Retry logic and strategies  
- `use-offline-queue.unit.test.ts`: Queue management and persistence
- `network-provider.unit.test.tsx`: Context integration
- `use-entity-data-network-aware.unit.test.ts`: End-to-end integration

### Running Tests

```bash
# Run all network-related tests
pnpm test:unit src/hooks/use-network-status
pnpm test:unit src/hooks/use-adaptive-retry
pnpm test:unit src/hooks/use-offline-queue
pnpm test:unit src/contexts/network-provider

# Run integration tests
pnpm test:integration src/hooks/use-entity-data-network-aware
```

## Performance Considerations

### Memory Management

- **Request deduplication**: Prevents duplicate requests for same entity
- **Queue size limits**: Automatically cleans old requests
- **Event listener cleanup**: Properly removes all event listeners
- **Abort controller usage**: Cancels in-flight requests when appropriate

### Network Efficiency

- **Adaptive caching**: Prefers cache on slow connections
- **Data saver mode**: Respects user's data conservation settings
- **Batch processing**: Groups multiple requests for efficiency
- **Connection pooling**: Reuses connections where possible

### Storage Optimization

- **Selective persistence**: Only persists requests marked for background sync
- **Automatic cleanup**: Removes completed/expired requests from storage
- **Size monitoring**: Tracks storage usage and provides cleanup utilities

## Browser Compatibility

### Required APIs

- **Navigator Online API**: Supported in all modern browsers
- **Network Information API**: Chrome, Edge, Opera (graceful fallback)
- **Fetch API**: Supported in all modern browsers
- **Service Workers**: Optional, for advanced offline features

### Fallback Behavior

- **No Network Information API**: Falls back to basic online/offline detection
- **Limited storage**: Uses memory-only queue if localStorage unavailable
- **Older browsers**: Degrades to standard retry logic without network awareness

## Future Enhancements

### Planned Features

1. **Service Worker Integration**: True background sync support
2. **Predictive Caching**: Pre-fetch likely-needed entities based on usage patterns
3. **Network Metrics Dashboard**: Real-time network performance monitoring
4. **Custom Strategy Plugins**: Allow registration of custom retry strategies
5. **Cross-tab Synchronization**: Share network status across browser tabs

### Performance Optimizations

1. **Connection Quality Prediction**: Use machine learning to predict connection quality
2. **Request Prioritization**: Dynamic priority adjustment based on user behavior
3. **Compression Negotiation**: Automatic compression based on connection speed
4. **CDN Integration**: Route requests through nearest edge servers

## Integration with Existing Systems

### Caching Layer

The network-aware system integrates seamlessly with the existing caching infrastructure:

- **Cache hit/miss tracking**: Monitors cache effectiveness per network condition
- **TTL adjustment**: Modifies cache TTL based on connection quality
- **Eviction policies**: Prefers keeping cached data on slow connections

### Error Handling

Enhances existing error handling with network context:

- **Error classification**: Distinguishes network errors from application errors
- **Retry recommendations**: Provides user-friendly retry suggestions
- **Fallback strategies**: Automatic fallback to cached data when appropriate

### Analytics Integration

Provides rich metrics for performance monitoring:

- **Connection quality distribution**: Track user network conditions
- **Retry success rates**: Monitor effectiveness of retry strategies
- **Queue processing metrics**: Analyze offline usage patterns
- **Performance correlation**: Connect network quality to user experience metrics

This implementation provides a robust foundation for offline-first functionality while maintaining excellent performance across all network conditions.