/**
 * Test Performance Monitoring Dashboard
 * Tracks test execution metrics and provides optimization insights
 */

import { beforeAll, afterAll } from 'vitest';

interface TestMetrics {
  testName: string;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: number;
}

interface PerformanceStats {
  totalTests: number;
  averageTestTime: number;
  slowestTests: TestMetrics[];
  memoryLeaks: TestMetrics[];
  totalDuration: number;
  startTime: number;
}

class TestPerformanceMonitor {
  private metrics: TestMetrics[] = [];
  private startTime = Date.now();
  
  recordTest(testName: string, duration: number): void {
    // Only record if performance monitoring is enabled
    if (process.env.VITEST_PERFORMANCE_MONITOR !== 'true') return;
    
    const memoryUsage = process.memoryUsage();
    
    this.metrics.push({
      testName,
      duration,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
      timestamp: Date.now(),
    });
  }
  
  getStats(): PerformanceStats {
    const totalTests = this.metrics.length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageTestTime = totalTests > 0 ? totalDuration / totalTests : 0;
    
    // Find slowest tests (top 5)
    const slowestTests = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    // Detect potential memory leaks (tests using >100MB heap)
    const memoryLeaks = this.metrics.filter(m => m.memoryUsage.heapUsed > 100);
    
    return {
      totalTests,
      averageTestTime,
      slowestTests,
      memoryLeaks,
      totalDuration,
      startTime: this.startTime,
    };
  }
  
  printSummary(): void {
    if (process.env.VITEST_PERFORMANCE_MONITOR !== 'true') return;
    
    const stats = this.getStats();
    const sessionDuration = Date.now() - stats.startTime;
    
    console.log('\n🚀 Test Performance Summary');
    console.log('=============================');
    console.log(`Total Tests: ${stats.totalTests}`);
    console.log(`Session Duration: ${Math.round(sessionDuration / 1000)}s`);
    console.log(`Average Test Time: ${Math.round(stats.averageTestTime)}ms`);
    console.log(`Total Test Time: ${Math.round(stats.totalDuration / 1000)}s`);
    
    if (stats.slowestTests.length > 0) {
      console.log('\n⚠️  Slowest Tests:');
      stats.slowestTests.forEach((test, i) => {
        console.log(`  ${i + 1}. ${test.testName}: ${test.duration}ms`);
      });
    }
    
    if (stats.memoryLeaks.length > 0) {
      console.log('\n🔴 Potential Memory Issues:');
      stats.memoryLeaks.forEach(test => {
        console.log(`  ${test.testName}: ${test.memoryUsage.heapUsed}MB heap`);
      });
    }
    
    // Performance recommendations
    const recommendations = this.getRecommendations(stats);
    if (recommendations.length > 0) {
      console.log('\n💡 Performance Recommendations:');
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }
  
  private getRecommendations(stats: PerformanceStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.averageTestTime > 1000) {
      recommendations.push('Consider breaking down slow tests into smaller units');
    }
    
    if (stats.memoryLeaks.length > 0) {
      recommendations.push('Review memory-intensive tests for cleanup issues');
    }
    
    if (stats.slowestTests.length > 0 && stats.slowestTests[0].duration > 5000) {
      recommendations.push('Optimize or skip the slowest tests during development');
    }
    
    return recommendations;
  }
  
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }
}

// Global performance monitor instance
export const performanceMonitor = new TestPerformanceMonitor();

// Auto-setup for test environments
if (typeof global !== 'undefined' && process.env.NODE_ENV === 'test') {
  // Register global hooks for automatic monitoring
  if (typeof beforeAll !== 'undefined') {
    beforeAll(() => {
      performanceMonitor.reset();
    });
  }
  
  if (typeof afterAll !== 'undefined') {
    afterAll(() => {
      performanceMonitor.printSummary();
    });
  }
}

// Helper function for manual test timing
export function withPerformanceTracking<T>(
  testName: string,
  testFn: () => T | Promise<T>
): () => Promise<T> {
  return async () => {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      performanceMonitor.recordTest(testName, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordTest(`${testName} (FAILED)`, duration);
      throw error;
    }
  };
}

// Export types for external usage
export type { TestMetrics, PerformanceStats };