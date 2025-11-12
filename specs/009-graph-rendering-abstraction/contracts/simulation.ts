/**
 * Simulation Engine Contract
 *
 * Defines TypeScript interfaces for the physics simulation engine that applies
 * forces and updates node positions over time. This is a contract definition
 * only - no implementations.
 *
 * @module simulation
 * @see data-model.md Section 5: Simulation<TNode, TEdge>
 */

import type { Node } from './core-types';
import type { Edge } from './core-types';

/**
 * Simulation lifecycle state.
 *
 * State transitions:
 * - stopped -> running (via start())
 * - running -> paused (via pause())
 * - paused -> running (via resume())
 * - running -> stopped (via stop() or when alpha < alphaMin)
 * - paused -> stopped (via stop())
 */
export type SimulationState = 'running' | 'paused' | 'stopped';

/**
 * Configuration parameters for the simulation engine.
 *
 * Controls the physics behavior and convergence rate of the simulation.
 */
export interface SimulationConfig {
  /**
   * Cooling parameter that decreases over time from 1.0 to alphaMin.
   * Multiplied with forces to gradually reduce their effect.
   *
   * @default 1.0
   * @range [0, 1]
   */
  alpha: number;

  /**
   * Target alpha value. When alpha falls below this threshold,
   * the simulation stops automatically.
   *
   * @default 0.001
   * @range (0, 1)
   */
  alphaMin: number;

  /**
   * Rate at which alpha decays per tick.
   * Formula: alpha += (alphaMin - alpha) * alphaDecay
   *
   * Higher values = faster convergence but less stable.
   * Default value results in ~300 iterations to convergence.
   *
   * @default 0.0228
   * @range (0, 1)
   */
  alphaDecay: number;

  /**
   * Velocity friction coefficient applied each tick.
   * Formula: velocity *= velocityDecay
   *
   * Lower values = higher friction = faster damping.
   *
   * @default 0.6
   * @range (0, 1)
   */
  velocityDecay: number;
}

/**
 * Function signature for applying forces to nodes based on graph structure.
 *
 * Forces mutate the node.fx and node.fy force accumulators, which are later
 * integrated into velocity and position updates by the simulation engine.
 *
 * @template TNode - Node type with custom data
 * @template TEdge - Edge type with custom data
 *
 * @param nodes - Array of nodes to apply forces to
 * @param edges - Array of edges (for edge-based forces like springs)
 * @param alpha - Current cooling parameter [0, 1]
 *
 * @example
 * ```typescript
 * const repulsionForce: ForceFunction<Node, Edge> = (nodes, edges, alpha) => {
 *   const strength = -30;
 *   for (let i = 0; i < nodes.length; i++) {
 *     for (let j = i + 1; j < nodes.length; j++) {
 *       const dx = nodes[j].x - nodes[i].x;
 *       const dy = nodes[j].y - nodes[i].y;
 *       const distance = Math.sqrt(dx * dx + dy * dy) || 1;
 *       const force = (strength * alpha) / (distance * distance);
 *
 *       nodes[i].fx -= (dx / distance) * force;
 *       nodes[i].fy -= (dy / distance) * force;
 *       nodes[j].fx += (dx / distance) * force;
 *       nodes[j].fy += (dy / distance) * force;
 *     }
 *   }
 * };
 * ```
 */
export type ForceFunction<TNode extends Node, TEdge extends Edge> = (
  nodes: TNode[],
  edges: TEdge[],
  alpha: number
) => void;

/**
 * Event types emitted by the simulation engine.
 */
export type SimulationEvent = 'tick' | 'end';

/**
 * Event handler signature for simulation events.
 *
 * @param event - The simulation event that occurred
 */
export type SimulationEventHandler = () => void;

/**
 * Physics simulation engine that applies forces and updates node positions.
 *
 * The simulation operates in discrete time steps (ticks), where each tick:
 * 1. Applies all registered forces to accumulate fx/fy on nodes
 * 2. Integrates forces into velocity: vx += fx, vy += fy
 * 3. Applies velocity decay: vx *= velocityDecay, vy *= velocityDecay
 * 4. Updates positions: x += vx, y += vy
 * 5. Decreases alpha: alpha += (alphaMin - alpha) * alphaDecay
 * 6. Emits 'tick' event
 * 7. Stops if alpha < alphaMin and emits 'end' event
 *
 * @template TNode - Node type extending base Node interface
 * @template TEdge - Edge type extending base Edge interface
 *
 * @example
 * ```typescript
 * const simulation = createSimulation<AcademicNode, Edge>({
 *   alpha: 1.0,
 *   alphaMin: 0.001,
 *   alphaDecay: 0.0228,
 *   velocityDecay: 0.6
 * });
 *
 * simulation.addForce(repulsionForce);
 * simulation.addForce(linkForce);
 * simulation.addForce(centeringForce);
 *
 * simulation.on('tick', () => {
 *   renderer.render(graph);
 * });
 *
 * simulation.on('end', () => {
 *   console.log('Simulation converged');
 * });
 *
 * simulation.start();
 * ```
 */
