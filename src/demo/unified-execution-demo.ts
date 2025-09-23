/**
 * Unified Execution Demo
 * Demonstrates the refactored background event and task system working with and without workers
 */

import { createLocalEventBus } from "@/lib/graph/events";
import { createExecutionStrategy, ExecutionMode } from "@/lib/graph/execution";
import { logger } from "@/lib/logger";
import type {
  ForceSimulationNode,
  ForceSimulationLink
} from "@/lib/graph/events/enhanced-worker-types";

// Demo data
const demoNodes: ForceSimulationNode[] = [
  { id: "node1", type: "authors", x: 0, y: 0 },
  { id: "node2", type: "works", x: 100, y: 100 },
  { id: "node3", type: "institutions", x: -50, y: 50 }
];

const demoLinks: ForceSimulationLink[] = [
  { id: "link1", source: "node1", target: "node2" },
  { id: "link2", source: "node2", target: "node3" }
];

/**
 * Demo function showing main thread execution
 */
export async function demoMainThreadExecution() {
  console.log("🧵 Starting Main Thread Execution Demo");

  const bus = createLocalEventBus();

  // Force main thread execution
  const strategy = await createExecutionStrategy(bus, {
    mode: ExecutionMode.MAIN_THREAD,
    maxConcurrency: 1
  });

  console.log(`✅ Strategy created: ${strategy.mode} (supports workers: ${strategy.supportsWorkers})`);

  // Set up event listeners
  const events: Array<{ type: string; payload?: unknown }> = [];

  bus.on("TASK_PROGRESS", (event) => {
    events.push(event);
    if (event.payload && typeof event.payload === "object" && "type" in event.payload) {
      const payload = event.payload;
      if (payload.type === "worker:force-simulation-progress") {
        console.log("📈 Progress:", payload);
      }
    }
  });

  bus.on("TASK_COMPLETED", (event) => {
    events.push(event);
    console.log("✅ Task completed:", event.payload);
  });

  bus.on("TASK_FAILED", (event) => {
    events.push(event);
    console.log("❌ Task failed:", event.payload);
  });

  try {
    // Submit a force simulation task
    const taskId = await strategy.submitTask({
      id: "demo-simulation",
      payload: {
        type: "FORCE_SIMULATION_START",
        nodes: demoNodes,
        links: demoLinks,
        pinnedNodes: ["node1"]
      },
      timeout: 5000
    });

    console.log(`📤 Submitted task: ${taskId}`);

    // Wait for task to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop the simulation
    await strategy.submitTask({
      id: "demo-stop",
      payload: {
        type: "FORCE_SIMULATION_STOP"
      }
    });

    console.log("🛑 Stop command sent");

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`📊 Final stats:`, strategy.getStats());
    console.log(`📝 Total events received: ${events.length}`);

  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    strategy.shutdown();
    bus.destroy();
  }

  console.log("🧵 Main Thread Execution Demo Complete\n");
}

/**
 * Demo function showing auto execution mode (will fallback to main thread in test env)
 */
export async function demoAutoExecution() {
  console.log("🔄 Starting Auto Execution Demo");

  const bus = createLocalEventBus();

  // Use auto mode - will detect best available execution strategy
  const strategy = await createExecutionStrategy(bus, {
    mode: ExecutionMode.AUTO,
    maxConcurrency: 2,
    workerModule: new URL("../workers/background.worker.ts", import.meta.url).href,
    enableWorkerFallback: true
  });

  console.log(`✅ Strategy created: ${strategy.mode} (supports workers: ${strategy.supportsWorkers})`);

  // Set up simple event tracking
  let progressCount = 0;
  let completionCount = 0;

  bus.on("TASK_PROGRESS", () => {
    progressCount++;
  });

  bus.on("TASK_COMPLETED", () => {
    completionCount++;
    console.log("✅ Task completed");
  });

  try {
    // Submit multiple tasks
    const task1 = await strategy.submitTask({
      id: "demo-sim-1",
      payload: {
        type: "FORCE_SIMULATION_START",
        nodes: demoNodes.slice(0, 2),
        links: demoLinks.slice(0, 1)
      }
    });

    const task2 = await strategy.submitTask({
      id: "demo-reheat",
      payload: {
        type: "FORCE_SIMULATION_REHEAT",
        nodes: demoNodes,
        links: demoLinks,
        alpha: 0.5
      }
    });

    console.log(`📤 Submitted tasks: ${task1}, ${task2}`);

    // Wait for tasks to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update simulation parameters
    await strategy.submitTask({
      id: "demo-update",
      payload: {
        type: "FORCE_SIMULATION_UPDATE_PARAMETERS",
        config: {
          linkStrength: 0.7,
          chargeStrength: -150
        }
      }
    });

    console.log("⚙️ Parameters updated");

    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`📊 Final stats:`, strategy.getStats());
    console.log(`📈 Progress events: ${progressCount}, Completions: ${completionCount}`);

  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    strategy.shutdown();
    bus.destroy();
  }

  console.log("🔄 Auto Execution Demo Complete\n");
}

/**
 * Demo function showing execution strategy comparison
 */
export async function demoExecutionComparison() {
  console.log("⚖️ Starting Execution Strategy Comparison");

  const results: Array<{
    mode: string;
    supportsWorkers: boolean;
    taskCount: number;
    duration: number;
  }> = [];

  // Test main thread execution
  for (const mode of [ExecutionMode.MAIN_THREAD, ExecutionMode.AUTO]) {
    const bus = createLocalEventBus();
    const startTime = Date.now();

    try {
      const strategy = await createExecutionStrategy(bus, {
        mode,
        maxConcurrency: 1,
        workerModule: new URL("../workers/background.worker.ts", import.meta.url).href
      });

      let taskCount = 0;
      bus.on("TASK_COMPLETED", () => { taskCount++; });

      // Run a simple simulation
      await strategy.submitTask({
        id: `comparison-${mode}`,
        payload: {
          type: "FORCE_SIMULATION_START",
          nodes: demoNodes,
          links: demoLinks
        }
      });

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;

      results.push({
        mode: strategy.mode,
        supportsWorkers: strategy.supportsWorkers,
        taskCount,
        duration
      });

      strategy.shutdown();
      bus.destroy();

    } catch (error) {
      console.error(`❌ Failed to test ${mode}:`, error);
    }
  }

  console.log("📊 Execution Strategy Comparison Results:");
  results.forEach((result, index) => {
    console.log(`  ${index + 1}. Mode: ${result.mode}`);
    console.log(`     Workers: ${result.supportsWorkers ? "Yes" : "No"}`);
    console.log(`     Tasks: ${result.taskCount}`);
    console.log(`     Duration: ${result.duration}ms`);
  });

  console.log("⚖️ Execution Strategy Comparison Complete\n");
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log("🚀 Starting Unified Execution System Demos\n");

  try {
    await demoMainThreadExecution();
    await demoAutoExecution();
    await demoExecutionComparison();

    console.log("🎉 All demos completed successfully!");
  } catch (error) {
    console.error("💥 Demo suite failed:", error);
  }
}

// Export for use in development
if (typeof window !== "undefined") {
  // Browser environment - attach to window for manual testing
  Object.assign(window, {
    demoMainThreadExecution,
    demoAutoExecution,
    demoExecutionComparison,
    runAllDemos
  });
}

// Node.js environment - run demos if this file is executed directly
if (typeof process !== "undefined" && process.argv && process.argv[1]?.endsWith("unified-execution-demo.ts")) {
  runAllDemos().catch(console.error);
}