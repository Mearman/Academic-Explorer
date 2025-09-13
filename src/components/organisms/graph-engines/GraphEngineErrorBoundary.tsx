import React, { Component, ErrorInfo, ReactNode } from 'react';

import { useEngineCapabilities } from './hooks/useEngineCapabilities';
import { useGraphEngine } from './hooks/useGraphEngine';
import type { GraphEngineType } from './provider';
import {
  engineError,
  errorIcon,
  errorTitle,
  errorMessage,
  errorActions,
  errorButton,
} from './transitions.css';

// ============================================================================
// Error Types
// ============================================================================

export enum GraphEngineErrorType {
  INITIALIZATION_ERROR = 'initialization_error',
  RENDERING_ERROR = 'rendering_error',
  DATA_LOADING_ERROR = 'data_loading_error',
  MEMORY_ERROR = 'memory_error',
  PERFORMANCE_ERROR = 'performance_error',
  COMPATIBILITY_ERROR = 'compatibility_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export interface GraphEngineError {
  type: GraphEngineErrorType;
  message: string;
  originalError?: Error;
  engineType: GraphEngineType;
  timestamp: Date;
  recoverable: boolean;
  suggestedActions: string[];
  alternativeEngines?: GraphEngineType[];
}

// ============================================================================
// Error Classification
// ============================================================================

export function classifyEngineError(
  error: Error,
  engineType: GraphEngineType,
  context?: string
): GraphEngineError {
  const timestamp = new Date();
  let type = GraphEngineErrorType.UNKNOWN_ERROR;
  let recoverable = true;
  let suggestedActions: string[] = [];
  let alternativeEngines: GraphEngineType[] = [];
  
  const errorMessage = error.message.toLowerCase();
  
  // Classify error type based on message patterns
  if (errorMessage.includes('webgl') || errorMessage.includes('hardware acceleration')) {
    type = GraphEngineErrorType.COMPATIBILITY_ERROR;
    suggestedActions = [
      'Switch to Canvas 2D engine',
      'Check browser WebGL support',
      'Update graphics drivers',
    ];
    alternativeEngines = ['canvas-2d', 'svg'];
  } else if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
    type = GraphEngineErrorType.MEMORY_ERROR;
    suggestedActions = [
      'Reduce graph size',
      'Switch to more memory-efficient engine',
      'Clear browser cache',
    ];
    alternativeEngines = ['canvas-2d', 'webgl'];
  } else if (errorMessage.includes('performance') || errorMessage.includes('timeout')) {
    type = GraphEngineErrorType.PERFORMANCE_ERROR;
    suggestedActions = [
      'Switch to high-performance engine',
      'Reduce graph complexity',
      'Enable auto-optimisation',
    ];
    alternativeEngines = ['webgl', 'canvas-2d'];
  } else if (errorMessage.includes('render') || errorMessage.includes('canvas') || errorMessage.includes('svg')) {
    type = GraphEngineErrorType.RENDERING_ERROR;
    suggestedActions = [
      'Try different rendering engine',
      'Check browser compatibility',
      'Refresh the page',
    ];
    alternativeEngines = getAlternativeEngines(engineType);
  } else if (errorMessage.includes('data') || errorMessage.includes('load')) {
    type = GraphEngineErrorType.DATA_LOADING_ERROR;
    suggestedActions = [
      'Reload graph data',
      'Check data format',
      'Try different engine',
    ];
  } else if (context === 'initialization') {
    type = GraphEngineErrorType.INITIALIZATION_ERROR;
    suggestedActions = [
      'Try alternative engine',
      'Refresh the page',
      'Check browser support',
    ];
    alternativeEngines = getAlternativeEngines(engineType);
  }
  
  // Determine if error is recoverable
  if (type === GraphEngineErrorType.COMPATIBILITY_ERROR && alternativeEngines.length === 0) {
    recoverable = false;
    suggestedActions = ['Browser not supported', 'Try different browser'];
  }
  
  return {
    type,
    message: error.message,
    originalError: error,
    engineType,
    timestamp,
    recoverable,
    suggestedActions,
    alternativeEngines,
  };
}

