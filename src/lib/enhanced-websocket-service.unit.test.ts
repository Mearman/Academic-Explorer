/**
 * Enhanced WebSocket Service Unit Tests
 * 
 * Test-driven development for reliability features including:
 * - Circuit breaker functionality
 * - Network quality monitoring and adaptation
 * - Message deduplication
 * - Health checking
 * - Sync recovery strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { EnhancedWebSocketService, type EnhancedWebSocketConfig } from './enhanced-websocket-service';
import type { WebSocketMessage } from '@/types/collaboration';

// Mock the base WebSocket service
vi.mock('./websocket-service', () => ({
  WebSocketService: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    getStats: vi.fn().mockReturnValue({ reconnectAttempts: 0 }),
    getReconnectAttempts: vi.fn().mockReturnValue(0),
    emit: vi.fn(),
    on: vi.fn(),
  })),
}));

describe('EnhancedWebSocketService', () => {
  let service: EnhancedWebSocketService;
  let mockConfig: EnhancedWebSocketConfig;
  let mockSuperConnect: MockedFunction<any>;
  let mockSuperSend: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockConfig = {
      url: 'ws://localhost:8080',
      adaptiveTimeout: true,
      circuitBreakerThreshold: 3,
      circuitBreakerResetTimeout: 30000,
      enableDeduplication: true,
      deduplicationWindow: 10000,
      exponentialBackoff: true,
      adaptToNetworkQuality: true,
      healthCheckInterval: 30000,
      syncRecoveryStrategy: 'incremental',
    };

    service = new EnhancedWebSocketService(mockConfig);
    
    // Mock the parent class methods
    mockSuperConnect = vi.fn();
    mockSuperSend = vi.fn();
    (service as any).__proto__.__proto__.connect = mockSuperConnect;
    (service as any).__proto__.__proto__.send = mockSuperSend;
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
  });

  describe('Circuit Breaker Functionality', () => {
    it('should start with circuit breaker in closed state', () => {
      const metrics = service.getHealthMetrics();
      expect(metrics.circuitBreakerState).toBe('closed');
      expect(metrics.failureCount).toBe(0);
    });

    it('should open circuit breaker after threshold failures', async () => {
      // Force connection failures to reach threshold
      mockSuperConnect.mockRejectedValue(new Error('Connection failed'));

      // Attempt connections to trigger failures
      for (let i = 0; i < mockConfig.circuitBreakerThreshold!; i++) {
        try {
          await service.connect();
        } catch {
          // Expected to fail
        }
      }

      const metrics = service.getHealthMetrics();
      expect(metrics.circuitBreakerState).toBe('open');
      expect(metrics.failureCount).toBeGreaterThanOrEqual(mockConfig.circuitBreakerThreshold!);
    });

    it('should block connection attempts when circuit breaker is open', async () => {
      // Force circuit breaker to open state
      (service as any).circuitBreakerState = 'open';
      (service as any).lastFailureTime = Date.now();

      await expect(service.connect()).rejects.toThrow('Circuit breaker is open');
      expect(mockSuperConnect).not.toHaveBeenCalled();
    });

    it('should transition to half-open state after reset timeout', async () => {
      // Open circuit breaker
      (service as any).circuitBreakerState = 'open';
      (service as any).lastFailureTime = Date.now() - 31000; // Past reset timeout

      // Should allow connection attempt in half-open state
      mockSuperConnect.mockResolvedValue(undefined);
      await service.connect();

      const metrics = service.getHealthMetrics();
      expect(metrics.circuitBreakerState).toBe('closed'); // Should reset to closed on success
    });

    it('should reset circuit breaker on successful connection', async () => {
      // Set up failure state
      (service as any).failureCount = 2;
      (service as any).circuitBreakerState = 'half-open';

      mockSuperConnect.mockResolvedValue(undefined);
      await service.connect();

      const metrics = service.getHealthMetrics();
      expect(metrics.circuitBreakerState).toBe('closed');
      expect(metrics.failureCount).toBe(0);
    });
  });

  describe('Network Quality Monitoring', () => {
    it('should initialize with default network quality metrics', () => {
      const metrics = service.getHealthMetrics();
      expect(metrics.networkQuality).toMatchObject({
        latency: 0,
        packetLoss: 0,
        bandwidth: 0,
        stability: 1,
      });
      expect(metrics.networkQuality.timestamp).toBeGreaterThan(0);
    });

    it('should update network quality on successful operations', () => {
      const initialMetrics = service.getHealthMetrics();
      const initialStability = initialMetrics.networkQuality.stability;

      // Simulate successful message received
      (service as any).updateNetworkQuality('message-received');

      const updatedMetrics = service.getHealthMetrics();
      expect(updatedMetrics.networkQuality.stability).toBeGreaterThanOrEqual(initialStability);
    });

    it('should degrade network quality on failures', () => {
      const initialMetrics = service.getHealthMetrics();
      const initialStability = initialMetrics.networkQuality.stability;

      // Simulate connection failure
      (service as any).updateNetworkQuality('connection-failure');

      const updatedMetrics = service.getHealthMetrics();
      expect(updatedMetrics.networkQuality.stability).toBeLessThan(initialStability);
      expect(updatedMetrics.networkQuality.packetLoss).toBeGreaterThan(0);
    });

    it('should adapt connection timeout based on network quality', async () => {
      // Set poor network conditions
      (service as any).networkQuality = {
        latency: 1500, // High latency
        stability: 0.7, // Low stability
        packetLoss: 0.1,
        bandwidth: 50,
        timestamp: Date.now(),
      };

      // Call the private method to test timeout adaptation
      (service as any).adaptConnectionTimeout();

      const metrics = service.getHealthMetrics();
      expect(metrics.adaptiveTimeout).toBeGreaterThan(mockConfig.connectionTimeout || 10000);
    });
  });

  describe('Message Deduplication', () => {
    it('should allow first occurrence of a message', async () => {
      const message: WebSocketMessage = {
        id: 'test-message-1',
        type: 'operation',
        payload: { test: true },
        timestamp: Date.now(),
        sessionId: 'test-session',
      };

      mockSuperSend.mockResolvedValue(undefined);
      await service.send(message);

      expect(mockSuperSend).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-message-1',
      }));
    });

    it('should reject duplicate messages when deduplication enabled', async () => {
      const message: WebSocketMessage = {
        id: 'test-message-duplicate',
        type: 'operation',
        payload: { test: true },
        timestamp: Date.now(),
        sessionId: 'test-session',
      };

      // Add message to received set to simulate duplication
      (service as any).receivedMessages.add('test-message-duplicate');

      mockSuperSend.mockResolvedValue(undefined);
      
      // First call should be skipped due to deduplication
      await service.send(message);
      
      expect(mockSuperSend).not.toHaveBeenCalled();
    });

    it('should clean up old message IDs periodically', () => {
      const cleanupSpy = vi.spyOn(service as any, 'cleanupOldMessages');
      
      // Fast-forward past cleanup interval
      vi.advanceTimersByTime(10000);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Health Checking', () => {
    it('should start health checking when enabled', async () => {
      mockSuperConnect.mockResolvedValue(undefined);
      mockSuperSend.mockResolvedValue(undefined);

      await service.connect();

      // Fast-forward past health check interval
      vi.advanceTimersByTime(30000);

      expect(mockSuperSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
          payload: expect.objectContaining({
            healthCheck: true,
          }),
        })
      );
    });

    it('should track consecutive health check failures', async () => {
      mockSuperConnect.mockResolvedValue(undefined);
      await service.connect();

      // Mock health check failures
      mockSuperSend.mockRejectedValue(new Error('Health check failed'));

      // Trigger multiple health check failures
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(30000);
        await vi.runAllTimersAsync();
      }

      // Should have attempted reconnection after 3 failures
      expect(mockSuperConnect).toHaveBeenCalledTimes(2); // Initial + health-triggered reconnect
    });

    it('should reset failure count on successful health check', async () => {
      mockSuperConnect.mockResolvedValue(undefined);
      mockSuperSend.mockResolvedValue(undefined);

      await service.connect();

      // Set up some failures first
      (service as any).consecutiveHealthFailures = 2;

      // Trigger successful health check
      vi.advanceTimersByTime(30000);
      await vi.runAllTimersAsync();

      // Health failures should be reset
      expect((service as any).consecutiveHealthFailures).toBe(0);
    });
  });

  describe('Sync Recovery', () => {
    it('should detect when sync recovery is needed', () => {
      // Set old sync timestamp
      (service as any).lastSyncTimestamp = Date.now() - 35000; // 35 seconds ago

      const needsSync = (service as any).shouldPerformSyncRecovery();
      expect(needsSync).toBe(true);
    });

    it('should perform incremental sync by default', async () => {
      mockSuperSend.mockResolvedValue(undefined);
      (service as any).lastSyncTimestamp = Date.now() - 35000;

      await service.forceSyncRecovery();

      expect(mockSuperSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync-request',
          payload: expect.objectContaining({
            type: 'incremental',
          }),
        })
      );
    });

    it('should prevent concurrent sync operations', async () => {
      (service as any).syncInProgress = true;

      await service.forceSyncRecovery();

      // Should not attempt sync if already in progress
      expect(mockSuperSend).not.toHaveBeenCalled();
    });

    it('should handle different sync recovery strategies', async () => {
      mockSuperSend.mockResolvedValue(undefined);

      // Test full sync
      const fullSyncService = new EnhancedWebSocketService({
        ...mockConfig,
        syncRecoveryStrategy: 'full',
      });
      (fullSyncService as any).__proto__.__proto__.send = mockSuperSend;

      await (fullSyncService as any).performSyncRecovery();

      expect(mockSuperSend).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            type: 'full',
          }),
        })
      );
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff delays', () => {
      const attempt1 = (service as any).calculateExponentialBackoff(1);
      const attempt2 = (service as any).calculateExponentialBackoff(2);
      const attempt3 = (service as any).calculateExponentialBackoff(3);

      expect(attempt2).toBeGreaterThan(attempt1);
      expect(attempt3).toBeGreaterThan(attempt2);
    });

    it('should respect maximum delay limit', () => {
      const maxDelay = mockConfig.maxReconnectDelay || 60000;
      const largeAttempt = (service as any).calculateExponentialBackoff(20);

      expect(largeAttempt).toBeLessThanOrEqual(maxDelay);
    });

    it('should include jitter to prevent thundering herd', () => {
      const delays = Array.from({ length: 10 }, () => 
        (service as any).calculateExponentialBackoff(3)
      );

      // All delays should be different due to jitter
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should emit enhanced failure events with context', async () => {
      const emitSpy = vi.spyOn(service as any, 'emit');
      mockSuperConnect.mockRejectedValue(new Error('Connection failed'));

      try {
        await service.connect();
      } catch {
        // Expected to fail
      }

      expect(emitSpy).toHaveBeenCalledWith('enhanced-connection-failure', 
        expect.objectContaining({
          error: expect.any(Error),
          failureCount: expect.any(Number),
          circuitBreakerState: expect.any(String),
        })
      );
    });

    it('should handle send failures gracefully', async () => {
      const message: WebSocketMessage = {
        id: 'test-message',
        type: 'operation',
        payload: { test: true },
        timestamp: Date.now(),
        sessionId: 'test-session',
      };

      mockSuperSend.mockRejectedValue(new Error('Send failed'));

      await expect(service.send(message)).rejects.toThrow('Send failed');

      const metrics = service.getHealthMetrics();
      expect(metrics.failureCount).toBeGreaterThan(0);
    });

    it('should clean up resources on disconnect', () => {
      const cleanupSpy = vi.spyOn(service as any, 'cleanupEnhancedFeatures');

      service.disconnect();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration and Adaptation', () => {
    it('should use enhanced default configuration', () => {
      const defaultService = new EnhancedWebSocketService({ url: 'ws://test' });
      const metrics = defaultService.getHealthMetrics();

      expect(metrics.circuitBreakerState).toBe('closed');
      expect(metrics.networkQuality.stability).toBe(1);
    });

    it('should adapt message payload for low bandwidth', () => {
      // Set low bandwidth condition
      (service as any).networkQuality.bandwidth = 50; // Low bandwidth

      const message: WebSocketMessage = {
        id: 'test-message',
        type: 'operation',
        payload: { large: 'data'.repeat(1000) },
        timestamp: Date.now(),
        sessionId: 'test-session',
      };

      const adaptedMessage = (service as any).adaptMessageForNetworkQuality(message);

      // Should compress or optimize payload
      expect(adaptedMessage).toBeDefined();
      expect(adaptedMessage.id).toBe(message.id);
    });
  });

  describe('Integration with Base Service', () => {
    it('should properly extend base WebSocket service', () => {
      expect(service).toBeInstanceOf(EnhancedWebSocketService);
      expect(typeof service.connect).toBe('function');
      expect(typeof service.send).toBe('function');
      expect(typeof service.disconnect).toBe('function');
    });

    it('should provide health metrics interface', () => {
      const metrics = service.getHealthMetrics();

      expect(metrics).toHaveProperty('circuitBreakerState');
      expect(metrics).toHaveProperty('networkQuality');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('lastHealthCheck');
      expect(metrics).toHaveProperty('adaptiveTimeout');
      expect(metrics).toHaveProperty('syncStatus');
    });
  });
});