/**
 * Engine Comparison Modal Component
 * 
 * Detailed comparison modal showing feature matrices, performance characteristics,
 * and recommendations for all available graph engines. Includes interactive
 * comparison tables and visual indicators.
 */

import { clsx } from 'clsx';
import React, { useEffect, useRef, useState } from 'react';

import { useEngineCapabilities } from '../graph-engines/hooks/useEngineCapabilities';
import { useGraphEngine } from '../graph-engines/hooks/useGraphEngine';
import type { GraphEngineType, GraphEngineCapabilities } from '../graph-engines/provider';

import {
  modalOverlay,
  modal,
  modalHeader,
  modalTitle,
  modalCloseButton,
  modalBody,
  comparisonGrid,
  comparisonCard,
  comparisonTable,
  tableHeader,
  tableHeaderCell,
  tableRow,
  tableCell,
  mobileModal,
  mobileModalBody,
  mobileComparisonGrid,
  tabletResponsive,
} from './components.css';
import { EngineCapabilityBadges } from './EngineCapabilityBadges';
import { EnginePerformanceIndicator } from './EnginePerformanceIndicator';


// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EngineComparisonModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Callback when modal should close */
  onClose: () => void;
  
  /** Engines to compare (defaults to all available) */
  engines?: GraphEngineType[];
  
  /** Current graph size for recommendations */
  graphSize?: {
    vertices: number;
    edges: number;
  };
  
  /** Callback when user selects an engine */
  onEngineSelect?: (engineType: GraphEngineType) => void;
  
  /** Current engine for highlighting */
  currentEngine?: GraphEngineType;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

interface ComparisonData {
  engineType: GraphEngineType;
  capabilities: GraphEngineCapabilities;
  displayName: string;
  icon: string;
  isImplemented: boolean;
  isRecommended: boolean;
  suitabilityScore: number;
}

// ============================================================================
// Engine Configuration
// ============================================================================

const ENGINE_DISPLAY_CONFIG = {
  'canvas-2d': { name: 'Canvas 2D', icon: '🎨' },
  'svg': { name: 'SVG', icon: '📐' },
  'webgl': { name: 'WebGL', icon: '⚡' },
  'd3-force': { name: 'D3.js Force', icon: '🔬' },
  'cytoscape': { name: 'Cytoscape.js', icon: '🕸️' },
  'vis-network': { name: 'vis-network', icon: '🌐' },
} as const;

const IMPLEMENTATION_STATUS = {
  'canvas-2d': true,
  'svg': true,
  'webgl': false,
  'd3-force': true,
  'cytoscape': false,
  'vis-network': false,
} as const;

// ============================================================================
// Component Implementation
// ============================================================================

