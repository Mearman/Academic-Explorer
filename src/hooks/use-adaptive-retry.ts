/**
 * Adaptive retry logic hook that adjusts retry strategies based on network conditions
 */

import { useCallback, useState, useRef } from 'react';

import type { 
  NetworkRetryPolicy, 
  RetryStrategy as _RetryStrategy, 
  ConnectionQuality 
} from '@/types/network';

import { useNetworkStatus } from './use-network-status';

/**
 * Retry statistics interface
 */
interface RetryStats {
  totalAttempts: number;
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
}

/**
 * Check if an error is retryable based on its type
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Non-retryable HTTP errors
  if (message.includes('400') || message.includes('bad request')) return false;
  if (message.includes('401') || message.includes('unauthorized')) return false;
  if (message.includes('403') || message.includes('forbidden')) return false;
  if (message.includes('404') || message.includes('not found')) return false;
  if (message.includes('405') || message.includes('method not allowed')) return false;
  if (message.includes('422') || message.includes('unprocessable')) return false;
  
  // Retryable network errors
  if (message.includes('fetch')) return true;
  if (message.includes('network')) return true;
  if (message.includes('timeout')) return true;
  if (message.includes('connection')) return true;
  if (message.includes('aborted')) return true;
  if (message.includes('rate') || message.includes('429')) return true;
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) return true;
  
  // Default to retryable for unknown errors
  return true;
}

interface NetworkAdaptationParams {
  quality: ConnectionQuality;
  rtt: number;
}

/**
 * Calculate network adaptation factor based on connection quality
 */
function getNetworkAdaptationFactor({ quality, rtt }: NetworkAdaptationParams): number {
  switch (quality) {
    case 'fast': 
      return rtt < 50 ? 0.5 : 0.8; // Reduce delays for very fast connections
    case 'moderate':
      return 1.0; // Use base delays
    case 'slow':
      return 1.5; // Increase delays by 50%
    case 'verySlow':
      return 2.5; // Increase delays by 150%
    case 'unknown':
    default:
      return 1.2; // Conservative increase
  }
}

/**
 * Hook for adaptive retry logic with network awareness
 */
export function useAdaptiveRetry(policy: NetworkRetryPolicy) {
  const networkStatus = useNetworkStatus();
  const [stats, setStats] = useState<RetryStats>({
    totalAttempts: 0,
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
  });
  
  // Track active retry operations to prevent memory leaks
  const activeRetries = useRef(new Set<string>());

  /**
   * Calculate retry delay based on strategy and network conditions
   */
  const calculateRetryDelay = useCallback((attemptNumber: number): number => {
    const { strategy, baseDelay, maxDelay, backoffMultiplier, adaptToNetwork } = policy;
    
    let delay: number;
    
    switch (strategy) {
      case 'immediate':
        delay = 0;
        break;
        
      case 'linear':
        delay = baseDelay + (attemptNumber * baseDelay);
        break;
        
      case 'exponential':
        delay = baseDelay * Math.pow(backoffMultiplier, attemptNumber);
        break;
        
      case 'adaptive':
        // Use exponential for fast connections, linear for slow ones
        if (networkStatus.connectionQuality === 'fast') {
          delay = baseDelay * Math.pow(1.5, attemptNumber);
        } else {
          delay = baseDelay + (attemptNumber * baseDelay * 1.5);
        }
        break;
        
      case 'none':
      default:
        delay = 0;
        break;
    }
    
    // Apply network adaptation if enabled
    if (adaptToNetwork && strategy !== 'none') {
      const adaptationFactor = getNetworkAdaptationFactor({
        quality: networkStatus.connectionQuality, 
        rtt: networkStatus.rtt
      });
      delay *= adaptationFactor;
      
      // Additional RTT-based adjustment
      if (networkStatus.rtt > 0) {
        delay += Math.min(networkStatus.rtt * 0.5, 1000); // Add up to 1s based on RTT
      }
    }
    
    // Ensure delay doesn't exceed maximum
    return Math.min(delay, maxDelay);
  }, [policy, networkStatus]);

  /**
   * Determine if a retry should be attempted
   */
  const shouldRetry = useCallback((attemptNumber: number, error: Error): boolean => {
    // Don't retry if we've hit the limit
    if (attemptNumber >= policy.maxRetries) {
      return false;
    }
    
    // Don't retry if offline (requests should be queued instead)
    if (!networkStatus.isOnline) {
      return false;
    }
    
    // Check if the error is retryable
    if (!isRetryableError(error)) {
      return false;
    }
    
    return true;
  }, [policy.maxRetries, networkStatus.isOnline]);

  /**
   * Execute an operation with retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    const operationId = Math.random().toString(36).substr(2, 9);
    activeRetries.current.add(operationId);
    
    let lastError: Error = new Error('Operation failed without specific error');
    let attemptNumber = 0;
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
    }));
    
    try {
      while (attemptNumber <= policy.maxRetries) {
        try {
          const result = await operation();
          
          // Success - update stats if this was a retry
          if (attemptNumber > 0) {
            setStats(prev => ({
              ...prev,
              successfulRetries: prev.successfulRetries + 1,
            }));
          }
          
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Check if we should retry
          if (!shouldRetry(attemptNumber, lastError)) {
            break;
          }
          
          // Calculate and wait for retry delay
          const delay = calculateRetryDelay(attemptNumber);
          
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          attemptNumber++;
          
          // Update retry stats
          setStats(prev => ({
            ...prev,
            totalRetries: prev.totalRetries + 1,
          }));
        }
      }
      
      // If we get here, all retries failed
      setStats(prev => ({
        ...prev,
        failedRetries: prev.failedRetries + 1,
      }));
      
      throw lastError;
    } finally {
      activeRetries.current.delete(operationId);
    }
  }, [policy, shouldRetry, calculateRetryDelay]);

  /**
   * Get current retry statistics
   */
  const getRetryStats = useCallback((): RetryStats => {
    return { ...stats };
  }, [stats]);

  /**
   * Reset retry statistics
   */
  const resetStats = useCallback(() => {
    setStats({
      totalAttempts: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
    });
  }, []);

  /**
   * Get current network-adjusted timeout for requests
   */
  const getAdjustedTimeout = useCallback((): number => {
    let timeout = policy.requestTimeout;
    
    if (policy.adaptToNetwork) {
      const adaptationFactor = getNetworkAdaptationFactor({
        quality: networkStatus.connectionQuality,
        rtt: networkStatus.rtt
      });
      timeout *= adaptationFactor;
      
      // Additional timeout for high RTT connections
      if (networkStatus.rtt > 200) {
        timeout += networkStatus.rtt * 10; // Add 10x RTT as buffer
      }
    }
    
    return Math.max(timeout, 1000); // Minimum 1 second timeout
  }, [policy, networkStatus]);

  return {
    calculateRetryDelay,
    shouldRetry,
    executeWithRetry,
    getRetryStats,
    resetStats,
    getAdjustedTimeout,
    networkStatus,
  };
}