function getAlternativeEngines(currentEngine: GraphEngineType): GraphEngineType[] {
  const alternatives: Record<GraphEngineType, GraphEngineType[]> = {
    'webgl': ['xyflow', 'canvas-2d', 'd3-force', 'cytoscape'],
    'canvas-2d': ['xyflow', 'd3-force', 'cytoscape', 'vis-network'],
    'svg': ['xyflow', 'canvas-2d', 'd3-force', 'cytoscape'],
    'd3-force': ['xyflow', 'canvas-2d', 'cytoscape', 'vis-network'],
    'cytoscape': ['xyflow', 'canvas-2d', 'vis-network', 'd3-force'],
    'vis-network': ['xyflow', 'cytoscape', 'canvas-2d', 'd3-force'],
    'xyflow': ['d3-force', 'canvas-2d', 'cytoscape', 'vis-network'],
  };
  
  return alternatives[currentEngine] || ['canvas-2d'];
}

// ============================================================================
// Error Boundary Component
// ============================================================================

interface GraphEngineErrorBoundaryState {
  hasError: boolean;
  error: GraphEngineError | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  recoveryAttempts: number;
}

interface GraphEngineErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: React.ComponentType<{
    error: GraphEngineError;
    retry: () => void;
    switchEngine: (engine: GraphEngineType) => void;
    isRecovering: boolean;
  }>;
  /** Maximum number of automatic recovery attempts */
  maxRecoveryAttempts?: number;
  /** Whether to attempt automatic recovery */
  autoRecover?: boolean;
  /** Callback when error occurs */
  onError?: (error: GraphEngineError) => void;
  /** Callback when recovery is attempted */
  onRecovery?: (engine: GraphEngineType) => void;
}

export class GraphEngineErrorBoundary extends Component<
  GraphEngineErrorBoundaryProps,
  GraphEngineErrorBoundaryState
> {
  private currentEngine: GraphEngineType = 'canvas-2d';
  
  constructor(props: GraphEngineErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
    };
  }
  
  static getDerivedStateFromError(_error: Error): Partial<GraphEngineErrorBoundaryState> {
    return {
      hasError: true,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const graphEngineError = classifyEngineError(error, this.currentEngine, 'rendering');
    
    this.setState({
      error: graphEngineError,
      errorInfo,
    });
    
    // Notify parent component
    this.props.onError?.(graphEngineError);
    
    // Log error for debugging
    console.error('Graph Engine Error Boundary caught error:', {
      error: graphEngineError,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
    
    // Attempt automatic recovery if enabled and error is recoverable
    if (
      this.props.autoRecover &&
      graphEngineError.recoverable &&
      this.state.recoveryAttempts < (this.props.maxRecoveryAttempts || 3) &&
      graphEngineError.alternativeEngines &&
      graphEngineError.alternativeEngines.length > 0
    ) {
      this.attemptRecovery();
    }
  }
  
  private attemptRecovery = async () => {
    const { error } = this.state;
    if (!error || !error.alternativeEngines || error.alternativeEngines.length === 0) {
      return;
    }
    
    this.setState({
      isRecovering: true,
      recoveryAttempts: this.state.recoveryAttempts + 1,
    });
    
    // Try the first alternative engine
    const alternativeEngine = error.alternativeEngines[0];
    
    try {
      // Simulate engine switch delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.props.onRecovery?.(alternativeEngine);
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false,
      });
      
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      this.setState({
        isRecovering: false,
      });
    }
  };
  
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryAttempts: 0,
    });
  };
  
  private handleEngineSwitch = (engineType: GraphEngineType) => {
    this.currentEngine = engineType;
    this.handleRetry();
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.handleRetry}
            switchEngine={this.handleEngineSwitch}
            isRecovering={this.state.isRecovering}
          />
        );
      }
      
      return (
        <DefaultErrorFallback
          error={this.state.error}
          retry={this.handleRetry}
          switchEngine={this.handleEngineSwitch}
          isRecovering={this.state.isRecovering}
        />
      );
    }
    
    return this.props.children;
  }
}

// ============================================================================
// Default Error Fallback Component
// ============================================================================