export function EngineComparisonModal({
  isOpen,
  onClose,
  engines,
  graphSize,
  onEngineSelect,
  className,
  'data-testid': testId = 'engine-comparison-modal',
}: EngineComparisonModalProps): React.JSX.Element | null {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedEngine, setSelectedEngine] = useState<GraphEngineType | null>(null);
  
  const { getAllCapabilities, recommendEngines, findEnginesForGraphSize } = useEngineCapabilities();
  const { currentEngine, switchEngine } = useGraphEngine();
  
  // ============================================================================
  // Data Preparation
  // ============================================================================
  
  const comparisonData = React.useMemo((): ComparisonData[] => {
    const allCapabilities = getAllCapabilities();
    const recommendations = graphSize ? recommendEngines({
      graphSize: {
        maxVertices: graphSize.vertices,
        maxEdges: graphSize.edges,
      },
    }) : [];
    
    const suitableEngines = graphSize ? 
      findEnginesForGraphSize(graphSize.vertices, graphSize.edges) : 
      [];
    
    return allCapabilities
      .filter(({ engineType }) => !engines || engines.includes(engineType))
      .map(({ engineType, capabilities }) => {
        const config = ENGINE_DISPLAY_CONFIG[engineType];
        const recommendation = recommendations.find(r => r.engineType === engineType);
        const suitability = suitableEngines.find(s => s.engineType === engineType);
        
        return {
          engineType,
          capabilities,
          displayName: config?.name || engineType,
          icon: config?.icon || '❓',
          isImplemented: IMPLEMENTATION_STATUS[engineType] ?? false,
          isRecommended: recommendation?.meetsAllRequirements ?? false,
          suitabilityScore: recommendation?.score ?? suitability?.performanceScore ?? 0,
        };
      })
      .sort((a, b) => {
        // Sort by: implemented first, then by suitability score
        if (a.isImplemented !== b.isImplemented) {
          return a.isImplemented ? -1 : 1;
        }
        return b.suitabilityScore - a.suitabilityScore;
      });
  }, [getAllCapabilities, engines, graphSize, recommendEngines, findEnginesForGraphSize]);
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleEngineSelect = (engineType: GraphEngineType) => {
    if (!IMPLEMENTATION_STATUS[engineType]) return;
    
    setSelectedEngine(engineType);
    onEngineSelect?.(engineType);
    
    if (!onEngineSelect) {
      switchEngine(engineType);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };
  
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
  
  // ============================================================================
  // Modal Accessibility
  // ============================================================================
  
  useEffect(() => {
    if (isOpen) {
      // Focus modal when opened
      modalRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const renderFeatureValue = (value: boolean | number): React.JSX.Element => {
    if (typeof value === 'boolean') {
      return (
        <span style={{ color: value ? '#10b981' : '#ef4444' }}>
          {value ? '✓' : '✗'}
        </span>
      );
    }
    
    if (typeof value === 'number') {
      const color = value >= 4 ? '#10b981' : value >= 3 ? '#f59e0b' : '#ef4444';
      return <span style={{ color }}>{value}/5</span>;
    }
    
    return <span>{String(value)}</span>;
  };
  
  const renderEngineCard = (data: ComparisonData) => {
    const isSelected = selectedEngine === data.engineType || currentEngine === data.engineType;
    
    return (
      <div
        key={data.engineType}
        className={comparisonCard({ recommended: data.isRecommended })}
        data-testid={`${testId}-card-${data.engineType}`}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }} aria-hidden="true">
            {data.icon}
          </span>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {data.displayName}
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {data.isImplemented ? (
                <span style={{ color: '#10b981', fontSize: '12px' }}>✓ Available</span>
              ) : (
                <span style={{ color: '#6b7280', fontSize: '12px' }}>🚧 Coming Soon</span>
              )}
              
              {data.suitabilityScore > 0 && (
                <span style={{ color: '#3b82f6', fontSize: '12px' }}>
                  Score: {data.suitabilityScore}
                </span>
              )}
            </div>
          </div>
          
          {data.isImplemented && (
            <button
              onClick={() => handleEngineSelect(data.engineType)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: isSelected ? '#dbeafe' : 'white',
                color: isSelected ? '#1d4ed8' : '#374151',
                cursor: 'pointer',
              }}
              data-testid={`${testId}-select-${data.engineType}`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          )}
        </div>
        
        {/* Capability Badges */}
        <EngineCapabilityBadges
          capabilities={data.capabilities}
          compact={true}
          maxBadges={6}
        />
        
        {/* Performance Summary */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Performance
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <div style={{ color: '#6b7280' }}>Max Vertices</div>
              <div>{data.capabilities.performance.maxVertices.toLocaleString()}</div>
            </div>
            
            <div>
              <div style={{ color: '#6b7280' }}>Max Edges</div>
              <div>{data.capabilities.performance.maxEdges.toLocaleString()}</div>
            </div>
            
            <div>
              <div style={{ color: '#6b7280' }}>Memory Efficiency</div>
              <div>{renderFeatureValue(data.capabilities.performance.memoryEfficiency)}</div>
            </div>
            
            <div>
              <div style={{ color: '#6b7280' }}>Rendering Speed</div>
              <div>{renderFeatureValue(data.capabilities.performance.renderingSpeed)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // Render Modal
  // ============================================================================
  
  if (!isOpen) return null;
  
  return (
    <div
      className={clsx(modalOverlay, className)}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${testId}-title`}
    >
      <div
        ref={modalRef}
        className={clsx(modal, mobileModal)}
        tabIndex={-1}
        role="document"
      >
        {/* Header */}
        <div className={modalHeader}>
          <h2 id={`${testId}-title`} className={modalTitle}>
            Engine Comparison
          </h2>
          
          <button
            className={modalCloseButton}
            onClick={onClose}
            aria-label="Close comparison modal"
            data-testid={`${testId}-close`}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className={clsx(modalBody, mobileModalBody)}>
          {/* Cards Grid */}
          <div className={clsx(comparisonGrid, mobileComparisonGrid, tabletResponsive)}>
            {comparisonData.map(renderEngineCard)}
          </div>
          
          {/* Detailed Comparison Table */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Feature Comparison
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table className={comparisonTable}>
                <thead className={tableHeader}>
                  <tr>
                    <th className={tableHeaderCell}>Feature</th>
                    {comparisonData.map(data => (
                      <th key={data.engineType} className={tableHeaderCell}>
                        {data.icon} {data.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Animations</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.animations)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Zoom & Pan</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.zoomPan)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Vertex Dragging</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.vertexDragging)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Clustering</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.clustering)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Custom Shapes</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.customVertexShapes)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>Hardware Acceleration</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.performance.hardwareAccelerated)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>PNG Export</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.export.png)}
                      </td>
                    ))}
                  </tr>
                  
                  <tr className={tableRow}>
                    <td className={tableCell} style={{ fontWeight: '500' }}>SVG Export</td>
                    {comparisonData.map(data => (
                      <td key={data.engineType} className={tableCell}>
                        {renderFeatureValue(data.capabilities.features.export.svg)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Graph Size Context */}
          {graphSize && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                Current Graph Size
              </div>
              <div style={{ color: '#6b7280' }}>
                {graphSize.vertices.toLocaleString()} vertices, {graphSize.edges.toLocaleString()} edges
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

EngineComparisonModal.displayName = 'EngineComparisonModal';

export default EngineComparisonModal;