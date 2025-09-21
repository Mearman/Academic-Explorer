/**
 * Enhanced Worker Types and Interfaces
 * Provides type-safe interfaces for the improved worker and event system
 * Based on ChatGPT document recommendations
 */

import type { EntityType, GraphNode, GraphEdge } from "@/lib/graph/types";
import type { ExpansionOptions } from "@/lib/entities";
import type { ExpansionSettings } from "@/lib/graph/types/expansion-settings";

// =============================================================================
// Base Worker Communication Types
// =============================================================================

export interface BaseWorkerRequest {
  type: string;
  requestId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface BaseWorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR" | "CANCELLED";
  requestId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface WorkerProgressResponse extends BaseWorkerResponse {
  type: "PROGRESS";
  progress: number; // 0-1
  currentStep: string;
  estimatedTimeRemaining?: number;
  partialResults?: unknown;
}

export interface WorkerSuccessResponse extends BaseWorkerResponse {
  type: "SUCCESS";
  result: unknown;
  statistics?: {
    duration: number;
    itemsProcessed: number;
    cacheHits?: number;
    apiCalls?: number;
  };
}

export interface WorkerErrorResponse extends BaseWorkerResponse {
  type: "ERROR";
  error: string;
  errorCode?: string;
  stack?: string;
  retryable?: boolean;
}

export interface WorkerCancelledResponse extends BaseWorkerResponse {
  type: "CANCELLED";
  reason?: string;
}

export type WorkerResponse =
  | WorkerProgressResponse
  | WorkerSuccessResponse
  | WorkerErrorResponse
  | WorkerCancelledResponse;

// =============================================================================
// Force Simulation Worker Types
// =============================================================================

export interface ForceSimulationNode {
  id: string;
  type?: EntityType;
  x?: number;
  y?: number;
  fx?: number | null; // Fixed position
  fy?: number | null;
  vx?: number; // Velocity
  vy?: number;
  index?: number; // D3 assigns this
}

export interface ForceSimulationLink {
  id: string;
  source: string | ForceSimulationNode;
  target: string | ForceSimulationNode;
  index?: number; // D3 assigns this
}

export interface ForceSimulationConfig {
  // Simulation parameters
  targetFPS?: number;
  maxIterations?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  seed?: number;

  // Force parameters
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centerStrength?: number;
  collisionRadius?: number;
  collisionStrength?: number;

  // Performance options
  sendEveryNTicks?: number;
  enableOptimizations?: boolean;
  batchUpdates?: boolean;
}

export interface ForceSimulationStartRequest extends BaseWorkerRequest {
  type: "FORCE_SIMULATION_START";
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: Set<string>;
}

export interface ForceSimulationUpdateRequest extends BaseWorkerRequest {
  type: "FORCE_SIMULATION_UPDATE_PARAMETERS";
  config: Partial<ForceSimulationConfig>;
}

export interface ForceSimulationControlRequest extends BaseWorkerRequest {
  type: "FORCE_SIMULATION_STOP" | "FORCE_SIMULATION_PAUSE" | "FORCE_SIMULATION_RESUME";
}

export type ForceSimulationRequest =
  | ForceSimulationStartRequest
  | ForceSimulationUpdateRequest
  | ForceSimulationControlRequest;

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export interface ForceSimulationProgressResponse extends WorkerProgressResponse {
  messageType?: "started" | "tick" | "paused" | "resumed" | "parameters_updated";
  positions?: NodePosition[];
  alpha?: number;
  iteration?: number;
  fps?: number;
  nodeCount?: number;
  linkCount?: number;
  config?: ForceSimulationConfig;
}

export interface ForceSimulationSuccessResponse extends WorkerSuccessResponse {
  result: {
    positions: NodePosition[];
    totalIterations: number;
    finalAlpha: number;
    reason: "converged" | "max-iterations" | "stopped";
  };
}

// =============================================================================
// Data Fetching Worker Types
// =============================================================================

export interface DataFetchRequest extends BaseWorkerRequest {
  type: "DATA_FETCH_EXPAND_NODE";
  nodeId: string;
  entityId: string;
  entityType: EntityType;
  options?: ExpansionOptions;
  expansionSettings?: ExpansionSettings;
  cacheStrategy?: "cache-first" | "network-first" | "cache-only" | "network-only";
}

export interface DataFetchCancelRequest extends BaseWorkerRequest {
  type: "DATA_FETCH_CANCEL";
  targetRequestId: string;
}

export type DataFetchingRequest = DataFetchRequest | DataFetchCancelRequest;

export interface DataFetchProgressResponse extends WorkerProgressResponse {
  nodeId: string;
  entityId: string;
  currentStep: "initializing" | "fetching" | "processing" | "expanding" | "finalizing";
  itemsProcessed?: number;
  totalItems?: number;
}

export interface DataFetchSuccessResponse extends WorkerSuccessResponse {
  result: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    sourceNodeId: string;
    entityId: string;
    statistics: {
      duration: number;
      nodesFetched: number;
      edgesFetched: number;
      apiCalls: number;
      cacheHits: number;
      expansionDepth: number;
    };
  };
}

