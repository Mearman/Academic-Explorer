/**
 * Enhanced WebSocket service with improved stability and error recovery
 * Builds upon the base WebSocket service with advanced reliability features
 */

import { WebSocketService, type WebSocketConfig } from './websocket-service';
import type { WebSocketMessage, Operation } from '@/types/collaboration';

/**
 * Enhanced configuration options for improved reliability
 */
export interface EnhancedWebSocketConfig extends WebSocketConfig {
  /** Enable adaptive timeout based on network conditions */
  adaptiveTimeout?: boolean;
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold?: number;
  /** Circuit breaker reset timeout */
  circuitBreakerResetTimeout?: number;
  /** Enable message deduplication */
  enableDeduplication?: boolean;
  /** Message deduplication window in milliseconds */
  deduplicationWindow?: number;
  /** Enable exponential backoff for reconnection */
  exponentialBackoff?: boolean;
  /** Enable network quality adaptation */
  adaptToNetworkQuality?: boolean;
  /** Health check interval in milliseconds */
  healthCheckInterval?: number;
  /** Sync state recovery strategy */
  syncRecoveryStrategy?: 'full' | 'incremental' | 'differential';
}

/**
 * Enhanced default configuration
 */
const ENHANCED_DEFAULT_CONFIG: Required<EnhancedWebSocketConfig> = {
  // Base config
  url: '',
  protocols: [],
  connectionTimeout: 10000, // Increased timeout
  heartbeatInterval: 15000, // More frequent heartbeats
  heartbeatTimeout: 5000,
  autoReconnect: true,
  maxReconnectAttempts: 10, // More attempts
  reconnectDelay: 1000,
  maxReconnectDelay: 60000, // Longer max delay
  backoffMultiplier: 1.5, // Gentler backoff
  enableQueuing: true,
  maxQueueSize: 500, // Larger queue
  ackTimeout: 8000, // Longer ack timeout
  
  // Enhanced config
  adaptiveTimeout: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  enableDeduplication: true,
  deduplicationWindow: 10000,
  exponentialBackoff: true,
  adaptToNetworkQuality: true,
  healthCheckInterval: 30000,
  syncRecoveryStrategy: 'incremental',
};

/**
 * Network quality metrics
 */
interface NetworkQuality {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  stability: number;
  timestamp: number;
}

/**
 * Circuit breaker states
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Enhanced WebSocket service with reliability improvements
 */
export class EnhancedWebSocketService extends WebSocketService {
  private enhancedConfig: Required<EnhancedWebSocketConfig>;
  
  // Circuit breaker
  private circuitBreakerState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;
  
  // Network quality monitoring
  private networkQuality: NetworkQuality = {
    latency: 0,
    packetLoss: 0,
    bandwidth: 0,
    stability: 1,
    timestamp: Date.now(),
  };
  
  // Message deduplication
  private receivedMessages: Set<string> = new Set();
  private deduplicationCleanupTimer: NodeJS.Timeout | null = null;
  
  // Health monitoring
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck = 0;
  private consecutiveHealthFailures = 0;
  
  // Adaptive timeout
  private currentTimeout: number;
  private timeoutHistory: number[] = [];
  
  // Sync state recovery
  private lastSyncTimestamp = 0;
  private pendingSyncOperations: Operation[] = [];
  private syncInProgress = false;

  constructor(config: EnhancedWebSocketConfig) {
    const mergedConfig = { ...ENHANCED_DEFAULT_CONFIG, ...config };
    super(mergedConfig);
    
    this.enhancedConfig = mergedConfig;
    this.currentTimeout = mergedConfig.connectionTimeout;
    
    this.setupEnhancedFeatures();
  }