export interface Simulation<TNode extends Node, TEdge extends Edge> {
  /**
   * Current lifecycle state of the simulation.
   *
   * @readonly Use lifecycle methods (start, stop, pause, resume) to change state
   */
  readonly state: SimulationState;

  /**
   * Current cooling parameter value.
   * Decreases from 1.0 to alphaMin over time.
   *
   * @readonly Use setAlpha() to modify
   */
  readonly alpha: number;

  /**
   * Start the simulation from stopped state.
   *
   * - Sets state to 'running'
   * - Resets alpha to 1.0
   * - Begins tick loop (typically via requestAnimationFrame or Web Worker)
   *
   * @throws {Error} If simulation is already running
   */
  start(): void;

  /**
   * Stop the simulation and reset to initial state.
   *
   * - Sets state to 'stopped'
   * - Resets alpha to 1.0
   * - Halts tick loop
   *
   * Can be called from any state (running, paused, stopped).
   */
  stop(): void;

  /**
   * Pause the simulation without resetting alpha.
   *
   * - Sets state to 'paused'
   * - Preserves current alpha value
   * - Suspends tick loop
   *
   * @throws {Error} If simulation is not running
   */
  pause(): void;

  /**
   * Resume the simulation from paused state.
   *
   * - Sets state to 'running'
   * - Continues with preserved alpha value
   * - Restarts tick loop
   *
   * @throws {Error} If simulation is not paused
   */
  resume(): void;

  /**
   * Execute one simulation step.
   *
   * Called automatically by the simulation loop (via RAF or worker).
   * Can also be called manually for single-step execution.
   *
   * Each tick:
   * 1. Applies all forces to accumulate fx/fy
   * 2. Integrates forces into velocity
   * 3. Applies velocity decay
   * 4. Updates positions from velocity
   * 5. Decreases alpha
   * 6. Emits 'tick' event
   * 7. Stops if alpha < alphaMin
   *
   * @param dt - Optional time delta in seconds (for variable timestep)
   *             If omitted, uses fixed timestep (1/60 second)
   */
  tick(dt?: number): void;

  /**
   * Register a force function to be applied during each tick.
   *
   * Forces are applied in the order they were added.
   *
   * @param force - Force function to apply
   *
   * @example
   * ```typescript
   * const customForce: ForceFunction<Node, Edge> = (nodes, edges, alpha) => {
   *   // Custom force logic
   * };
   * simulation.addForce(customForce);
   * ```
   */
  addForce(force: ForceFunction<TNode, TEdge>): void;

  /**
   * Unregister a force function.
   *
   * @param force - Force function to remove (must be same reference as added)
   * @returns true if force was found and removed, false otherwise
   */
  removeForce(force: ForceFunction<TNode, TEdge>): boolean;

  /**
   * Set the alpha decay rate.
   *
   * Higher values = faster convergence but less stable.
   *
   * @param value - New alpha decay rate
   * @throws {Error} If value is not in range (0, 1)
   */
  setAlphaDecay(value: number): void;

  /**
   * Set the velocity decay (friction) coefficient.
   *
   * Lower values = higher friction = faster damping.
   *
   * @param value - New velocity decay rate
   * @throws {Error} If value is not in range (0, 1)
   */
  setVelocityDecay(value: number): void;

  /**
   * Set the current alpha value.
   *
   * Useful for reheating the simulation after graph changes.
   *
   * @param value - New alpha value
   * @throws {Error} If value is not in range [0, 1]
   *
   * @example
   * ```typescript
   * // Reheat simulation after adding new nodes
   * simulation.setAlpha(0.3);
   * simulation.start();
   * ```
   */
  setAlpha(value: number): void;

  /**
   * Register an event handler for simulation events.
   *
   * @param event - Event type to listen for
   * @param handler - Callback function to execute when event fires
   *
   * @example
   * ```typescript
   * simulation.on('tick', () => {
   *   console.log('Current alpha:', simulation.alpha);
   * });
   *
   * simulation.on('end', () => {
   *   console.log('Simulation converged');
   * });
   * ```
   */
  on(event: SimulationEvent, handler: SimulationEventHandler): void;

  /**
   * Unregister an event handler.
   *
   * @param event - Event type
   * @param handler - Handler to remove (must be same reference as registered)
   * @returns true if handler was found and removed, false otherwise
   */
  off(event: SimulationEvent, handler: SimulationEventHandler): boolean;
}
