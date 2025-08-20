/**
 * Engine Recommendation Tooltip Component
 * 
 * Smart engine suggestions based on current graph size, user requirements,
 * and performance characteristics. Provides contextual recommendations
 * with explanations and quick selection options.
 */

import { clsx } from 'clsx';
import React, { useEffect, useRef } from 'react';

import type { EngineRecommendation } from '../graph-engines/hooks/useEngineCapabilities';
import type { GraphEngineType } from '../graph-engines/provider';

import {
  recommendationTooltip,
  recommendationHeader,
  recommendationIcon,
  recommendationTitle,
  recommendationList,
  recommendationItem,
  recommendationScore,
  recommendationContent,
  recommendationName,
  recommendationReason,
} from './components.css';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EngineRecommendationTooltipProps {
  /** Array of engine recommendations */
  recommendations: EngineRecommendation[];
  
  /** Callback when user selects an engine */
  onEngineSelect: (engineType: GraphEngineType) => void;
  
  /** Callback when tooltip should close */
  onClose: () => void;
  
  /** Current graph size for context */
  graphSize?: {
    vertices: number;
    edges: number;
  };
  
  /** Position of the tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
  
  /** Custom CSS class name */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

// ============================================================================
// Engine Display Configuration
// ============================================================================

const ENGINE_DISPLAY_NAMES: Record<GraphEngineType, string> = {
  'canvas-2d': 'Canvas 2D',
  'svg': 'SVG',
  'webgl': 'WebGL',
  'd3-force': 'D3.js Force',
  'cytoscape': 'Cytoscape.js',
  'vis-network': 'vis-network',
};

const ENGINE_ICONS: Record<GraphEngineType, string> = {
  'canvas-2d': 'CANVAS',
  'svg': 'SVG',
  'webgl': 'GPU',
  'd3-force': 'D3',
  'cytoscape': 'CYTO',
  'vis-network': 'VIS',
};

// ============================================================================
// Component Implementation
// ============================================================================

export function EngineRecommendationTooltip({
  recommendations,
  onEngineSelect,
  onClose,
  graphSize,
  position: _position = 'bottom',
  className,
  'data-testid': testId = 'engine-recommendation-tooltip',
}: EngineRecommendationTooltipProps): React.JSX.Element {
  // ============================================================================
  // Refs & State
  // ============================================================================
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleEngineSelect = (engineType: GraphEngineType) => {
    onEngineSelect(engineType);
    onClose();
  };
  
  const handleKeyDown = (event: React.KeyboardEvent, engineType: GraphEngineType) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleEngineSelect(engineType);
        break;
      case 'Escape':
        onClose();
        break;
    }
  };
  
  // ============================================================================
  // Click Outside Handler
  // ============================================================================
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    if (score >= 40) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };
  
  const formatReason = (reason: string): string => {
    // Clean up and format recommendation reasons
    return reason
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getContextualMessage = (): string => {
    if (!graphSize) return 'Based on general usage patterns';
    
    const { vertices, edges } = graphSize;
    
    if (vertices > 10000 || edges > 50000) {
      return `For large graphs (${vertices.toLocaleString()} vertices, ${edges.toLocaleString()} edges)`;
    } else if (vertices > 1000 || edges > 5000) {
      return `For medium graphs (${vertices.toLocaleString()} vertices, ${edges.toLocaleString()} edges)`;
    } else {
      return `For small graphs (${vertices.toLocaleString()} vertices, ${edges.toLocaleString()} edges)`;
    }
  };
  
  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const renderRecommendation = (recommendation: EngineRecommendation, _index: number) => {
    const { engineType, score, reasons, limitations } = recommendation;
    const displayName = ENGINE_DISPLAY_NAMES[engineType] || engineType;
    const icon = ENGINE_ICONS[engineType] || 'UNKNOWN';
    
    const primaryReason = reasons[0] || 'Good general performance';
    const hasLimitations = limitations.length > 0;
    
    return (
      <div
        key={engineType}
        className={recommendationItem}
        onClick={() => handleEngineSelect(engineType)}
        onKeyDown={(e) => handleKeyDown(e, engineType)}
        tabIndex={0}
        role="button"
        aria-label={`Select ${displayName} (Score: ${score})`}
        data-testid={`${testId}-item-${engineType}`}
      >
        <div
          className={recommendationScore}
          style={{ backgroundColor: getScoreColor(score) }}
          title={`Suitability score: ${score}/100`}
        >
          {score}
        </div>
        
        <div className={recommendationContent}>
          <div className={recommendationName} title={displayName}>
            {icon} {displayName}
          </div>
          
          <div className={recommendationReason}>
            {formatReason(primaryReason)}
            {hasLimitations && (
              <span style={{ color: '#ef4444', marginLeft: '8px' }}>
                ⚠️ {limitations[0]}
              </span>
            )}
          </div>
          
          {/* Additional reasons */}
          {reasons.length > 1 && (
            <div
              className={recommendationReason}
              style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}
            >
              +{reasons.length - 1} more reason{reasons.length > 2 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (recommendations.length === 0) {
    return (
      <div
        ref={tooltipRef}
        className={clsx(recommendationTooltip, className)}
        data-testid={testId}
      >
        <div className={recommendationHeader}>
          <svg className={recommendationIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className={recommendationTitle}>No Recommendations</div>
        </div>
        
        <div style={{ padding: '12px 0', fontSize: '14px', color: '#6b7280' }}>
          No suitable engines found for your requirements.
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={tooltipRef}
      className={clsx(recommendationTooltip, className)}
      data-testid={testId}
      role="dialog"
      aria-label="Engine recommendations"
      aria-describedby={`${testId}-context`}
    >
      {/* Header */}
      <div className={recommendationHeader}>
        <svg
          className={recommendationIcon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        
        <div className={recommendationTitle}>
          Recommendations
        </div>
      </div>
      
      {/* Context Message */}
      <div
        id={`${testId}-context`}
        style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '16px',
          fontStyle: 'italic',
        }}
      >
        {getContextualMessage()}
      </div>
      
      {/* Recommendations List */}
      <div
        className={recommendationList}
        role="list"
        aria-label="Engine recommendations list"
      >
        {recommendations.map(renderRecommendation)}
      </div>
      
      {/* Footer */}
      <div
        style={{
          marginTop: '16px',
          padding: '8px 0',
          borderTop: '1px solid #e5e7eb',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Click an engine to select it
      </div>
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

EngineRecommendationTooltip.displayName = 'EngineRecommendationTooltip';

// Named export only - no default export