  /**
   * Enhanced connection with circuit breaker and quality adaptation
   */
  async connect(): Promise<void> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'open') {
      if (Date.now() - this.lastFailureTime < this.enhancedConfig.circuitBreakerResetTimeout) {
        throw new Error('Circuit breaker is open - connection attempts blocked');
      } else {
        this.circuitBreakerState = 'half-open';
      }
    }

    try {
      // Adapt timeout based on network quality
      if (this.enhancedConfig.adaptiveTimeout) {
        this.adaptConnectionTimeout();
      }

      await super.connect();
      
      // Reset circuit breaker on successful connection
      this.resetCircuitBreaker();
      
      // Start enhanced monitoring
      this.startHealthChecking();
      this.startNetworkQualityMonitoring();
      
    } catch (error) {
      this.handleConnectionFailure(error);
      throw error;
    }
  }

  /**
   * Enhanced message sending with deduplication and quality adaptation
   */
  async send(message: WebSocketMessage): Promise<void> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'open') {
      throw new Error('Circuit breaker is open - message sending blocked');
    }

    // Add deduplication if enabled
    if (this.enhancedConfig.enableDeduplication) {
      if (this.receivedMessages.has(message.id)) {
        console.warn('Duplicate message detected, skipping:', message.id);
        return;
      }
    }

    try {
      // Adapt message based on network quality
      const adaptedMessage = this.adaptMessageForNetworkQuality(message);
      
      await super.send(adaptedMessage);
      
      // Track successful send
      this.updateNetworkQuality('send-success');
      
    } catch (error) {
      this.handleSendFailure(error);
      throw error;
    }
  }

  /**
   * Enhanced reconnection with improved strategies
   */
  async reconnect(): Promise<void> {
    // Implement exponential backoff if enabled
    if (this.enhancedConfig.exponentialBackoff) {
      const reconnectAttempts = this.getReconnectAttempts();
      const delay = this.calculateExponentialBackoff(reconnectAttempts);
      
      if (delay > 0) {
        await this.wait(delay);
      }
    }

    // Check if sync recovery is needed
    const needsSync = this.shouldPerformSyncRecovery();
    
    try {
      await this.connect();
      
      if (needsSync) {
        await this.performSyncRecovery();
      }
      
    } catch (error) {
      console.error('Enhanced reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics(): {
    circuitBreakerState: CircuitBreakerState;
    networkQuality: NetworkQuality;
    failureCount: number;
    lastHealthCheck: number;
    adaptiveTimeout: number;
    syncStatus: {
      lastSync: number;
      pendingOperations: number;
      syncInProgress: boolean;
    };
  } {
    return {
      circuitBreakerState: this.circuitBreakerState,
      networkQuality: { ...this.networkQuality },
      failureCount: this.failureCount,
      lastHealthCheck: this.lastHealthCheck,
      adaptiveTimeout: this.currentTimeout,
      syncStatus: {
        lastSync: this.lastSyncTimestamp,
        pendingOperations: this.pendingSyncOperations.length,
        syncInProgress: this.syncInProgress,
      },
    };
  }

  /**
   * Force sync recovery
   */
  async forceSyncRecovery(): Promise<void> {
    if (this.syncInProgress) {
      console.warn('Sync recovery already in progress');
      return;
    }

    try {
      await this.performSyncRecovery();
    } catch (error) {
      console.error('Forced sync recovery failed:', error);
      throw error;
    }
  }

  /**
   * Clean shutdown with proper cleanup
   */
  disconnect(): void {
    this.cleanupEnhancedFeatures();
    super.disconnect();
  }

  // Private enhanced methods

  private setupEnhancedFeatures(): void {
    // Set up message deduplication cleanup
    if (this.enhancedConfig.enableDeduplication) {
      this.deduplicationCleanupTimer = setInterval(() => {
        this.cleanupOldMessages();
      }, this.enhancedConfig.deduplicationWindow);
    }

    // Monitor network quality changes
    if (this.enhancedConfig.adaptToNetworkQuality) {
      this.on('message', () => this.updateNetworkQuality('message-received'));
      this.on('error', () => this.updateNetworkQuality('error'));
      this.on('heartbeat-received', () => this.updateNetworkQuality('heartbeat'));
    }
  }

  private cleanupEnhancedFeatures(): void {
    if (this.deduplicationCleanupTimer) {
      clearInterval(this.deduplicationCleanupTimer);
      this.deduplicationCleanupTimer = null;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }
  }

  private handleConnectionFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Update network quality
    this.updateNetworkQuality('connection-failure');

    // Check circuit breaker threshold
    if (this.failureCount >= this.enhancedConfig.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }

    this.emit('enhanced-connection-failure', { 
      error, 
      failureCount: this.failureCount,
      circuitBreakerState: this.circuitBreakerState 
    });
  }

  private handleSendFailure(error: unknown): void {
    this.updateNetworkQuality('send-failure');
    
    // Increment failure count for circuit breaker
    this.failureCount++;
    
    if (this.failureCount >= this.enhancedConfig.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }

    this.emit('enhanced-send-failure', { error, failureCount: this.failureCount });
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerState = 'open';
    
    // Set timer to attempt reset
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitBreakerState = 'half-open';
      this.emit('circuit-breaker-half-open');
    }, this.enhancedConfig.circuitBreakerResetTimeout);

    this.emit('circuit-breaker-open');
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerState = 'closed';
    this.failureCount = 0;
    
    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }

    this.emit('circuit-breaker-closed');
  }

  private adaptConnectionTimeout(): void {
    const avgLatency = this.networkQuality.latency;
    const stability = this.networkQuality.stability;
    
    // Increase timeout for poor network conditions
    let adaptedTimeout = this.enhancedConfig.connectionTimeout;
    
    if (avgLatency > 1000) {
      adaptedTimeout *= 1.5;
    }
    
    if (stability < 0.8) {
      adaptedTimeout *= 1.3;
    }
    
    this.currentTimeout = Math.min(adaptedTimeout, this.enhancedConfig.connectionTimeout * 3);
  }

  private adaptMessageForNetworkQuality(message: WebSocketMessage): WebSocketMessage {
    if (!this.enhancedConfig.adaptToNetworkQuality) {
      return message;
    }

    // For poor network conditions, add compression or reduce payload
    if (this.networkQuality.bandwidth < 100) { // Low bandwidth
      // Could implement message compression here
      return {
        ...message,
        payload: this.compressPayload(message.payload),
      };
    }

    return message;
  }

  private compressPayload(payload: unknown): unknown {
    // Simple payload optimization
    if (typeof payload === 'object' && payload !== null) {
      // Remove unnecessary fields, compress strings, etc.
      return payload; // Placeholder - would implement actual compression
    }
    return payload;
  }

  private updateNetworkQuality(event: string): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.networkQuality.timestamp;
    
    switch (event) {
      case 'heartbeat':
        // Update latency based on heartbeat round-trip time
        this.networkQuality.latency = Math.min(timeSinceLastUpdate, 5000);
        this.networkQuality.stability = Math.min(this.networkQuality.stability + 0.1, 1);
        break;
        
      case 'message-received':
        this.networkQuality.stability = Math.min(this.networkQuality.stability + 0.05, 1);
        break;
        
      case 'send-success':
        this.networkQuality.stability = Math.min(this.networkQuality.stability + 0.02, 1);
        break;
        
      case 'error':
      case 'connection-failure':
      case 'send-failure':
        this.networkQuality.stability = Math.max(this.networkQuality.stability - 0.2, 0);
        this.networkQuality.packetLoss = Math.min(this.networkQuality.packetLoss + 0.1, 1);
        break;
    }
    
    this.networkQuality.timestamp = now;
    
    // Emit quality change event if significant change
    this.emit('network-quality-changed', this.networkQuality);
  }

  private startHealthChecking(): void {
    if (!this.enhancedConfig.healthCheckInterval) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.enhancedConfig.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = Date.now();
    
    try {
      // Send health check message
      const healthMessage: WebSocketMessage = {
        type: 'heartbeat',
        payload: { healthCheck: true, timestamp: Date.now() },
        timestamp: Date.now(),
        sessionId: 'health-check',
        id: `health-${Date.now()}`,
      };

      await this.send(healthMessage);
      
      this.consecutiveHealthFailures = 0;
      this.emit('health-check-success');
      
    } catch (error) {
      this.consecutiveHealthFailures++;
      
      if (this.consecutiveHealthFailures >= 3) {
        this.emit('health-check-failure', { 
          consecutiveFailures: this.consecutiveHealthFailures,
          error 
        });
        
        // Consider reconnection
        if (this.enhancedConfig.autoReconnect) {
          this.reconnect().catch(reconnectError => {
            console.error('Health check triggered reconnection failed:', reconnectError);
          });
        }
      }
    }
  }

  private startNetworkQualityMonitoring(): void {
    // Monitor network events for quality assessment
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        connection.addEventListener('change', () => {
          this.networkQuality.bandwidth = connection.downlink || 0;
          this.emit('network-quality-changed', this.networkQuality);
        });
      }
    }
  }

  private cleanupOldMessages(): void {
    const cutoffTime = Date.now() - this.enhancedConfig.deduplicationWindow;
    
    // Clean up old message IDs (simplified - would need timestamp tracking)
    if (this.receivedMessages.size > 1000) {
      this.receivedMessages.clear();
    }
  }

  private calculateExponentialBackoff(attempt: number): number {
    const baseDelay = this.enhancedConfig.reconnectDelay;
    const maxDelay = this.enhancedConfig.maxReconnectDelay;
    const multiplier = this.enhancedConfig.backoffMultiplier;
    
    const delay = baseDelay * Math.pow(multiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    
    return Math.min(delay + jitter, maxDelay);
  }

  private getReconnectAttempts(): number {
    // This would be tracked by the parent class
    return this.getStats?.()?.reconnectAttempts || 0;
  }

  private shouldPerformSyncRecovery(): boolean {
    const timeSinceLastSync = Date.now() - this.lastSyncTimestamp;
    return timeSinceLastSync > 30000 || this.pendingSyncOperations.length > 0;
  }

  private async performSyncRecovery(): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      switch (this.enhancedConfig.syncRecoveryStrategy) {
        case 'full':
          await this.performFullSync();
          break;
        case 'incremental':
          await this.performIncrementalSync();
          break;
        case 'differential':
          await this.performDifferentialSync();
          break;
      }
      
      this.lastSyncTimestamp = Date.now();
      this.emit('sync-recovery-complete');
      
    } catch (error) {
      this.emit('sync-recovery-failed', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async performFullSync(): Promise<void> {
    // Request complete state from server
    const syncMessage: WebSocketMessage = {
      type: 'sync-request' as any,
      payload: { 
        type: 'full',
        timestamp: this.lastSyncTimestamp 
      },
      timestamp: Date.now(),
      sessionId: 'sync',
      id: `sync-full-${Date.now()}`,
    };
    
    await this.send(syncMessage);
  }

  private async performIncrementalSync(): Promise<void> {
    // Request changes since last sync
    const syncMessage: WebSocketMessage = {
      type: 'sync-request' as any,
      payload: { 
        type: 'incremental',
        since: this.lastSyncTimestamp 
      },
      timestamp: Date.now(),
      sessionId: 'sync',
      id: `sync-incremental-${Date.now()}`,
    };
    
    await this.send(syncMessage);
  }

  private async performDifferentialSync(): Promise<void> {
    // Send local changes and request remote changes
    const syncMessage: WebSocketMessage = {
      type: 'sync-request' as any,
      payload: { 
        type: 'differential',
        since: this.lastSyncTimestamp,
        localOperations: this.pendingSyncOperations 
      },
      timestamp: Date.now(),
      sessionId: 'sync',
      id: `sync-differential-${Date.now()}`,
    };
    
    await this.send(syncMessage);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating enhanced WebSocket service
 */
export function createEnhancedWebSocketService(
  config: EnhancedWebSocketConfig
): EnhancedWebSocketService {
  return new EnhancedWebSocketService(config);
}

/**
 * Create enhanced WebSocket service with network awareness and monitoring
 */
export function createNetworkAwareEnhancedWebSocketService(
  config: EnhancedWebSocketConfig
): EnhancedWebSocketService {
  const service = new EnhancedWebSocketService({
    ...config,
    adaptToNetworkQuality: true,
    healthCheckInterval: 30000,
    circuitBreakerThreshold: 3,
    enableDeduplication: true,
  });

  // Add network monitoring if available
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    window.addEventListener('online', () => {
      service.reconnect().catch(error => {
        console.error('Auto-reconnection after online event failed:', error);
      });
    });

    window.addEventListener('offline', () => {
      service.emit('network-offline');
    });
  }

  return service;
}