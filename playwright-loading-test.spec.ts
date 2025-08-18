import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import { promisify } from 'util';

import { test, expect } from '@playwright/test';

// E2E tests to detect and debug the stuck loading issue
// These tests control their own dev server with dynamic port

const sleep = promisify(setTimeout);

// Find an available port
async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Start development server
async function startDevServer(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const devProcess = spawn('pnpm', ['dev', '--port', port.toString()], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    
    devProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('ready in')) {
        console.log(`[OK] Dev server started on port ${port}`);
        resolve(devProcess);
      }
    });

    devProcess.stderr.on('data', (data) => {
      console.log('Dev server stderr:', data.toString());
    });

    devProcess.on('error', (error) => {
      console.error('Failed to start dev server:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Dev server startup timeout'));
    }, 30000);
  });
}

test.describe('Query Page Loading Issues', () => {
  let devServer: ChildProcess;
  let baseURL: string;

  test.beforeAll(async () => {
    // Find available port and start dev server
    const port = await findAvailablePort(3000);
    baseURL = `http://localhost:${port}`;
    
    console.log(`[ROCKET] Starting dev server on port ${port}...`);
    devServer = await startDevServer(port);
    
    // Wait a bit more for server to be fully ready
    await sleep(3000);
  });

  test.afterAll(async () => {
    // Clean up dev server
    if (devServer) {
      console.log('[STOP] Stopping dev server...');
      devServer.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await sleep(2000);
      
      if (!devServer.killed) {
        devServer.kill('SIGKILL');
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    // Clear browser storage to ensure clean state
    await page.goto(baseURL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should not get stuck loading on query page', async ({ page }) => {
    console.log('[TEST] Testing query page loading...');
    
    // Navigate to query page
    await page.goto(`${baseURL}/query`);
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Check for any loading indicators
    const loadingElements = page.locator('[data-testid*="loading"], .loading, [aria-label*="loading"], text=/loading/i');
    
    // Wait for loading to complete (max 15 seconds)
    try {
      await expect(loadingElements).toHaveCount(0, { timeout: 15000 });
      console.log('[OK] Page loaded successfully');
    } catch (error) {
      console.log('[ERROR] Page appears to be stuck loading');
      
      // Debug information
      const loadingCount = await loadingElements.count();
      console.log(`Found ${loadingCount} loading indicators still visible`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-stuck-loading.png', fullPage: true });
      console.log('[CAMERA] Screenshot saved as debug-stuck-loading.png');
      
      throw error;
    }
    
    // Verify page is interactive
    await expect(page.locator('body')).toBeVisible();
    console.log('[OK] Page is interactive');
  });

  test('should handle search queries without hanging', async ({ page }) => {
    console.log('[TEST] Testing search functionality...');
    
    await page.goto(`${baseURL}/query`);
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="text"]').first();
    
    if (await searchInput.isVisible()) {
      console.log('[MEMO] Found search input, testing search...');
      
      // Perform search
      await searchInput.fill('machine learning');
      await searchInput.press('Enter');
      
      // Monitor for stuck loading
      const startTime = Date.now();
      let isStuck = false;
      
      // Check every 2 seconds for up to 20 seconds
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(2000);
        
        const loadingElements = await page.locator('[data-testid*="loading"], .loading, text=/loading/i').count();
        const elapsedTime = Date.now() - startTime;
        
        console.log(`[TIMER]  ${elapsedTime}ms: ${loadingElements} loading elements visible`);
        
        if (loadingElements === 0) {
          console.log('[OK] Search completed successfully');
          break;
        }
        
        if (elapsedTime > 15000) {
          isStuck = true;
          break;
        }
      }
      
      if (isStuck) {
        console.log('[ERROR] Search appears to be stuck');
        await page.screenshot({ path: 'debug-search-stuck.png', fullPage: true });
        
        // Get network requests for debugging
        const responses = await page.evaluate(() => {
          return performance.getEntriesByType('navigation').concat(
            performance.getEntriesByType('resource')
          ).map(entry => ({
            name: entry.name,
            duration: entry.duration,
            responseEnd: entry.responseEnd
          }));
        });
        
        console.log('[GLOBE] Network requests:', responses.slice(-5)); // Last 5 requests
        
        throw new Error('Search functionality appears to be stuck loading');
      }
    } else {
      console.log('[INFO]  No search input found, checking page state...');
    }
  });

  test('should detect zero results bug in query history', async ({ page }) => {
    console.log('[TEST] Testing for zero results bug...');
    
    // Enable console logging to catch our debug logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.goto(`${baseURL}/query?q=deep+learning`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for search to complete
    await page.waitForTimeout(3000);
    
    // Check localStorage for query history
    const queryHistory = await page.evaluate(() => {
      const storage = localStorage.getItem('academic-explorer-storage');
      if (!storage) return null;
      
      try {
        const parsed = JSON.parse(storage);
        return parsed.state?.queryHistory || parsed.queryHistory;
      } catch {
        return null;
      }
    });
    
    console.log('[CHART] Query history entries:', queryHistory?.length || 0);
    
    if (queryHistory && queryHistory.length > 0) {
      const latestQuery = queryHistory[0];
      console.log('[CHART_UP] Latest query results:', latestQuery.results);
      
      // Check for the zero results bug
      if (latestQuery.results) {
        const { count, responseTimeMs } = latestQuery.results;
        console.log(`[SEARCH] Query: "${latestQuery.query}" -> Count: ${count}, Response time: ${responseTimeMs}ms`);
        
        // Look for our debug console logs
        const relevantLogs = consoleLogs.filter(log => 
          log.includes('Query response') || 
          log.includes('meta') ||
          log.includes('count')
        );
        
        if (relevantLogs.length > 0) {
          console.log('[BUG] Debug logs found:');
          relevantLogs.forEach(log => console.log(`   ${log}`));
        }
        
        // If count is 0 but we have a real search query, this might be the bug
        if (count === 0 && latestQuery.query && latestQuery.query.trim() !== '') {
          console.log('[BUG] POTENTIAL ZERO RESULTS BUG DETECTED!');
          console.log(`   Query: "${latestQuery.query}" shows 0 results`);
          console.log('   This might be the bug where API returns count but query history shows 0');
          
          // Take screenshot for evidence
          await page.screenshot({ path: 'debug-zero-results-bug.png', fullPage: true });
        } else if (count > 0) {
          console.log('[OK] Query results count appears correct');
        }
      }
    } else {
      console.log('[INFO]  No query history found');
    }
  });

  test('should monitor page performance and memory usage', async ({ page }) => {
    console.log('[TEST] Testing page performance...');
    
    await page.goto(`${baseURL}/query`);
    
    // Start performance monitoring
    await page.evaluate(() => {
      interface WindowWithPerformanceData extends Window {
        performanceData: {
          startTime: number;
          initialMemory: number | null;
        };
      }
      
      interface PerformanceWithMemory extends Performance {
        memory?: {
          usedJSHeapSize: number;
        };
      }
      
      (window as WindowWithPerformanceData).performanceData = {
        startTime: performance.now(),
        initialMemory: (performance as PerformanceWithMemory).memory ? (performance as PerformanceWithMemory).memory.usedJSHeapSize : null
      };
    });
    
    await page.waitForLoadState('networkidle');
    
    // Perform multiple searches to stress test
    const searchInput = page.locator('input[type="text"]').first();
    
    if (await searchInput.isVisible()) {
      const testQueries = ['AI', 'machine learning', 'neural networks', 'deep learning'];
      
      for (const query of testQueries) {
        console.log(`[SEARCH] Testing query: "${query}"`);
        
        await searchInput.fill(query);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000); // Wait for each search
        
        // Check if page is still responsive
        const isResponsive = await page.evaluate(() => {
          // Simple responsiveness test
          const startTime = performance.now();
          for (let i = 0; i < 100000; i++) {
            Math.random();
          }
          return (performance.now() - startTime) < 100; // Should be fast
        });
        
        if (!isResponsive) {
          console.log(`[ERROR] Page became unresponsive during query: "${query}"`);
          await page.screenshot({ path: `debug-unresponsive-${query.replace(/\s+/g, '-')}.png` });
        }
      }
    }
    
    // Get final performance data
    const performanceData = await page.evaluate(() => {
      interface WindowWithPerformanceData extends Window {
        performanceData: {
          startTime: number;
          initialMemory: number | null;
        };
      }
      
      interface PerformanceWithMemory extends Performance {
        memory?: {
          usedJSHeapSize: number;
        };
      }
      
      const data = (window as WindowWithPerformanceData).performanceData;
      const endTime = performance.now();
      const endMemory = (performance as PerformanceWithMemory).memory ? (performance as PerformanceWithMemory).memory.usedJSHeapSize : null;
      
      return {
        totalTime: endTime - data.startTime,
        memoryIncrease: endMemory && data.initialMemory ? endMemory - data.initialMemory : null,
        loadingTime: endTime
      };
    });
    
    console.log('[CHART] Performance metrics:');
    console.log(`   Total test time: ${performanceData.totalTime.toFixed(2)}ms`);
    if (performanceData.memoryIncrease !== null) {
      console.log(`   Memory increase: ${(performanceData.memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Check for performance issues
    if (performanceData.totalTime > 30000) { // 30 seconds
      console.log('[WARNING]  Test took longer than expected - possible performance issue');
    }
    
    if (performanceData.memoryIncrease && performanceData.memoryIncrease > 50 * 1024 * 1024) { // 50MB
      console.log('[WARNING]  Significant memory increase detected - possible memory leak');
    }
  });

  test('should test navigation and routing performance', async ({ page }) => {
    console.log('[TEST] Testing navigation performance...');
    
    const navigationTimes: number[] = [];
    
    // Test multiple page navigations
    const routes = [
      `${baseURL}/`,
      `${baseURL}/query`,
      `${baseURL}/query?q=test`,
      `${baseURL}/query?q=machine+learning`,
    ];
    
    for (const route of routes) {
      const startTime = Date.now();
      
      try {
        await page.goto(route, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        navigationTimes.push(loadTime);
        
        console.log(`[OK] ${route} loaded in ${loadTime}ms`);
        
        if (loadTime > 8000) {
          console.log(`[WARNING]  Slow loading detected for ${route}`);
          await page.screenshot({ path: `debug-slow-${route.split('/').pop() || 'root'}.png` });
        }
        
      } catch (error) {
        console.log(`[ERROR] Failed to load ${route}: ${error}`);
        await page.screenshot({ path: `debug-failed-${route.split('/').pop() || 'root'}.png` });
        throw error;
      }
    }
    
    const averageLoadTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    console.log(`[CHART] Average navigation time: ${averageLoadTime.toFixed(2)}ms`);
    
    if (averageLoadTime > 5000) {
      console.log('[WARNING]  Overall navigation performance is slow');
    }
  });
});