// =============================================================================
// Worker Pool Types
// =============================================================================

export interface WorkerPoolOptions {
  maxWorkers?: number;
  workerFactory: () => Worker;
  taskTimeout?: number;
  maxRetries?: number;
  autoScale?: boolean;
  idleTimeout?: number; // Time before idle workers are terminated
}

export interface WorkerPoolTask<TRequest extends BaseWorkerRequest, TResponse extends BaseWorkerResponse> {
  id: string;
  request: TRequest;
  priority?: number;
  timeout?: number;
  retries?: number;
  onProgress?: (response: WorkerProgressResponse) => void;
  onSuccess?: (response: TResponse) => void;
  onError?: (error: WorkerErrorResponse) => void;
  onCancel?: (response: WorkerCancelledResponse) => void;
}

export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  totalErrors: number;
}

export interface WorkerInfo {
  id: string;
  status: "idle" | "busy" | "error" | "terminated";
  currentTask?: string;
  tasksCompleted: number;
  errors: number;
  lastActivity: number;
  worker: Worker;
}

// =============================================================================
// File Upload/Download Worker Types
// =============================================================================

export interface FileUploadRequest extends BaseWorkerRequest {
  type: "FILE_UPLOAD";
  file: File;
  uploadUrl: string;
  chunkSize?: number;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface FileDownloadRequest extends BaseWorkerRequest {
  type: "FILE_DOWNLOAD";
  downloadUrl: string;
  filename?: string;
  chunkSize?: number;
  headers?: Record<string, string>;
}

export interface FileProgressResponse extends WorkerProgressResponse {
  bytesTransferred: number;
  totalBytes: number;
  transferRate: number; // bytes per second
  estimatedTimeRemaining: number;
  currentChunk?: number;
  totalChunks?: number;
}

export interface FileUploadSuccessResponse extends WorkerSuccessResponse {
  result: {
    uploadedFileUrl: string;
    fileSize: number;
    uploadDuration: number;
    averageSpeed: number;
  };
}

export interface FileDownloadSuccessResponse extends WorkerSuccessResponse {
  result: {
    blob: Blob;
    filename: string;
    fileSize: number;
    downloadDuration: number;
    averageSpeed: number;
  };
}

// =============================================================================
// Cross-Context Communication Types
// =============================================================================

export interface CrossContextMessage<T = unknown> {
  type: "request" | "response" | "event" | "broadcast";
  eventType?: string;
  payload: T;
  messageId: string;
  requestId?: string; // For request-response patterns
  sourceContext: "main" | "worker";
  targetContext?: "main" | "worker" | "all";
  timestamp: number;
  priority?: number;
}

export interface WorkerEventBusMessage<T = unknown> extends CrossContextMessage<T> {
  type: "event";
  eventType: string;
}

export interface BroadcastMessage<T = unknown> extends CrossContextMessage<T> {
  type: "broadcast";
  channel?: string;
}

// =============================================================================
// Leader Election Types (for tab coordination)
// =============================================================================

export interface LeaderElectionOptions {
  lockName: string;
  heartbeatInterval?: number;
  leaderTimeout?: number;
  onBecomeLeader?: () => void;
  onLoseLeadership?: () => void;
}

export interface TabCoordinationMessage {
  type: "heartbeat" | "leader-announcement" | "task-request" | "task-response";
  tabId: string;
  isLeader?: boolean;
  timestamp: number;
  payload?: unknown;
}

export interface QueuedTask {
  id: string;
  type: string;
  payload: unknown;
  priority: number;
  requestingTabId: string;
  timestamp: number;
  timeout?: number;
}

// =============================================================================
// Worker Factory Types
// =============================================================================

export type WorkerType = "force-simulation" | "data-fetching" | "file-processing" | "generic";

export interface WorkerFactoryOptions {
  type: WorkerType;
  maxInstances?: number;
  sharedWorker?: boolean;
  offscreenCanvas?: boolean;
  enableTransfers?: boolean;
}

export interface WorkerCapabilities {
  supportsBroadcastChannel: boolean;
  supportsSharedArrayBuffer: boolean;
  supportsOffscreenCanvas: boolean;
  supportsTransferableStreams: boolean;
  maxWorkers: number;
  memoryLimit?: number;
}

// =============================================================================
// Event System Integration Types
// =============================================================================

export interface WorkerEventPayload {
  workerId: string;
  workerType: WorkerType;
  timestamp: number;
}

export interface WorkerReadyPayload extends WorkerEventPayload {
  capabilities: WorkerCapabilities;
}

export interface WorkerErrorPayload extends WorkerEventPayload {
  error: string;
  errorCode?: string;
  stack?: string;
  requestId?: string;
}

export interface WorkerTaskCompletePayload extends WorkerEventPayload {
  requestId: string;
  duration: number;
  success: boolean;
  result?: unknown;
  error?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export type WorkerRequestType<T extends BaseWorkerRequest> = T["type"];
export type WorkerResponseType<T extends BaseWorkerResponse> = T["type"];

export type ExtractRequestPayload<T extends BaseWorkerRequest> = Omit<T, keyof BaseWorkerRequest>;
export type ExtractResponsePayload<T extends BaseWorkerResponse> = Omit<T, keyof BaseWorkerResponse>;

// Type-safe request-response mapping
export interface WorkerRequestResponseMap {
  "FORCE_SIMULATION_START": ForceSimulationProgressResponse | ForceSimulationSuccessResponse;
  "FORCE_SIMULATION_UPDATE_PARAMETERS": ForceSimulationProgressResponse;
  "FORCE_SIMULATION_STOP": WorkerSuccessResponse;
  "FORCE_SIMULATION_PAUSE": WorkerSuccessResponse;
  "FORCE_SIMULATION_RESUME": WorkerSuccessResponse;
  "DATA_FETCH_EXPAND_NODE": DataFetchProgressResponse | DataFetchSuccessResponse;
  "DATA_FETCH_CANCEL": WorkerCancelledResponse;
  "FILE_UPLOAD": FileProgressResponse | FileUploadSuccessResponse;
  "FILE_DOWNLOAD": FileProgressResponse | FileDownloadSuccessResponse;
}

export type RequestResponseType<T extends keyof WorkerRequestResponseMap> = WorkerRequestResponseMap[T];

// =============================================================================
// Type Guards
// =============================================================================

export function isWorkerProgressResponse(response: WorkerResponse): response is WorkerProgressResponse {
  return response.type === "PROGRESS";
}

export function isWorkerSuccessResponse(response: WorkerResponse): response is WorkerSuccessResponse {
  return response.type === "SUCCESS";
}

export function isWorkerErrorResponse(response: WorkerResponse): response is WorkerErrorResponse {
  return response.type === "ERROR";
}

export function isWorkerCancelledResponse(response: WorkerResponse): response is WorkerCancelledResponse {
  return response.type === "CANCELLED";
}

export function isForceSimulationRequest(request: BaseWorkerRequest): request is ForceSimulationRequest {
  return request.type.startsWith("FORCE_SIMULATION_");
}

export function isDataFetchingRequest(request: BaseWorkerRequest): request is DataFetchingRequest {
  return request.type.startsWith("DATA_FETCH_");
}

export function isCrossContextMessage<T>(obj: unknown): obj is CrossContextMessage<T> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    "payload" in obj &&
    "messageId" in obj &&
    "sourceContext" in obj &&
    "timestamp" in obj
  );
}