interface DefaultErrorFallbackProps {
  error: GraphEngineError;
  retry: () => void;
  switchEngine: (engine: GraphEngineType) => void;
  isRecovering: boolean;
}

function DefaultErrorFallback({
  error,
  retry,
  switchEngine,
  isRecovering,
}: DefaultErrorFallbackProps) {
  const getErrorIcon = (errorType: GraphEngineErrorType): string => {
    switch (errorType) {
      case GraphEngineErrorType.MEMORY_ERROR:
        return 'MEM';
      case GraphEngineErrorType.PERFORMANCE_ERROR:
        return 'PERF';
      case GraphEngineErrorType.COMPATIBILITY_ERROR:
        return 'COMPAT';
      case GraphEngineErrorType.RENDERING_ERROR:
        return 'RENDER';
      case GraphEngineErrorType.DATA_LOADING_ERROR:
        return 'DATA';
      case GraphEngineErrorType.INITIALIZATION_ERROR:
        return 'INIT';
      default:
        return 'ERROR';
    }
  };
  
  const getErrorTitle = (errorType: GraphEngineErrorType): string => {
    switch (errorType) {
      case GraphEngineErrorType.MEMORY_ERROR:
        return 'Memory Error';
      case GraphEngineErrorType.PERFORMANCE_ERROR:
        return 'Performance Error';
      case GraphEngineErrorType.COMPATIBILITY_ERROR:
        return 'Compatibility Error';
      case GraphEngineErrorType.RENDERING_ERROR:
        return 'Rendering Error';
      case GraphEngineErrorType.DATA_LOADING_ERROR:
        return 'Data Loading Error';
      case GraphEngineErrorType.INITIALIZATION_ERROR:
        return 'Initialization Error';
      default:
        return 'Graph Engine Error';
    }
  };
  
  if (isRecovering) {
    return (
      <div className={engineError}>
        <div className={errorIcon}>🔄</div>
        <h3 className={errorTitle}>Attempting Recovery...</h3>
        <p className={errorMessage}>
          Switching to alternative engine, please wait.
        </p>
      </div>
    );
  }
  
  return (
    <div className={engineError}>
      <div className={errorIcon}>
        {getErrorIcon(error.type)}
      </div>
      
      <h3 className={errorTitle}>
        {getErrorTitle(error.type)}
      </h3>
      
      <p className={errorMessage}>
        {error.message || 'An unexpected error occurred with the graph engine.'}
      </p>
      
      {error.suggestedActions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0', color: 'var(--color-text)' }}>
            Suggested Actions:
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '1rem', 
            fontSize: '0.8rem',
            color: 'var(--color-muted)'
          }}>
            {error.suggestedActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className={errorActions}>
        <button
          onClick={retry}
          className={errorButton}
        >
          Retry
        </button>
        
        {error.alternativeEngines && error.alternativeEngines.length > 0 && (
          <>
            {error.alternativeEngines.slice(0, 2).map((engine) => (
              <button
                key={engine}
                onClick={() => switchEngine(engine)}
                className={errorButton}
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-background)' }}
              >
                Switch to {engine}
              </button>
            ))}
          </>
        )}
      </div>
      
      <details style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-subtle)' }}>
        <summary style={{ cursor: 'pointer' }}>Technical Details</summary>
        <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', background: 'var(--color-background)', padding: '0.5rem', borderRadius: '4px' }}>
          <div><strong>Engine:</strong> {error.engineType}</div>
          <div><strong>Type:</strong> {error.type}</div>
          <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
          <div><strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</div>
          {error.originalError && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Stack Trace:</strong>
              <pre style={{ fontSize: '0.65rem', overflow: 'auto', maxHeight: '100px' }}>
                {error.originalError.stack}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

// ============================================================================
// Hook for Error Handling
// ============================================================================

export function useGraphEngineErrorHandler() {
  const { 
    engineErrors, 
    clearEngineError, 
    handleEngineError,
    switchEngine,
    currentEngine,
  } = useGraphEngine();
  
  const { getCapabilities } = useEngineCapabilities();
  
  const reportError = (error: Error, context?: string) => {
    const classifiedError = classifyEngineError(error, currentEngine, context);
    handleEngineError(currentEngine, classifiedError.message);
    return classifiedError;
  };
  
  const recoverFromError = async (engineType: GraphEngineType): Promise<boolean> => {
    const error = engineErrors[engineType];
    if (!error) return true;
    
    try {
      // Clear the error first
      clearEngineError(engineType);
      
      // Get engine capabilities to find alternatives
      const capabilities = getCapabilities(engineType);
      if (!capabilities) {
        throw new Error(`Engine ${engineType} not available`);
      }
      
      // Find a suitable alternative engine
      const alternatives = getAlternativeEngines(engineType);
      if (alternatives.length > 0) {
        await switchEngine(alternatives[0]);
        return true;
      }
      
      return false;
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      return false;
    }
  };

  const classifyError = (error: string): string => {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('webgl') || errorLower.includes('hardware acceleration') || errorLower.includes('gpu')) {
      return 'hardware';
    }
    if (errorLower.includes('memory') || errorLower.includes('heap') || errorLower.includes('allocation')) {
      return 'memory';
    }
    if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
      return 'network';
    }
    if (errorLower.includes('permission') || errorLower.includes('security') || errorLower.includes('cors')) {
      return 'security';
    }
    if (errorLower.includes('not implemented') || errorLower.includes('not supported')) {
      return 'unsupported';
    }
    if (errorLower.includes('timeout') || errorLower.includes('slow')) {
      return 'performance';
    }
    if (errorLower.includes('initialization') || errorLower.includes('initialise') || errorLower.includes('setup')) {
      return 'initialization';
    }

    return 'unknown';
  };

  const getErrorSummary = () => {
    const errorCount = Object.values(engineErrors).filter(error => error !== null).length;
    const errorsByType: Record<string, number> = {};
    
    Object.values(engineErrors).forEach(error => {
      if (error) {
        // Classify error based on common patterns
        const type = classifyError(error);
        errorsByType[type] = (errorsByType[type] || 0) + 1;
      }
    });
    
    return {
      totalErrors: errorCount,
      errorsByType,
      hasRecoverableErrors: Object.values(engineErrors).some(error => error !== null),
    };
  };
  
  return {
    reportError,
    recoverFromError,
    clearError: clearEngineError,
    getErrorSummary,
    engineErrors,
  };
}

