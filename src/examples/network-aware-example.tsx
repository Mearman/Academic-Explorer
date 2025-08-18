/**
 * Example demonstrating network-aware retry strategies for Academic Explorer
 */

import React, { useState } from 'react';

import { NetworkProvider, useNetworkContext } from '@/contexts/network-provider';
import { useEntityData } from '@/hooks/use-entity-data-enhanced';
import type { RequestPriority } from '@/hooks/use-entity-data-enhanced';
import { useNetworkStatus } from '@/hooks/use-network-status';

/**
 * Network status display component
 */
function NetworkStatusDisplay() {
  const networkStatus = useNetworkStatus();
  const networkContext = useNetworkContext();

  const getConnectionIcon = () => {
    if (!networkStatus.isOnline) return '[OFFLINE]';
    switch (networkStatus.connectionQuality) {
      case 'fast': return '[STRONG]';
      case 'moderate': return '[GOOD]';
      case 'slow': return '[WEAK]';
      case 'verySlow': return '[POOR]';
      default: return '[UNKNOWN]';
    }
  };

  const getConnectionColor = () => {
    if (!networkStatus.isOnline) return '#f44336';
    switch (networkStatus.connectionQuality) {
      case 'fast': return '#4caf50';
      case 'moderate': return '#ff9800';
      case 'slow': return '#ff5722';
      case 'verySlow': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <div style={{ 
      padding: '16px', 
      backgroundColor: '#f5f5f5', 
      borderRadius: '8px', 
      marginBottom: '16px' 
    }}>
      <h3>Network Status</h3>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{getConnectionIcon()}</span>
        <span style={{ 
          color: getConnectionColor(), 
          fontWeight: 'bold' 
        }}>
          {networkStatus.isOnline ? 'Online' : 'Offline'}
        </span>
        <span>({networkStatus.connectionQuality})</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
        <div>Connection: {networkStatus.connectionType}</div>
        <div>RTT: {networkStatus.rtt}ms</div>
        <div>Downlink: {networkStatus.downlink}Mbps</div>
        <div>Save Data: {networkStatus.saveData ? 'Yes' : 'No'}</div>
        <div>Slow Connection: {networkStatus.isSlowConnection ? 'Yes' : 'No'}</div>
        <div>Queue: {networkContext.queueStatus.pendingRequests} pending</div>
      </div>

      {networkContext.queueStatus.pendingRequests > 0 && (
        <div style={{ marginTop: '8px' }}>
          <button 
            onClick={() => networkContext.triggerSync()}
            style={{ 
              padding: '4px 8px', 
              backgroundColor: '#2196f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Sync Queue ({networkContext.queueStatus.pendingRequests})
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Entity fetching example with different priorities
 */
function EntityFetchExample() {
  const [entityId, setEntityId] = useState('W2741809807');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [networkAware, setNetworkAware] = useState(true);

  const { 
    data, 
    loading, 
    error, 
    state, 
    retryCount, 
    networkInfo,
    isQueued,
    refetch, 
    retry, 
    reset 
  } = useEntityData(entityId, undefined, {
    networkAware,
    priority,
    backgroundSync: true,
    adaptiveCaching: true,
    retryOnError: true,
  });

  return (
    <div style={{ 
      padding: '16px', 
      backgroundColor: 'white', 
      borderRadius: '8px', 
      marginBottom: '16px',
      border: '1px solid #e0e0e0'
    }}>
      <h3>Entity Data Fetching</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <label>Entity ID: </label>
          <input 
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            style={{ marginLeft: '8px', padding: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label>Priority: </label>
          <select 
            value={priority}
            onChange={(e) => setPriority(e.target.value as RequestPriority)}
            style={{ marginLeft: '8px', padding: '4px' }}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <label>
            <input 
              type="checkbox"
              checked={networkAware}
              onChange={(e) => setNetworkAware(e.target.checked)}
            />
            Network Aware
          </label>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => refetch()}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Refetch
          </button>
          <button 
            onClick={() => retry()}
            disabled={loading || !error?.retryable}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#ff9800', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              opacity: (loading || !error?.retryable) ? 0.5 : 1
            }}
          >
            Retry
          </button>
          <button 
            onClick={() => reset()}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#9e9e9e', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div><strong>State:</strong> {state}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>Retry Count:</strong> {retryCount}</div>
        {isQueued && <div style={{ color: '#ff9800' }}><strong>Status:</strong> Queued for offline sync</div>}
        {networkInfo && (
          <div><strong>Connection:</strong> {networkInfo.connectionQuality} ({networkInfo.rtt}ms RTT)</div>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <div style={{ color: '#f44336', fontWeight: 'bold' }}>Error: {error.type}</div>
          <div style={{ color: '#666', fontSize: '14px' }}>{error.message}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Retryable: {error.retryable ? 'Yes' : 'No'} | 
            Network Aware: {error.networkAware ? 'Yes' : 'No'}
          </div>
        </div>
      )}

      {data && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#e8f5e8', 
          border: '1px solid #4caf50', 
          borderRadius: '4px'
        }}>
          <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>
            Success: {data.display_name || data.id}
          </div>
          {'publication_year' in data && data.publication_year && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              Published: {data.publication_year}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Retry policy configuration component
 */
function RetryPolicyConfig() {
  const { retryPolicies, updateRetryPolicies, networkStatus } = useNetworkContext();
  const currentPolicy = retryPolicies[networkStatus.connectionQuality] || retryPolicies.unknown;

  return (
    <div style={{ 
      padding: '16px', 
      backgroundColor: 'white', 
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3>Current Retry Policy ({networkStatus.connectionQuality})</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
        <div><strong>Strategy:</strong> {currentPolicy.strategy}</div>
        <div><strong>Max Retries:</strong> {currentPolicy.maxRetries}</div>
        <div><strong>Base Delay:</strong> {currentPolicy.baseDelay}ms</div>
        <div><strong>Max Delay:</strong> {currentPolicy.maxDelay}ms</div>
        <div><strong>Backoff Multiplier:</strong> {currentPolicy.backoffMultiplier}</div>
        <div><strong>Adapt to Network:</strong> {currentPolicy.adaptToNetwork ? 'Yes' : 'No'}</div>
        <div><strong>Request Timeout:</strong> {currentPolicy.requestTimeout}ms</div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <button 
          onClick={() => {
            updateRetryPolicies({
              [networkStatus.connectionQuality]: {
                ...currentPolicy,
                maxRetries: currentPolicy.maxRetries + 1,
              }
            });
          }}
          style={{ 
            padding: '4px 8px', 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '8px'
          }}
        >
          Increase Max Retries
        </button>
        
        <button 
          onClick={() => {
            updateRetryPolicies({
              [networkStatus.connectionQuality]: {
                ...currentPolicy,
                baseDelay: Math.min(currentPolicy.baseDelay + 500, currentPolicy.maxDelay),
              }
            });
          }}
          style={{ 
            padding: '4px 8px', 
            backgroundColor: '#ff9800', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Increase Base Delay
        </button>
      </div>
    </div>
  );
}

/**
 * Main network-aware example component
 */
function NetworkAwareExampleContent() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Network-Aware Retry Strategies Demo</h1>
      
      <p style={{ color: '#666', marginBottom: '24px' }}>
        This demo shows how Academic Explorer adapts its retry strategies based on network conditions.
        Try toggling your network connection or throttling to see the adaptive behavior.
      </p>

      <NetworkStatusDisplay />
      <EntityFetchExample />
      <RetryPolicyConfig />
      
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        marginTop: '24px'
      }}>
        <h3>How it Works</h3>
        <ul style={{ color: '#666' }}>
          <li><strong>Fast connections (4G):</strong> Short retry delays, fewer retries, prioritize fresh data</li>
          <li><strong>Slow connections (3G/2G):</strong> Longer delays, more retries, prefer cached data</li>
          <li><strong>Offline mode:</strong> Requests are queued and synced when connection returns</li>
          <li><strong>Adaptive timeouts:</strong> Request timeouts adjust based on measured RTT</li>
          <li><strong>Priority queuing:</strong> Critical requests are processed first when coming online</li>
          <li><strong>Background sync:</strong> Persistent requests survive page reloads</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Complete example with NetworkProvider wrapper
 */
export function NetworkAwareExample() {
  return (
    <NetworkProvider>
      <NetworkAwareExampleContent />
    </NetworkProvider>
  );
}

export default NetworkAwareExample;