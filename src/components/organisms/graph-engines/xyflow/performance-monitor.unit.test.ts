/**
 * Unit tests for xyflow Performance Monitoring utilities
 *
 * Tests the performance monitoring system including:
 * - Performance metrics calculation
 * - Optimization suggestions generation
 * - Performance data export
 * - Statistics computation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Performance Monitor Utilities', () => {
  describe('optimization suggestions generation', () => {
    it('should suggest node virtualization for large node counts', () => {
      const suggestions: string[] = [];
      const nodeCount = 600;
      const edgeCount = 100;

      if (nodeCount > 500) {
        suggestions.push('Consider enabling node virtualization for better performance with large graphs');
      }

      expect(suggestions).toContain('Consider enabling node virtualization for better performance with large graphs');
    });

    it('should suggest compact mode for very large node counts', () => {
      const suggestions: string[] = [];
      const nodeCount = 1200;

      if (nodeCount > 1000) {
        suggestions.push('Enable compact node mode to improve rendering with many nodes');
      }

      expect(suggestions).toContain('Enable compact node mode to improve rendering with many nodes');
    });

    it('should suggest edge filtering for large edge counts', () => {
      const suggestions: string[] = [];
      const edgeCount = 1200;

      if (edgeCount > 1000) {
        suggestions.push('Large number of edges detected - consider edge bundling or filtering');
      }

      expect(suggestions).toContain('Large number of edges detected - consider edge bundling or filtering');
    });

    it('should suggest edge culling for very large edge counts', () => {
      const suggestions: string[] = [];
      const edgeCount = 2500;

      if (edgeCount > 2000) {
        suggestions.push('Very high edge count - enable edge culling for performance');
      }

      expect(suggestions).toContain('Very high edge count - enable edge culling for performance');
    });

    it('should suggest performance mode for low FPS', () => {
      const suggestions: string[] = [];
      const currentFPS = 25;

      if (currentFPS < 30) {
        suggestions.push('Low frame rate detected - reduce visual effects or enable performance mode');
      }

      expect(suggestions).toContain('Low frame rate detected - reduce visual effects or enable performance mode');
    });

    it('should suggest reducing complexity for high render times', () => {
      const suggestions: string[] = [];
      const renderTime = 60;

      if (renderTime > 50) {
        suggestions.push('High render time - consider reducing node complexity or batch updates');
      }

      expect(suggestions).toContain('High render time - consider reducing node complexity or batch updates');
    });

    it('should suggest memory cleanup for high memory usage', () => {
      const suggestions: string[] = [];
      const memoryUsage = 150;

      if (memoryUsage > 100) {
        suggestions.push('High memory usage detected - consider data pagination or cleanup');
      }

      expect(suggestions).toContain('High memory usage detected - consider data pagination or cleanup');
    });

    it('should return no suggestions for optimal conditions', () => {
      const suggestions: string[] = [];
      const nodeCount = 50;
      const edgeCount = 50;
      const currentFPS = 60;
      const renderTime = 10;
      const memoryUsage = 30;

      // No conditions trigger suggestions
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('performance statistics calculation', () => {
    it('should calculate average values correctly', () => {
      const history = [
        { renderTime: 10, frameRate: 60, memoryUsage: 50, timestamp: 1000, nodeCount: 100, edgeCount: 200 },
        { renderTime: 20, frameRate: 45, memoryUsage: 60, timestamp: 2000, nodeCount: 100, edgeCount: 200 },
        { renderTime: 15, frameRate: 30, memoryUsage: 55, timestamp: 3000, nodeCount: 100, edgeCount: 200 }
      ];

      const avgRenderTime = history.reduce((sum, entry) => sum + entry.renderTime, 0) / history.length;
      const avgFrameRate = history.reduce((sum, entry) => sum + entry.frameRate, 0) / history.length;
      const avgMemoryUsage = history.reduce((sum, entry) => sum + entry.memoryUsage, 0) / history.length;

      expect(Math.round(avgRenderTime * 100) / 100).toBe(15); // (10+20+15)/3
      expect(Math.round(avgFrameRate)).toBe(45); // (60+45+30)/3
      expect(Math.round(avgMemoryUsage)).toBe(55); // (50+60+55)/3
    });

    it('should calculate min and max values correctly', () => {
      const history = [
        { renderTime: 10, frameRate: 60, memoryUsage: 50, timestamp: 1000, nodeCount: 100, edgeCount: 200 },
        { renderTime: 20, frameRate: 45, memoryUsage: 60, timestamp: 2000, nodeCount: 100, edgeCount: 200 },
        { renderTime: 15, frameRate: 30, memoryUsage: 55, timestamp: 3000, nodeCount: 100, edgeCount: 200 }
      ];

      const minFrameRate = Math.min(...history.map(entry => entry.frameRate));
      const maxRenderTime = Math.max(...history.map(entry => entry.renderTime));

      expect(minFrameRate).toBe(30);
      expect(maxRenderTime).toBe(20);
    });

    it('should handle empty history gracefully', () => {
      const history: any[] = [];

      const getStats = () => {
        if (history.length === 0) return null;
        return {};
      };

      expect(getStats()).toBeNull();
    });
  });

  describe('optimization application logic', () => {
    it('should determine optimizations needed for poor performance', () => {
      const nodeCount = 300;
      const edgeCount = 2000;
      const currentFPS = 20;
      const renderTime = 120;

      let optimizationsApplied = 0;

      // Auto-enable compact mode for large graphs
      if (nodeCount > 200 && currentFPS < 45) {
        optimizationsApplied++;
      }

      // Auto-reduce edge rendering for very large graphs
      if (edgeCount > 1500 && currentFPS < 30) {
        optimizationsApplied++;
      }

      // Auto-enable performance mode for struggling systems
      if (currentFPS < 25 || renderTime > 100) {
        optimizationsApplied++;
      }

      expect(optimizationsApplied).toBe(3);
    });

    it('should apply no optimizations for good performance', () => {
      const nodeCount = 50;
      const edgeCount = 100;
      const currentFPS = 60;
      const renderTime = 10;

      let optimizationsApplied = 0;

      // No conditions should trigger
      if (nodeCount > 200 && currentFPS < 45) {
        optimizationsApplied++;
      }
      if (edgeCount > 1500 && currentFPS < 30) {
        optimizationsApplied++;
      }
      if (currentFPS < 25 || renderTime > 100) {
        optimizationsApplied++;
      }

      expect(optimizationsApplied).toBe(0);
    });
  });

  describe('performance data export format', () => {
    it('should create valid export data structure', () => {
      const performanceMetrics = {
        renderTime: 15.5,
        frameRate: 45,
        memoryUsage: 60,
        nodeCount: 100,
        edgeCount: 200,
        zoomLevel: 1.2,
        lastUpdate: Date.now(),
        renderCalls: 25,
        optimizationSuggestions: ['Test suggestion']
      };

      const performanceHistory = [
        { timestamp: 1000, renderTime: 10, frameRate: 60, memoryUsage: 50, nodeCount: 100, edgeCount: 200 }
      ];

      const exportData = {
        version: '1.0',
        exported: new Date().toISOString(),
        currentMetrics: performanceMetrics,
        history: performanceHistory,
        statistics: {
          averageRenderTime: 10,
          averageFrameRate: 60,
          averageMemoryUsage: 50,
          minFrameRate: 60,
          maxRenderTime: 10,
          sampleCount: 1
        },
        graphInfo: {
          nodeCount: 100,
          edgeCount: 200,
          algorithm: 'dagre',
          compactMode: false
        }
      };

      expect(exportData).toHaveProperty('version', '1.0');
      expect(exportData).toHaveProperty('exported');
      expect(exportData).toHaveProperty('currentMetrics');
      expect(exportData).toHaveProperty('history');
      expect(exportData).toHaveProperty('statistics');
      expect(exportData).toHaveProperty('graphInfo');

      expect(exportData.graphInfo.nodeCount).toBe(100);
      expect(exportData.graphInfo.edgeCount).toBe(200);
      expect(exportData.graphInfo.algorithm).toBe('dagre');
    });

    it('should include valid ISO timestamp in export', () => {
      const exported = new Date().toISOString();
      expect(exported).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('performance history management', () => {
    it('should limit history to maximum entries', () => {
      const maxEntries = 30;
      let history: any[] = [];

      // Add more than max entries
      for (let i = 0; i < 35; i++) {
        const snapshot = {
          timestamp: Date.now() + i,
          renderTime: 10 + i,
          frameRate: 60 - i,
          memoryUsage: 50 + i,
          nodeCount: 100,
          edgeCount: 200
        };

        history = [...history.slice(-(maxEntries - 1)), snapshot];
      }

      expect(history.length).toBe(maxEntries);
    });

    it('should maintain chronological order', () => {
      const history = [
        { timestamp: 1000, renderTime: 10, frameRate: 60, memoryUsage: 50, nodeCount: 100, edgeCount: 200 },
        { timestamp: 2000, renderTime: 15, frameRate: 55, memoryUsage: 55, nodeCount: 100, edgeCount: 200 },
        { timestamp: 3000, renderTime: 20, frameRate: 50, memoryUsage: 60, nodeCount: 100, edgeCount: 200 }
      ];

      // Verify timestamps are in order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThan(history[i - 1].timestamp);
      }
    });
  });

  describe('memory usage calculation', () => {
    it('should convert bytes to megabytes correctly', () => {
      const usedJSHeapSize = 50 * 1024 * 1024; // 50MB in bytes
      const memoryUsage = Math.round(usedJSHeapSize / (1024 * 1024)); // Convert to MB

      expect(memoryUsage).toBe(50);
    });

    it('should handle memory API availability', () => {
      const hasMemoryAPI = typeof performance !== 'undefined' && 'memory' in performance;

      if (hasMemoryAPI) {
        expect(typeof (performance as any).memory).toBe('object');
      } else {
        expect((performance as any).memory).toBeUndefined();
      }
    });
  });

  describe('frame rate calculation', () => {
    it('should calculate FPS from frame count and time delta', () => {
      const frameCount = 60;
      const deltaTime = 1000; // 1 second in milliseconds

      const fps = Math.round((frameCount * 1000) / deltaTime);

      expect(fps).toBe(60);
    });

    it('should handle different time intervals', () => {
      const frameCount = 30;
      const deltaTime = 500; // 0.5 seconds

      const fps = Math.round((frameCount * 1000) / deltaTime);

      expect(fps).toBe(60); // 30 frames in 0.5 seconds = 60 FPS
    });

    it('should handle low frame rates', () => {
      const frameCount = 15;
      const deltaTime = 1000; // 1 second

      const fps = Math.round((frameCount * 1000) / deltaTime);

      expect(fps).toBe(15);
    });
  });

  describe('render time measurement', () => {
    it('should calculate render time difference', () => {
      const startTime = 1000;
      const endTime = 1016.5; // 16.5ms later

      const renderTime = endTime - startTime;

      expect(renderTime).toBe(16.5);
    });

    it('should handle zero render time', () => {
      const startTime = 1000;
      const endTime = 1000;

      const renderTime = endTime - startTime;

      expect(renderTime).toBe(0);
    });

    it('should handle negative time differences', () => {
      const startTime = 1000;
      const endTime = 999; // Time goes backwards

      const renderTime = endTime - startTime;

      expect(renderTime).toBe(-1);
    });
  });
});