// ============================================================================
// Recovery Strategies
// ============================================================================

export const ENGINE_RECOVERY_STRATEGIES: Record<GraphEngineErrorType, {
  immediate: string[];
  alternative: string[];
  lastResort: string[];
}> = {
  [GraphEngineErrorType.INITIALIZATION_ERROR]: {
    immediate: ['retry', 'refresh_page'],
    alternative: ['switch_engine', 'clear_cache'],
    lastResort: ['use_fallback_renderer'],
  },
  [GraphEngineErrorType.RENDERING_ERROR]: {
    immediate: ['retry', 'switch_renderer'],
    alternative: ['switch_engine', 'reduce_quality'],
    lastResort: ['disable_animations'],
  },
  [GraphEngineErrorType.MEMORY_ERROR]: {
    immediate: ['reduce_graph_size', 'switch_to_efficient_engine'],
    alternative: ['enable_culling', 'reduce_quality'],
    lastResort: ['use_text_fallback'],
  },
  [GraphEngineErrorType.PERFORMANCE_ERROR]: {
    immediate: ['switch_to_fast_engine', 'enable_optimizations'],
    alternative: ['reduce_graph_size', 'disable_animations'],
    lastResort: ['use_static_layout'],
  },
  [GraphEngineErrorType.COMPATIBILITY_ERROR]: {
    immediate: ['switch_to_compatible_engine'],
    alternative: ['update_browser_prompt'],
    lastResort: ['show_compatibility_warning'],
  },
  [GraphEngineErrorType.DATA_LOADING_ERROR]: {
    immediate: ['retry_data_load', 'validate_data'],
    alternative: ['use_fallback_data'],
    lastResort: ['show_error_state'],
  },
  [GraphEngineErrorType.UNKNOWN_ERROR]: {
    immediate: ['retry', 'refresh_page'],
    alternative: ['switch_engine', 'report_error'],
    lastResort: ['show_generic_error'],
  },
};