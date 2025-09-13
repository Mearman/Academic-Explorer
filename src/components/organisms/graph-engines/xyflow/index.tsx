/**
 * xyflow (React Flow) Graph Engine Implementation
 *
 * Modern React-based flow diagram library with excellent performance and built-in features.
 * xyflow provides a React component-based approach with hooks and optimized rendering.
 *
 * Features provided:
 * - React-first design with hooks and components
 * - High-performance rendering with efficient updates
 * - Built-in controls, minimap, and zoom/pan
 * - Multiple edge types and smooth curves
 * - Interactive node dragging and selection
 * - Automatic layout algorithms
 * - Customizable nodes and edges
 * - Accessibility support
 *
 * @see https://xyflow.com/
 * @see https://github.com/xyflow/xyflow
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  Panel,
  Position,
  BackgroundVariant,
  Handle,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getEntityColour, getOpenAccessColour } from '../../../design-tokens.utils';
import dagre from '@dagrejs/dagre';
import { toPng, toSvg } from 'html-to-image';

import type {
  IGraph,
  IDimensions,
  IGraphConfig,
  IPositionedVertex
} from '../../graph-core/interfaces';
import type {
  IGraphEngine,
  IEngineCapabilities,
  IEngineRequirements,
  IEngineStatus,
  IEngineConfig
} from '../types';

// xyflow specific configuration interface
export interface IXyflowConfig extends IEngineConfig {
  xyflowOptions?: {
    fitView?: boolean;
    fitViewOptions?: {
      padding?: number;
      includeHiddenNodes?: boolean;
      minZoom?: number;
      maxZoom?: number;
      duration?: number;
    };
    nodeTypes?: NodeTypes;
    edgeTypes?: EdgeTypes;
    defaultViewport?: {
      x: number;
      y: number;
      zoom: number;
    };
    attributionPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    proOptions?: {
      account?: 'paid';
      hideAttribution?: boolean;
    };
    background?: {
      variant?: BackgroundVariant;
      gap?: number | [number, number];
      size?: number;
      offset?: number;
      lineWidth?: number;
      color?: string;
    };
    controls?: {
      showZoom?: boolean;
      showFitView?: boolean;
      showInteractive?: boolean;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    miniMap?: {
      nodeColor?: string | ((node: Node) => string);
      nodeStrokeColor?: string | ((node: Node) => string);
      nodeClassName?: string | ((node: Node) => string);
      maskColor?: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      ariaLabel?: string;
    };
    nodes?: {
      defaultType?: string;
      defaultSize?: { width: number; height: number };
      defaultStyle?: React.CSSProperties;
      selectionColor?: string;
      deletable?: boolean;
      focusable?: boolean;
    };
    edges?: {
      defaultType?: string;
      defaultStyle?: React.CSSProperties;
      selectionColor?: string;
      deletable?: boolean;
      focusable?: boolean;
    };
    interaction?: {
      nodesDraggable?: boolean;
      nodesConnectable?: boolean;
      elementsSelectable?: boolean;
      selectNodesOnDrag?: boolean;
      panOnDrag?: boolean;
      minZoom?: number;
      maxZoom?: number;
      panOnScroll?: boolean;
      panOnScrollSpeed?: number;
      zoomOnScroll?: boolean;
      zoomOnPinch?: boolean;
      zoomOnDoubleClick?: boolean;
      preventScrolling?: boolean;
    };
  };
  layout?: {
    algorithm?: 'dagre' | 'force' | 'hierarchical' | 'manual';
    direction?: 'TB' | 'BT' | 'LR' | 'RL';
    spacing?: {
      node?: [number, number];
      rank?: number;
    };
    alignment?: 'UL' | 'UR' | 'DL' | 'DR';
  };
}

// Enhanced Custom Node Components
interface EntityNodeData {
  label: string;
  entityType: string;
  originalVertex?: any;
  citationCount?: number;
  publicationYear?: number;
  openAccessStatus?: string;
  isSelected?: boolean;
}

const EntityNode: React.FC<{ data: EntityNodeData; selected?: boolean }> = ({ data, selected }) => {
  const entityColor = getEntityColour(data.entityType);
  const [isHovered, setIsHovered] = useState(false);

  // Enhanced styling based on entity type and state
  const nodeStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${entityColor}, ${entityColor}dd)`,
    color: 'white',
    padding: '12px 16px',
    borderRadius: '12px',
    border: selected ? `3px solid ${entityColor}` : '2px solid rgba(255, 255, 255, 0.2)',
    minWidth: '100px',
    textAlign: 'center',
    boxShadow: isHovered
      ? `0 8px 24px ${entityColor}40, 0 4px 12px rgba(0, 0, 0, 0.15)`
      : '0 4px 12px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
    position: 'relative',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    lineHeight: '1.3',
    marginBottom: '6px',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    maxWidth: '140px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const typeStyle: React.CSSProperties = {
    fontSize: '10px',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500',
    marginBottom: '4px',
    padding: '2px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    display: 'inline-block',
  };

  const metadataStyle: React.CSSProperties = {
    fontSize: '9px',
    opacity: 0.9,
    marginTop: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  };

  const metadataItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '1px 4px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    fontSize: '8px',
    fontWeight: '500',
  };

  // Generate accessible description
  const getNodeDescription = (): string => {
    let description = `${data.entityType} node: ${data.label}`;
    if (data.entityType === 'work') {
      if (data.publicationYear) description += `, published in ${data.publicationYear}`;
      if (data.citationCount !== undefined) description += `, ${data.citationCount} citations`;
      if (data.openAccessStatus) description += `, ${data.openAccessStatus} access`;
    }
    return description;
  };

  return (
    <div
      style={nodeStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={selected ? 0 : -1}
      aria-label={getNodeDescription()}
      aria-selected={selected}
      aria-describedby={`node-details-${data.originalVertex?.id || 'unknown'}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: entityColor,
          border: '2px solid white',
          width: '8px',
          height: '8px',
        }}
      />

      <div style={labelStyle}>
        {data.label}
      </div>

      <div style={typeStyle}>
        {data.entityType}
      </div>

      {/* Enhanced metadata display for works */}
      {data.entityType === 'work' && (data.citationCount || data.publicationYear || data.openAccessStatus) && (
        <div style={metadataStyle}>
          {data.publicationYear && (
            <span style={metadataItemStyle}>
              📅 {data.publicationYear}
            </span>
          )}
          {data.citationCount !== undefined && (
            <span style={metadataItemStyle}>
              📊 {data.citationCount > 999 ? `${(data.citationCount / 1000).toFixed(1)}k` : data.citationCount}
            </span>
          )}
          {data.openAccessStatus && (
            <span style={{ ...metadataItemStyle, gap: '3px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: getOpenAccessColour(data.openAccessStatus),
                  border: '1px solid white',
                  flexShrink: 0,
                }}
                title={`Open Access: ${data.openAccessStatus}`}
              />
              OA
            </span>
          )}
        </div>
      )}

      {/* Metadata for other entity types */}
      {data.entityType !== 'work' && (data.citationCount || data.publicationYear) && (
        <div style={metadataStyle}>
          {data.citationCount !== undefined && (
            <span style={metadataItemStyle}>
              🔗 {data.citationCount > 999 ? `${(data.citationCount / 1000).toFixed(1)}k` : data.citationCount}
            </span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: entityColor,
          border: '2px solid white',
          width: '8px',
          height: '8px',
        }}
      />
    </div>
  );
};

// Compact node for dense graphs
const CompactEntityNode: React.FC<{ data: EntityNodeData; selected?: boolean }> = ({ data, selected }) => {
  const entityColor = getEntityColour(data.entityType);
  const [isHovered, setIsHovered] = useState(false);

  // Generate accessible description for compact node
  const getCompactNodeDescription = (): string => {
    let description = `${data.entityType}: ${data.label}`;
    if (data.citationCount !== undefined) description += ` (${data.citationCount} citations)`;
    return description;
  };

  const compactStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${entityColor}, ${entityColor}dd)`,
    color: 'white',
    padding: '6px 10px',
    borderRadius: '8px',
    border: selected ? `2px solid ${entityColor}` : '1px solid rgba(255, 255, 255, 0.2)',
    minWidth: '70px',
    maxWidth: '120px',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: '600',
    boxShadow: isHovered
      ? `0 4px 12px ${entityColor}40, 0 2px 6px rgba(0, 0, 0, 0.15)`
      : '0 2px 6px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div
      style={compactStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={selected ? 0 : -1}
      aria-label={getCompactNodeDescription()}
      aria-selected={selected}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: entityColor, border: '1px solid white', width: '6px', height: '6px' }}
      />

      <div
        style={{
          fontSize: '11px',
          fontWeight: '600',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)',
        }}
        title={data.label}
      >
        {data.label}
      </div>

      {/* Compact metadata indicator */}
      {(data.citationCount !== undefined && data.citationCount > 0) && (
        <div style={{
          fontSize: '8px',
          opacity: 0.8,
          marginTop: '2px',
          fontWeight: '500',
        }}>
          {data.citationCount > 99 ? '99+' : data.citationCount}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: entityColor, border: '1px solid white', width: '6px', height: '6px' }}
      />
    </div>
  );
};

// ============================================================================
// Custom Edge Components
// ============================================================================

const CitationEdge: React.FC<{ id: string; sourceX: number; sourceY: number; targetX: number; targetY: number; data?: any; style?: React.CSSProperties }> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}) => {
  const edgePath = `M${sourceX},${sourceY} C${sourceX},${targetY} ${targetX},${sourceY} ${targetX},${targetY}`;

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={style?.stroke || '#3b82f6'}
        strokeWidth={style?.strokeWidth || 2}
        strokeDasharray={style?.strokeDasharray}
        opacity={style?.opacity || 0.7}
        markerEnd="url(#citation-marker)"
      />
      {/* Citation count label */}
      {data?.citationCount && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 5}
          fill="#4b5563"
          fontSize="10"
          textAnchor="middle"
          className="citation-label"
        >
          {data.citationCount}
        </text>
      )}
    </g>
  );
};

const CollaborationEdge: React.FC<{ id: string; sourceX: number; sourceY: number; targetX: number; targetY: number; data?: any; style?: React.CSSProperties }> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}) => {
  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={style?.stroke || '#059669'}
        strokeWidth={style?.strokeWidth || 3}
        opacity={style?.opacity || 0.8}
        strokeLinecap="round"
      />
      {/* Collaboration strength indicator */}
      {data?.strength && data.strength > 0.5 && (
        <circle
          cx={(sourceX + targetX) / 2}
          cy={(sourceY + targetY) / 2}
          r="4"
          fill={style?.stroke || '#059669'}
          opacity="0.8"
        />
      )}
    </g>
  );
};

const InfluenceEdge: React.FC<{ id: string; sourceX: number; sourceY: number; targetX: number; targetY: number; data?: any; style?: React.CSSProperties }> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}) => {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const controlX = midX + (targetY - sourceY) * 0.1;
  const controlY = midY - (targetX - sourceX) * 0.1;

  const edgePath = `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;

  return (
    <g>
      <defs>
        <linearGradient id={`influence-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={style?.stroke || '#f59e0b'} stopOpacity="0.8" />
          <stop offset="100%" stopColor={style?.stroke || '#f59e0b'} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={`url(#influence-gradient-${id})`}
        strokeWidth={style?.strokeWidth || 2.5}
        opacity={style?.opacity || 0.7}
        markerEnd="url(#influence-marker)"
      />
      {/* Influence strength indicator */}
      {data?.influenceScore && (
        <text
          x={controlX}
          y={controlY - 8}
          fill="#92400e"
          fontSize="9"
          textAnchor="middle"
          fontWeight="600"
        >
          {Math.round(data.influenceScore * 100)}%
        </text>
      )}
    </g>
  );
};

// Custom edge type definitions
const edgeTypes: EdgeTypes = {
  citation: CitationEdge,
  collaboration: CollaborationEdge,
  influence: InfluenceEdge,
};

// ============================================================================
// Interactive Tooltip Components
// ============================================================================

const NodeTooltip: React.FC<{
  node: Node;
  position: { x: number; y: number };
  visible: boolean;
}> = ({ node, position, visible }) => {
  if (!visible) return null;

  const data = node.data as EntityNodeData;
  const entityColor = getEntityColour(data.entityType);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        background: 'rgba(255, 255, 255, 0.98)',
        border: `2px solid ${entityColor}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        maxWidth: '350px',
        fontSize: '13px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        fontWeight: '600',
        marginBottom: '8px',
        color: entityColor,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: entityColor,
        }} />
        {data.entityType.charAt(0).toUpperCase() + data.entityType.slice(1)}
      </div>

      <div style={{
        fontWeight: '600',
        marginBottom: '6px',
        fontSize: '14px',
        lineHeight: '1.3',
        color: '#1f2937'
      }}>
        {data.label}
      </div>

      {/* Metadata display */}
      <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
        {data.publicationYear && (
          <div style={{ marginBottom: '3px' }}>
            📅 Published: {data.publicationYear}
          </div>
        )}
        {data.citationCount !== undefined && (
          <div style={{ marginBottom: '3px' }}>
            📊 Citations: {data.citationCount.toLocaleString()}
          </div>
        )}
        {data.openAccessStatus && (
          <div style={{
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getOpenAccessColour(data.openAccessStatus),
            }} />
            Open Access: {data.openAccessStatus}
          </div>
        )}
      </div>

      {/* Additional actions */}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '11px',
        color: '#9ca3af'
      }}>
        Click to select • Double-click to focus
      </div>
    </div>
  );
};

const EdgeTooltip: React.FC<{
  edge: Edge;
  position: { x: number; y: number };
  visible: boolean;
}> = ({ edge, position, visible }) => {
  if (!visible) return null;

  const edgeData = edge.data || {};
  const weight = edgeData.weight || 1;
  const relationshipType = edgeData.relationshipType || 'connection';

  const getRelationshipColor = (type: string): string => {
    switch (type) {
      case 'citation': return '#3b82f6';
      case 'collaboration': return '#059669';
      case 'influence': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const relationshipColor = getRelationshipColor(relationshipType);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        background: 'rgba(255, 255, 255, 0.98)',
        border: `2px solid ${relationshipColor}`,
        borderRadius: '8px',
        padding: '10px',
        minWidth: '180px',
        fontSize: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        fontWeight: '600',
        marginBottom: '6px',
        color: relationshipColor,
        textTransform: 'capitalize'
      }}>
        {relationshipType} Relationship
      </div>

      <div style={{ color: '#6b7280', lineHeight: '1.4' }}>
        <div>Strength: {Math.round(weight * 100)}%</div>
        {edgeData.citationCount && (
          <div>Citations: {edgeData.citationCount}</div>
        )}
        {edgeData.influenceScore && (
          <div>Influence: {Math.round(edgeData.influenceScore * 100)}%</div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Context Menu Components
// ============================================================================

interface ContextMenuAction {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

const ContextMenu: React.FC<{
  position: { x: number; y: number };
  visible: boolean;
  actions: ContextMenuAction[];
  onClose: () => void;
}> = ({ position, visible, actions, onClose }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  // Close menu on escape key
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: 1001,
        minWidth: '160px',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}
    >
      {actions.map((action, index) => (
        <React.Fragment key={index}>
          {action.divider && (
            <div style={{
              height: '1px',
              background: '#e5e7eb',
              margin: '4px 0',
            }} />
          )}
          <button
            onClick={() => {
              if (!action.disabled) {
                action.action();
                onClose();
              }
            }}
            disabled={action.disabled}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              fontSize: '13px',
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: action.disabled ? '#9ca3af' : '#374151',
              ':hover': {
                background: action.disabled ? 'transparent' : '#f3f4f6',
              },
            }}
            onMouseEnter={(e) => {
              if (!action.disabled) {
                e.currentTarget.style.background = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: '14px' }}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

const NodeContextMenu: React.FC<{
  node: Node;
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
  rfInstance: ReactFlowInstance | null;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}> = ({ node, position, visible, onClose, rfInstance, nodes, edges, setNodes, setEdges }) => {
  const data = node.data as EntityNodeData;

  const actions: ContextMenuAction[] = [
    {
      label: 'Focus on Node',
      icon: '🎯',
      action: () => {
        if (rfInstance) {
          rfInstance.fitView({
            nodes: [node],
            padding: 0.8,
            duration: 500,
          });
        }
      },
    },
    {
      label: 'Select Connected',
      icon: '🔗',
      action: () => {
        // Find all nodes connected to the current node
        const connectedNodeIds = new Set<string>();

        // Find edges where current node is source or target
        edges.forEach(edge => {
          if (edge.source === node.id) {
            connectedNodeIds.add(edge.target);
          } else if (edge.target === node.id) {
            connectedNodeIds.add(edge.source);
          }
        });

        // Select the current node and all connected nodes
        setNodes(prevNodes =>
          prevNodes.map(n => ({
            ...n,
            selected: n.id === node.id || connectedNodeIds.has(n.id)
          }))
        );

        onClose();
      },
    },
    {
      label: 'Hide Node',
      icon: '👁️‍🗨️',
      action: () => {
        // Hide the node by setting its hidden property
        setNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === node.id ? { ...n, hidden: true } : n
          )
        );

        onClose();
      },
    },
    {
      label: 'Copy Node ID',
      icon: '📋',
      action: () => {
        navigator.clipboard.writeText(node.id).catch(() => {
          console.warn('Failed to copy to clipboard');
        });
      },
    },
    { label: '', icon: '', action: () => {}, divider: true },
    {
      label: 'View Details',
      icon: '📊',
      action: () => {
        // Create and show a modal or panel with node details
        const details = {
          id: node.id,
          type: node.type,
          position: node.position,
          data: data,
          metadata: {
            entityType: data.entityType,
            label: data.label,
            description: data.description,
            count: data.count,
            year: data.year,
            citationCount: data.citationCount,
            url: data.url
          }
        };

        // For now, show in console with formatted output
        console.group(`📊 Node Details: ${data.label || node.id}`);
        console.table(details.metadata);
        console.log('Full data:', details);
        console.groupEnd();

        // In a full implementation, this would show a modal/sidebar
        alert(`Node Details:\n\nID: ${node.id}\nType: ${data.entityType}\nLabel: ${data.label || 'N/A'}\nPosition: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`);

        onClose();
      },
    },
    {
      label: 'Export Data',
      icon: '💾',
      action: () => {
        // Export node data as JSON
        const exportData = {
          id: node.id,
          type: node.type,
          position: node.position,
          data: data,
          metadata: {
            entityType: data.entityType,
            label: data.label,
            description: data.description,
            count: data.count,
            year: data.year,
            citationCount: data.citationCount,
            url: data.url,
            exportTimestamp: new Date().toISOString()
          }
        };

        // Create downloadable JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `node-${node.id.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onClose();
      },
    },
  ];

  return (
    <ContextMenu
      position={position}
      visible={visible}
      actions={actions}
      onClose={onClose}
    />
  );
};

const EdgeContextMenu: React.FC<{
  edge: Edge;
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}> = ({ edge, position, visible, onClose, nodes, edges, setNodes, setEdges }) => {
  const edgeData = edge.data || {};

  const actions: ContextMenuAction[] = [
    {
      label: 'Highlight Path',
      icon: '✨',
      action: () => {
        // Highlight the edge and its connected nodes
        const sourceNode = edge.source;
        const targetNode = edge.target;

        // Update nodes to highlight connected ones
        setNodes(prevNodes =>
          prevNodes.map(n => ({
            ...n,
            selected: n.id === sourceNode || n.id === targetNode,
            style: {
              ...n.style,
              ...(n.id === sourceNode || n.id === targetNode
                ? { border: '3px solid #ff6b6b', boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)' }
                : {}
              )
            }
          }))
        );

        // Update edges to highlight the selected one
        setEdges(prevEdges =>
          prevEdges.map(e => ({
            ...e,
            selected: e.id === edge.id,
            style: {
              ...e.style,
              ...(e.id === edge.id
                ? { stroke: '#ff6b6b', strokeWidth: 3, animation: 'flow 1s ease-in-out infinite' }
                : {}
              )
            }
          }))
        );

        onClose();
      },
    },
    {
      label: 'Hide Edge',
      icon: '👁️‍🗨️',
      action: () => {
        // Hide the edge by setting its hidden property
        setEdges(prevEdges =>
          prevEdges.map(e =>
            e.id === edge.id ? { ...e, hidden: true } : e
          )
        );

        onClose();
      },
    },
    {
      label: 'Copy Edge ID',
      icon: '📋',
      action: () => {
        navigator.clipboard.writeText(edge.id).catch(() => {
          console.warn('Failed to copy to clipboard');
        });
      },
    },
    { label: '', icon: '', action: () => {}, divider: true },
    {
      label: 'View Relationship',
      icon: '🔍',
      action: () => {
        // Show detailed relationship information
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        const relationshipDetails = {
          edgeId: edge.id,
          type: edge.type || 'default',
          source: {
            id: edge.source,
            label: sourceNode?.data?.label || edge.source,
            entityType: sourceNode?.data?.entityType || 'unknown'
          },
          target: {
            id: edge.target,
            label: targetNode?.data?.label || edge.target,
            entityType: targetNode?.data?.entityType || 'unknown'
          },
          relationship: {
            type: edgeData.relationshipType || 'connection',
            strength: edgeData.weight || edgeData.strength || 1,
            direction: edgeData.directed ? 'directed' : 'undirected',
            metadata: edgeData
          }
        };

        // Show relationship details in console
        console.group(`🔍 Edge Relationship: ${relationshipDetails.source.label} → ${relationshipDetails.target.label}`);
        console.table(relationshipDetails);
        console.groupEnd();

        // Show relationship in alert for now
        alert(`Relationship Details:\n\nFrom: ${relationshipDetails.source.label} (${relationshipDetails.source.entityType})\nTo: ${relationshipDetails.target.label} (${relationshipDetails.target.entityType})\nType: ${relationshipDetails.relationship.type}\nStrength: ${relationshipDetails.relationship.strength}`);

        onClose();
      },
    },
    {
      label: 'Export Edge Data',
      icon: '💾',
      action: () => {
        // Export edge data as JSON including relationship information
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        const exportData = {
          edge: {
            id: edge.id,
            type: edge.type || 'default',
            source: edge.source,
            target: edge.target,
            data: edgeData,
            style: edge.style
          },
          relationship: {
            type: edgeData.relationshipType || 'connection',
            strength: edgeData.weight || edgeData.strength || 1,
            direction: edgeData.directed ? 'directed' : 'undirected'
          },
          connectedNodes: {
            source: {
              id: edge.source,
              label: sourceNode?.data?.label || edge.source,
              entityType: sourceNode?.data?.entityType || 'unknown',
              position: sourceNode?.position
            },
            target: {
              id: edge.target,
              label: targetNode?.data?.label || edge.target,
              entityType: targetNode?.data?.entityType || 'unknown',
              position: targetNode?.position
            }
          },
          metadata: {
            exportTimestamp: new Date().toISOString(),
            exportSource: 'Academic Explorer - Xyflow Engine'
          }
        };

        // Create downloadable JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `edge-${edge.id.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onClose();
      },
    },
  ];

  return (
    <ContextMenu
      position={position}
      visible={visible}
      actions={actions}
      onClose={onClose}
    />
  );
};

// ============================================================================
// Advanced Node Clustering Components
// ============================================================================

export type ClusterType = 'entity' | 'spatial' | 'citation' | 'year' | 'collaboration';

interface Cluster {
  id: string;
  type: ClusterType;
  label: string;
  nodes: Node[];
  color: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  metadata?: {
    averageCitations?: number;
    yearRange?: { start: number; end: number };
    density?: number;
    centrality?: number;
  };
}

// Advanced clustering algorithms
const ClusteringAlgorithms = {
  // Entity-based clustering (existing)
  entityClustering: (nodes: Node[]): Cluster[] => {
    const entityGroups: Record<string, Node[]> = {};

    nodes.forEach(node => {
      const entityType = (node.data as EntityNodeData)?.entityType || 'unknown';
      if (!entityGroups[entityType]) entityGroups[entityType] = [];
      entityGroups[entityType].push(node);
    });

    return Object.entries(entityGroups)
      .filter(([, nodeList]) => nodeList.length >= 3)
      .map(([entityType, clusterNodes]) => {
        const bounds = calculateClusterBounds(clusterNodes);
        return bounds ? {
          id: `entity-${entityType}`,
          type: 'entity' as ClusterType,
          label: `${entityType}s`,
          nodes: clusterNodes,
          color: getEntityColour(entityType),
          bounds,
        } : null;
      })
      .filter((cluster): cluster is Cluster => cluster !== null);
  },

  // Spatial clustering using distance-based algorithm
  spatialClustering: (nodes: Node[], maxDistance = 200, minNodes = 3): Cluster[] => {
    const clusters: Cluster[] = [];
    const visited = new Set<string>();

    nodes.forEach(node => {
      if (visited.has(node.id)) return;

      const cluster: Node[] = [node];
      visited.add(node.id);

      // Find nearby nodes using BFS
      const queue = [node];
      while (queue.length > 0) {
        const current = queue.shift()!;

        nodes.forEach(other => {
          if (visited.has(other.id)) return;

          const distance = Math.sqrt(
            Math.pow(current.position.x - other.position.x, 2) +
            Math.pow(current.position.y - other.position.y, 2)
          );

          if (distance <= maxDistance) {
            cluster.push(other);
            visited.add(other.id);
            queue.push(other);
          }
        });
      }

      if (cluster.length >= minNodes) {
        const bounds = calculateClusterBounds(cluster);
        if (bounds) {
          // Calculate cluster density
          const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
          const density = cluster.length / (area / 10000); // nodes per 100x100 area

          clusters.push({
            id: `spatial-${clusters.length}`,
            type: 'spatial',
            label: `Spatial Group ${clusters.length + 1}`,
            nodes: cluster,
            color: '#8b5cf6', // purple for spatial clusters
            bounds,
            metadata: { density },
          });
        }
      }
    });

    return clusters;
  },

  // Citation-based clustering
  citationClustering: (nodes: Node[], edges: Edge[]): Cluster[] => {
    // Group nodes by citation ranges
    const citationRanges = [
      { min: 0, max: 10, label: 'Low Citations', color: '#fbbf24' },
      { min: 11, max: 100, label: 'Medium Citations', color: '#f97316' },
      { min: 101, max: 1000, label: 'High Citations', color: '#dc2626' },
      { min: 1001, max: Infinity, label: 'Very High Citations', color: '#991b1b' },
    ];

    const clusters: Cluster[] = [];

    citationRanges.forEach((range, index) => {
      const clusterNodes = nodes.filter(node => {
        const citations = ('cited_by_count' in (node.data as any) ? (node.data as any).cited_by_count : 0) || 0;
        return citations >= range.min && citations <= range.max;
      });

      if (clusterNodes.length >= 3) {
        const bounds = calculateClusterBounds(clusterNodes);
        if (bounds) {
          const avgCitations = clusterNodes.reduce((sum, node) => {
            const citations = ('cited_by_count' in (node.data as any) ? (node.data as any).cited_by_count : 0) || 0;
            return sum + citations;
          }, 0) / clusterNodes.length;

          clusters.push({
            id: `citation-${index}`,
            type: 'citation',
            label: range.label,
            nodes: clusterNodes,
            color: range.color,
            bounds,
            metadata: { averageCitations: Math.round(avgCitations) },
          });
        }
      }
    });

    return clusters;
  },

  // Year-based clustering
  yearClustering: (nodes: Node[]): Cluster[] => {
    const yearGroups: Record<string, Node[]> = {};

    nodes.forEach(node => {
      const year = ('publication_year' in (node.data as any) ? (node.data as any).publication_year : null) || 'unknown';
      const decade = year !== 'unknown' ? Math.floor(year / 10) * 10 : 'unknown';
      const decadeKey = decade !== 'unknown' ? `${decade}s` : 'Unknown Period';

      if (!yearGroups[decadeKey]) yearGroups[decadeKey] = [];
      yearGroups[decadeKey].push(node);
    });

    return Object.entries(yearGroups)
      .filter(([, nodeList]) => nodeList.length >= 3)
      .map(([decade, clusterNodes]) => {
        const bounds = calculateClusterBounds(clusterNodes);
        if (!bounds) return null;

        const years = clusterNodes
          .map(node => ('publication_year' in (node.data as any) ? (node.data as any).publication_year : null))
          .filter((year): year is number => typeof year === 'number');

        const yearRange = years.length > 0 ? {
          start: Math.min(...years),
          end: Math.max(...years)
        } : undefined;

        return {
          id: `year-${decade}`,
          type: 'year' as ClusterType,
          label: decade,
          nodes: clusterNodes,
          color: '#10b981', // green for year clusters
          bounds,
          metadata: { yearRange },
        };
      })
      .filter((cluster): cluster is Cluster => cluster !== null);
  },

  // Collaboration clustering (based on common authors/connections)
  collaborationClustering: (nodes: Node[], edges: Edge[]): Cluster[] => {
    // Build adjacency list for connected components
    const adjacencyList = new Map<string, Set<string>>();

    nodes.forEach(node => {
      adjacencyList.set(node.id, new Set());
    });

    edges.forEach(edge => {
      adjacencyList.get(edge.source)?.add(edge.target);
      adjacencyList.get(edge.target)?.add(edge.source);
    });

    const clusters: Cluster[] = [];
    const visited = new Set<string>();

    // Find connected components using DFS
    const findConnectedComponent = (startId: string): Node[] => {
      const component: Node[] = [];
      const stack = [startId];

      while (stack.length > 0) {
        const nodeId = stack.pop()!;
        if (visited.has(nodeId)) continue;

        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) component.push(node);

        const neighbors = adjacencyList.get(nodeId) || new Set();
        neighbors.forEach(neighborId => {
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        });
      }

      return component;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = findConnectedComponent(node.id);

        if (component.length >= 3) {
          const bounds = calculateClusterBounds(component);
          if (bounds) {
            clusters.push({
              id: `collab-${clusters.length}`,
              type: 'collaboration',
              label: `Collaboration Network ${clusters.length + 1}`,
              nodes: component,
              color: '#3b82f6', // blue for collaboration clusters
              bounds,
            });
          }
        }
      }
    });

    return clusters;
  },
};

const ClusterVisualization: React.FC<{
  cluster: Cluster;
  isActive: boolean;
  onClick?: () => void;
}> = ({ cluster, isActive, onClick }) => {
  const padding = 20;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        left: cluster.bounds.minX - padding,
        top: cluster.bounds.minY - padding,
        width: cluster.bounds.maxX - cluster.bounds.minX + (padding * 2),
        height: cluster.bounds.maxY - cluster.bounds.minY + (padding * 2),
        backgroundColor: isActive ? `${cluster.color}20` : `${cluster.color}10`,
        border: `2px ${isActive ? 'solid' : 'dashed'} ${cluster.color}${isActive ? '80' : '40'}`,
        borderRadius: '12px',
        pointerEvents: onClick ? 'auto' : 'none',
        zIndex: isActive ? 1 : -1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: isActive ? `0 4px 12px ${cluster.color}30` : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          fontSize: '12px',
          fontWeight: '600',
          color: cluster.color,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '4px 10px',
          borderRadius: '8px',
          border: `1px solid ${cluster.color}60`,
          boxShadow: isHovered ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontWeight: '700' }}>{cluster.label}</div>
        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
          {cluster.nodes.length} nodes
          {cluster.metadata?.averageCitations && (
            <> • {cluster.metadata.averageCitations} avg citations</>
          )}
          {cluster.metadata?.yearRange && (
            <> • {cluster.metadata.yearRange.start}-{cluster.metadata.yearRange.end}</>
          )}
          {cluster.metadata?.density && (
            <> • density: {cluster.metadata.density.toFixed(2)}</>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Animation and Transition System
// ============================================================================

interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

const defaultAnimationConfig: AnimationConfig = {
  duration: 800,
  easing: 'ease-in-out',
  delay: 0,
};

// Animation utility functions
const AnimationUtils = {
  // Animate node positions with smooth transitions
  animateNodePositions: (
    nodes: Node[],
    targetPositions: Record<string, { x: number; y: number }>,
    config: AnimationConfig = defaultAnimationConfig
  ): Promise<Node[]> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const initialPositions = nodes.reduce((acc, node) => {
        acc[node.id] = { ...node.position };
        return acc;
      }, {} as Record<string, { x: number; y: number }>);

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / config.duration, 1);

        // Apply easing function
        const easedProgress = AnimationUtils.easeFunction(progress, config.easing);

        const animatedNodes = nodes.map(node => {
          const startPos = initialPositions[node.id];
          const targetPos = targetPositions[node.id];

          if (!startPos || !targetPos) return node;

          return {
            ...node,
            position: {
              x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
              y: startPos.y + (targetPos.y - startPos.y) * easedProgress,
            },
          };
        });

        if (progress >= 1) {
          resolve(animatedNodes);
        } else {
          requestAnimationFrame(animate);
        }
      };

      setTimeout(() => {
        requestAnimationFrame(animate);
      }, config.delay || 0);
    });
  },

  // Easing functions
  easeFunction: (t: number, type: AnimationConfig['easing']): number => {
    switch (type) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'ease':
      default:
        return 1 - Math.cos((t * Math.PI) / 2);
    }
  },

  // Staggered animation for multiple elements
  staggeredAnimation: async (
    items: any[],
    animationFn: (item: any, index: number) => Promise<void>,
    staggerDelay: number = 50
  ): Promise<void> => {
    const promises = items.map((item, index) =>
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          await animationFn(item, index);
          resolve();
        }, index * staggerDelay);
      })
    );

    await Promise.all(promises);
  },

  // Smooth zoom transition
  animateZoom: (
    reactFlowInstance: ReactFlowInstance,
    targetZoom: number,
    config: AnimationConfig = defaultAnimationConfig
  ): Promise<void> => {
    return new Promise((resolve) => {
      const currentZoom = reactFlowInstance.getZoom();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / config.duration, 1);
        const easedProgress = AnimationUtils.easeFunction(progress, config.easing);

        const newZoom = currentZoom + (targetZoom - currentZoom) * easedProgress;
        reactFlowInstance.zoomTo(newZoom, { duration: 0 });

        if (progress >= 1) {
          resolve();
        } else {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    });
  },
};

// Transition-aware layout change hook
const useAnimatedLayoutChange = (
  reactFlowInstance: ReactFlowInstance | null,
  animationConfig: AnimationConfig = defaultAnimationConfig
) => {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const animateLayoutChange = React.useCallback(async (
    newNodes: Node[],
    layoutType: string,
    onComplete?: () => void
  ) => {
    if (!reactFlowInstance || isAnimating) return;

    setIsAnimating(true);

    try {
      // Create target position mapping
      const targetPositions = newNodes.reduce((acc, node) => {
        acc[node.id] = { ...node.position };
        return acc;
      }, {} as Record<string, { x: number; y: number }>);

      // Get current nodes for animation
      const currentNodes = reactFlowInstance.getNodes();

      // Animate to new positions
      await AnimationUtils.animateNodePositions(
        currentNodes,
        targetPositions,
        animationConfig
      );

      // Final update with exact positions
      reactFlowInstance.setNodes(newNodes);

      onComplete?.();
    } catch (error) {
      console.warn('Layout animation failed:', error);
      // Fallback to immediate update
      reactFlowInstance.setNodes(newNodes);
    } finally {
      setIsAnimating(false);
    }
  }, [reactFlowInstance, isAnimating, animationConfig]);

  return { animateLayoutChange, isAnimating };
};

// Node appearance animation component
const AnimatedNodeWrapper: React.FC<{
  children: React.ReactNode;
  nodeId: string;
  animationDelay?: number;
}> = ({ children, nodeId, animationDelay = 0 }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Advanced Filtering and Search System
// ============================================================================

interface FilterCriteria {
  entityTypes: string[];
  yearRange: { min: number; max: number } | null;
  citationRange: { min: number; max: number } | null;
  searchTerm: string;
  openAccessOnly: boolean;
  connectedOnly: boolean;
}

interface SearchResult {
  nodeId: string;
  relevanceScore: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  matchedField: 'label' | 'abstract' | 'author' | 'keyword';
}

const defaultFilterCriteria: FilterCriteria = {
  entityTypes: [],
  yearRange: null,
  citationRange: null,
  searchTerm: '',
  openAccessOnly: false,
  connectedOnly: false,
};

// Advanced filtering and search utilities
const FilteringUtils = {
  // Main filtering function
  filterNodes: (nodes: Node[], edges: Edge[], criteria: FilterCriteria): Node[] => {
    return nodes.filter(node => {
      const data = node.data as EntityNodeData;

      // Entity type filter
      if (criteria.entityTypes.length > 0 && !criteria.entityTypes.includes(data.entityType)) {
        return false;
      }

      // Year range filter
      if (criteria.yearRange && 'publication_year' in data) {
        const year = (data as any).publication_year;
        if (year < criteria.yearRange.min || year > criteria.yearRange.max) {
          return false;
        }
      }

      // Citation range filter
      if (criteria.citationRange && 'cited_by_count' in data) {
        const citations = (data as any).cited_by_count || 0;
        if (citations < criteria.citationRange.min || citations > criteria.citationRange.max) {
          return false;
        }
      }

      // Open access filter
      if (criteria.openAccessOnly && 'openAccessStatus' in data) {
        const openAccess = (data as any).openAccessStatus;
        if (!openAccess || openAccess === 'closed') {
          return false;
        }
      }

      // Connected nodes only filter
      if (criteria.connectedOnly) {
        const hasConnections = edges.some(edge =>
          edge.source === node.id || edge.target === node.id
        );
        if (!hasConnections) {
          return false;
        }
      }

      // Search term filter
      if (criteria.searchTerm) {
        const searchResult = FilteringUtils.searchNode(node, criteria.searchTerm);
        if (searchResult.relevanceScore === 0) {
          return false;
        }
      }

      return true;
    });
  },

  // Advanced search function with fuzzy matching
  searchNode: (node: Node, searchTerm: string): SearchResult => {
    const data = node.data as EntityNodeData;
    const normalizedTerm = searchTerm.toLowerCase().trim();

    if (!normalizedTerm) {
      return { nodeId: node.id, relevanceScore: 0, matchType: 'exact', matchedField: 'label' };
    }

    let bestMatch: SearchResult = {
      nodeId: node.id,
      relevanceScore: 0,
      matchType: 'exact',
      matchedField: 'label'
    };

    // Search in label (highest priority)
    const labelScore = FilteringUtils.calculateTextRelevance(data.label, normalizedTerm);
    if (labelScore > bestMatch.relevanceScore) {
      bestMatch = {
        nodeId: node.id,
        relevanceScore: labelScore,
        matchType: labelScore === 1 ? 'exact' : labelScore > 0.7 ? 'partial' : 'fuzzy',
        matchedField: 'label'
      };
    }

    // Search in abstract (medium priority)
    if ('abstract' in data && (data as any).abstract) {
      const abstractScore = FilteringUtils.calculateTextRelevance((data as any).abstract, normalizedTerm) * 0.8;
      if (abstractScore > bestMatch.relevanceScore) {
        bestMatch = {
          nodeId: node.id,
          relevanceScore: abstractScore,
          matchType: abstractScore === 0.8 ? 'exact' : abstractScore > 0.56 ? 'partial' : 'fuzzy',
          matchedField: 'abstract'
        };
      }
    }

    // Search in authors (medium priority)
    if ('authors' in data && Array.isArray((data as any).authors)) {
      const authorsText = (data as any).authors.join(' ').toLowerCase();
      const authorScore = FilteringUtils.calculateTextRelevance(authorsText, normalizedTerm) * 0.7;
      if (authorScore > bestMatch.relevanceScore) {
        bestMatch = {
          nodeId: node.id,
          relevanceScore: authorScore,
          matchType: authorScore === 0.7 ? 'exact' : authorScore > 0.49 ? 'partial' : 'fuzzy',
          matchedField: 'author'
        };
      }
    }

    // Search in keywords (lower priority)
    if ('keywords' in data && Array.isArray((data as any).keywords)) {
      const keywordsText = (data as any).keywords.join(' ').toLowerCase();
      const keywordScore = FilteringUtils.calculateTextRelevance(keywordsText, normalizedTerm) * 0.6;
      if (keywordScore > bestMatch.relevanceScore) {
        bestMatch = {
          nodeId: node.id,
          relevanceScore: keywordScore,
          matchType: keywordScore === 0.6 ? 'exact' : keywordScore > 0.42 ? 'partial' : 'fuzzy',
          matchedField: 'keyword'
        };
      }
    }

    return bestMatch;
  },

  // Calculate text relevance score using multiple techniques
  calculateTextRelevance: (text: string, searchTerm: string): number => {
    if (!text || !searchTerm) return 0;

    const normalizedText = text.toLowerCase();
    const normalizedTerm = searchTerm.toLowerCase();

    // Exact match (highest score)
    if (normalizedText === normalizedTerm) return 1;

    // Exact phrase match
    if (normalizedText.includes(normalizedTerm)) return 0.9;

    // Word boundary match
    const wordBoundaryRegex = new RegExp(`\\b${normalizedTerm}\\b`);
    if (wordBoundaryRegex.test(normalizedText)) return 0.8;

    // Fuzzy matching using Levenshtein distance
    const words = normalizedText.split(/\s+/);
    let maxFuzzyScore = 0;

    for (const word of words) {
      const distance = FilteringUtils.levenshteinDistance(word, normalizedTerm);
      const maxLength = Math.max(word.length, normalizedTerm.length);
      const similarity = 1 - (distance / maxLength);

      if (similarity > 0.7) { // Threshold for fuzzy match
        maxFuzzyScore = Math.max(maxFuzzyScore, similarity * 0.6);
      }
    }

    // Partial word matching
    const partialMatches = words.filter(word =>
      word.includes(normalizedTerm) || normalizedTerm.includes(word)
    );
    if (partialMatches.length > 0) {
      const partialScore = (partialMatches.length / words.length) * 0.5;
      maxFuzzyScore = Math.max(maxFuzzyScore, partialScore);
    }

    return maxFuzzyScore;
  },

  // Levenshtein distance calculation for fuzzy matching
  levenshteinDistance: (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  },

  // Filter edges based on filtered nodes
  filterEdges: (edges: Edge[], filteredNodes: Node[]): Edge[] => {
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    return edges.filter(edge =>
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  },

  // Highlight nodes based on search results
  highlightSearchResults: (nodes: Node[], searchResults: SearchResult[]): Node[] => {
    const resultMap = new Map(
      searchResults.map(result => [result.nodeId, result])
    );

    return nodes.map(node => {
      const searchResult = resultMap.get(node.id);
      if (!searchResult || searchResult.relevanceScore === 0) {
        return node;
      }

      // Apply highlight styling based on match quality
      const highlightIntensity = searchResult.relevanceScore;
      const highlightColor = searchResult.matchType === 'exact' ? '#fbbf24' :
                           searchResult.matchType === 'partial' ? '#f59e0b' : '#f97316';

      return {
        ...node,
        style: {
          ...node.style,
          boxShadow: `0 0 ${Math.round(highlightIntensity * 20)}px ${highlightColor}80`,
          border: `2px solid ${highlightColor}`,
          zIndex: 1000 + Math.round(highlightIntensity * 100),
        },
        data: {
          ...node.data,
          searchResult,
        },
      };
    });
  },
};

// Advanced Filter Panel Component
const AdvancedFilterPanel: React.FC<{
  criteria: FilterCriteria;
  onCriteriaChange: (criteria: FilterCriteria) => void;
  availableEntityTypes: string[];
  nodeCount: number;
  filteredCount: number;
}> = ({ criteria, onCriteriaChange, availableEntityTypes, nodeCount, filteredCount }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Panel position="top-left">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '280px' : '200px',
        maxHeight: isExpanded ? '400px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isExpanded ? '12px' : '0',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>🔍 Advanced Filters</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▼' : '▶'} {filteredCount}/{nodeCount}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Search Input */}
            <div>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Search Term
              </label>
              <input
                type="text"
                value={criteria.searchTerm}
                onChange={(e) => onCriteriaChange({ ...criteria, searchTerm: e.target.value })}
                placeholder="Search nodes..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              />
            </div>

            {/* Entity Types */}
            <div>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Entity Types
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {availableEntityTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const newTypes = criteria.entityTypes.includes(type)
                        ? criteria.entityTypes.filter(t => t !== type)
                        : [...criteria.entityTypes, type];
                      onCriteriaChange({ ...criteria, entityTypes: newTypes });
                    }}
                    style={{
                      padding: '3px 6px',
                      border: criteria.entityTypes.includes(type) ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      background: criteria.entityTypes.includes(type) ? '#eff6ff' : 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={criteria.openAccessOnly}
                  onChange={(e) => onCriteriaChange({ ...criteria, openAccessOnly: e.target.checked })}
                />
                <span>Open Access Only</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={criteria.connectedOnly}
                  onChange={(e) => onCriteriaChange({ ...criteria, connectedOnly: e.target.checked })}
                />
                <span>Connected Nodes Only</span>
              </label>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => onCriteriaChange(defaultFilterCriteria)}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
};

// ============================================================================
// Graph Metrics and Analysis Tools
// ============================================================================

interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  maxDegree: number;
  minDegree: number;
  connectedComponents: number;
  averageClustering: number;
  diameterEstimate: number;
  centralityStats: {
    topByDegree: Array<{ nodeId: string; degree: number; label: string }>;
    topByBetweenness: Array<{ nodeId: string; betweenness: number; label: string }>;
    topByCloseness: Array<{ nodeId: string; closeness: number; label: string }>;
  };
  citationStats?: {
    totalCitations: number;
    averageCitations: number;
    maxCitations: number;
    h_index: number;
    topCited: Array<{ nodeId: string; citations: number; label: string }>;
  };
  temporalStats?: {
    yearRange: { min: number; max: number };
    publicationsPerYear: Record<number, number>;
    citationsOverTime: Record<number, number>;
  };
}

interface NetworkAnalysisResult {
  nodeId: string;
  label: string;
  metrics: {
    degree: number;
    betweennessCentrality: number;
    closenessCentrality: number;
    clusteringCoefficient: number;
    pageRank: number;
  };
}

// Graph analysis utilities
const GraphAnalysisUtils = {
  // Calculate comprehensive graph metrics
  calculateGraphMetrics: (nodes: Node[], edges: Edge[]): GraphMetrics => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;

    if (nodeCount === 0) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        averageDegree: 0,
        maxDegree: 0,
        minDegree: 0,
        connectedComponents: 0,
        averageClustering: 0,
        diameterEstimate: 0,
        centralityStats: {
          topByDegree: [],
          topByBetweenness: [],
          topByCloseness: []
        }
      };
    }

    // Build adjacency map
    const adjacencyMap = new Map<string, Set<string>>();
    const degreeMap = new Map<string, number>();

    nodes.forEach(node => {
      adjacencyMap.set(node.id, new Set());
      degreeMap.set(node.id, 0);
    });

    edges.forEach(edge => {
      adjacencyMap.get(edge.source)?.add(edge.target);
      adjacencyMap.get(edge.target)?.add(edge.source);
      degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
    });

    // Basic metrics
    const degrees = Array.from(degreeMap.values());
    const maxDegree = Math.max(...degrees, 0);
    const minDegree = Math.min(...degrees, 0);
    const averageDegree = degrees.reduce((sum, deg) => sum + deg, 0) / nodeCount;
    const density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

    // Connected components
    const connectedComponents = GraphAnalysisUtils.countConnectedComponents(nodes, adjacencyMap);

    // Centrality calculations
    const centralityStats = GraphAnalysisUtils.calculateCentralityMetrics(nodes, adjacencyMap);

    // Clustering coefficient
    const averageClustering = GraphAnalysisUtils.calculateAverageClustering(nodes, adjacencyMap);

    // Diameter estimate (for large graphs, use sampling)
    const diameterEstimate = GraphAnalysisUtils.estimateDiameter(nodes, adjacencyMap);

    // Citation statistics (if available)
    const citationStats = GraphAnalysisUtils.calculateCitationStats(nodes);

    // Temporal statistics (if available)
    const temporalStats = GraphAnalysisUtils.calculateTemporalStats(nodes);

    return {
      nodeCount,
      edgeCount,
      density,
      averageDegree,
      maxDegree,
      minDegree,
      connectedComponents,
      averageClustering,
      diameterEstimate,
      centralityStats,
      citationStats,
      temporalStats
    };
  },

  // Count connected components using DFS
  countConnectedComponents: (nodes: Node[], adjacencyMap: Map<string, Set<string>>): number => {
    const visited = new Set<string>();
    let components = 0;

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      const neighbors = adjacencyMap.get(nodeId) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        }
      });
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
        components++;
      }
    });

    return components;
  },

  // Calculate centrality metrics
  calculateCentralityMetrics: (nodes: Node[], adjacencyMap: Map<string, Set<string>>) => {
    // Degree centrality
    const degreeResults = nodes.map(node => ({
      nodeId: node.id,
      degree: adjacencyMap.get(node.id)?.size || 0,
      label: (node.data as EntityNodeData).label
    })).sort((a, b) => b.degree - a.degree).slice(0, 5);

    // Simplified betweenness centrality (approximation for performance)
    const betweennessResults = GraphAnalysisUtils.calculateApproximateBetweenness(nodes, adjacencyMap);

    // Closeness centrality (approximation)
    const closenessResults = GraphAnalysisUtils.calculateApproximateCloseness(nodes, adjacencyMap);

    return {
      topByDegree: degreeResults,
      topByBetweenness: betweennessResults,
      topByCloseness: closenessResults
    };
  },

  // Approximate betweenness centrality for large graphs
  calculateApproximateBetweenness: (nodes: Node[], adjacencyMap: Map<string, Set<string>>) => {
    const betweenness = new Map<string, number>();
    nodes.forEach(node => betweenness.set(node.id, 0));

    // Sample a subset of nodes for efficiency
    const sampleSize = Math.min(nodes.length, 100);
    const sampleNodes = nodes.slice(0, sampleSize);

    sampleNodes.forEach(source => {
      const distances = new Map<string, number>();
      const predecessors = new Map<string, string[]>();
      const visited = new Set<string>();
      const queue = [source.id];

      distances.set(source.id, 0);
      visited.add(source.id);

      // BFS to find shortest paths
      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacencyMap.get(current) || new Set();

        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            distances.set(neighbor, (distances.get(current) || 0) + 1);
            predecessors.set(neighbor, [current]);
            queue.push(neighbor);
          } else if (distances.get(neighbor) === (distances.get(current) || 0) + 1) {
            const preds = predecessors.get(neighbor) || [];
            preds.push(current);
            predecessors.set(neighbor, preds);
          }
        });
      }

      // Update betweenness scores
      nodes.forEach(target => {
        if (target.id !== source.id) {
          GraphAnalysisUtils.updateBetweennessScores(source.id, target.id, predecessors, betweenness);
        }
      });
    });

    return nodes.map(node => ({
      nodeId: node.id,
      betweenness: betweenness.get(node.id) || 0,
      label: (node.data as EntityNodeData).label
    })).sort((a, b) => b.betweenness - a.betweenness).slice(0, 5);
  },

  updateBetweennessScores: (source: string, target: string, predecessors: Map<string, string[]>, betweenness: Map<string, number>) => {
    // Simplified betweenness calculation
    const preds = predecessors.get(target);
    if (preds && preds.length > 0) {
      preds.forEach(pred => {
        if (pred !== source) {
          betweenness.set(pred, (betweenness.get(pred) || 0) + 1);
        }
      });
    }
  },

  // Approximate closeness centrality
  calculateApproximateCloseness: (nodes: Node[], adjacencyMap: Map<string, Set<string>>) => {
    const closeness = nodes.map(node => {
      const distances = GraphAnalysisUtils.calculateDistancesFromNode(node.id, adjacencyMap, Math.min(nodes.length, 50));
      const totalDistance = Array.from(distances.values()).reduce((sum, dist) => sum + dist, 0);
      const reachableNodes = distances.size;

      const closenessValue = reachableNodes > 1 ? (reachableNodes - 1) / totalDistance : 0;

      return {
        nodeId: node.id,
        closeness: closenessValue,
        label: (node.data as EntityNodeData).label
      };
    }).sort((a, b) => b.closeness - a.closeness).slice(0, 5);

    return closeness;
  },

  calculateDistancesFromNode: (startId: string, adjacencyMap: Map<string, Set<string>>, maxDistance: number): Map<string, number> => {
    const distances = new Map<string, number>();
    const queue = [{ id: startId, dist: 0 }];
    distances.set(startId, 0);

    while (queue.length > 0) {
      const { id: current, dist } = queue.shift()!;

      if (dist >= maxDistance) continue;

      const neighbors = adjacencyMap.get(current) || new Set();
      neighbors.forEach(neighbor => {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, dist + 1);
          queue.push({ id: neighbor, dist: dist + 1 });
        }
      });
    }

    return distances;
  },

  // Calculate average clustering coefficient
  calculateAverageClustering: (nodes: Node[], adjacencyMap: Map<string, Set<string>>): number => {
    let totalClustering = 0;
    let validNodes = 0;

    nodes.forEach(node => {
      const neighbors = adjacencyMap.get(node.id) || new Set();
      const degree = neighbors.size;

      if (degree < 2) return; // Need at least 2 neighbors for clustering

      let triangles = 0;
      const neighborsArray = Array.from(neighbors);

      // Count triangles
      for (let i = 0; i < neighborsArray.length; i++) {
        for (let j = i + 1; j < neighborsArray.length; j++) {
          const neighbor1 = neighborsArray[i];
          const neighbor2 = neighborsArray[j];

          if (adjacencyMap.get(neighbor1)?.has(neighbor2)) {
            triangles++;
          }
        }
      }

      const possibleTriangles = (degree * (degree - 1)) / 2;
      const clusteringCoeff = possibleTriangles > 0 ? triangles / possibleTriangles : 0;

      totalClustering += clusteringCoeff;
      validNodes++;
    });

    return validNodes > 0 ? totalClustering / validNodes : 0;
  },

  // Estimate network diameter
  estimateDiameter: (nodes: Node[], adjacencyMap: Map<string, Set<string>>): number => {
    if (nodes.length === 0) return 0;

    let maxDistance = 0;
    const sampleSize = Math.min(nodes.length, 20); // Sample for efficiency

    for (let i = 0; i < sampleSize; i++) {
      const startNode = nodes[i];
      const distances = GraphAnalysisUtils.calculateDistancesFromNode(startNode.id, adjacencyMap, nodes.length);
      const maxDistFromNode = Math.max(...Array.from(distances.values()));
      maxDistance = Math.max(maxDistance, maxDistFromNode);
    }

    return maxDistance;
  },

  // Calculate citation statistics
  calculateCitationStats: (nodes: Node[]) => {
    const citationNodes = nodes.filter(node => 'cited_by_count' in node.data);

    if (citationNodes.length === 0) return undefined;

    const citations = citationNodes.map(node => (node.data as any).cited_by_count || 0);
    const totalCitations = citations.reduce((sum, cit) => sum + cit, 0);
    const averageCitations = totalCitations / citations.length;
    const maxCitations = Math.max(...citations);

    // Calculate h-index
    const sortedCitations = citations.sort((a, b) => b - a);
    let h_index = 0;
    for (let i = 0; i < sortedCitations.length; i++) {
      if (sortedCitations[i] >= i + 1) {
        h_index = i + 1;
      } else {
        break;
      }
    }

    // Top cited papers
    const topCited = citationNodes
      .map(node => ({
        nodeId: node.id,
        citations: (node.data as any).cited_by_count || 0,
        label: (node.data as EntityNodeData).label
      }))
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 5);

    return {
      totalCitations,
      averageCitations,
      maxCitations,
      h_index,
      topCited
    };
  },

  // Calculate temporal statistics
  calculateTemporalStats: (nodes: Node[]) => {
    const temporalNodes = nodes.filter(node => 'publication_year' in node.data);

    if (temporalNodes.length === 0) return undefined;

    const years = temporalNodes.map(node => (node.data as any).publication_year).filter(year => year);
    if (years.length === 0) return undefined;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Publications per year
    const publicationsPerYear: Record<number, number> = {};
    const citationsOverTime: Record<number, number> = {};

    temporalNodes.forEach(node => {
      const year = (node.data as any).publication_year;
      const citations = (node.data as any).cited_by_count || 0;

      publicationsPerYear[year] = (publicationsPerYear[year] || 0) + 1;
      citationsOverTime[year] = (citationsOverTime[year] || 0) + citations;
    });

    return {
      yearRange: { min: minYear, max: maxYear },
      publicationsPerYear,
      citationsOverTime
    };
  }
};

// Graph Metrics Panel Component
const GraphMetricsPanel: React.FC<{
  nodes: Node[];
  edges: Edge[];
}> = ({ nodes, edges }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [metrics, setMetrics] = React.useState<GraphMetrics | null>(null);
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Calculate metrics when expanded
  React.useEffect(() => {
    if (isExpanded && !metrics && !isCalculating) {
      setIsCalculating(true);

      // Use setTimeout to avoid blocking UI
      setTimeout(() => {
        const calculatedMetrics = GraphAnalysisUtils.calculateGraphMetrics(nodes, edges);
        setMetrics(calculatedMetrics);
        setIsCalculating(false);
      }, 100);
    }
  }, [isExpanded, metrics, isCalculating, nodes, edges]);

  // Reset metrics when nodes/edges change significantly
  React.useEffect(() => {
    setMetrics(null);
  }, [nodes.length, edges.length]);

  return (
    <Panel position="bottom-left">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '320px' : '180px',
        maxHeight: isExpanded ? '500px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: isExpanded ? 'auto' : 'hidden',
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>📊 Graph Analytics</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>

        {isExpanded && (
          <div>
            {isCalculating ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#6b7280'
              }}>
                <div style={{ marginBottom: '8px' }}>🔄 Calculating metrics...</div>
                <div style={{ fontSize: '10px' }}>Analyzing {nodes.length} nodes and {edges.length} edges</div>
              </div>
            ) : metrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Basic Network Stats */}
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                    Network Overview
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>Nodes: <strong>{metrics.nodeCount}</strong></div>
                    <div>Edges: <strong>{metrics.edgeCount}</strong></div>
                    <div>Density: <strong>{(metrics.density * 100).toFixed(1)}%</strong></div>
                    <div>Components: <strong>{metrics.connectedComponents}</strong></div>
                    <div>Avg Degree: <strong>{metrics.averageDegree.toFixed(1)}</strong></div>
                    <div>Diameter: <strong>{metrics.diameterEstimate}</strong></div>
                  </div>
                </div>

                {/* Centrality Stats */}
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                    Top Influential Nodes
                  </div>
                  <div style={{ fontSize: '10px' }}>
                    <div style={{ marginBottom: '4px', fontWeight: '500' }}>By Degree:</div>
                    {metrics.centralityStats.topByDegree.slice(0, 3).map((node, i) => (
                      <div key={node.nodeId} style={{ marginLeft: '8px', marginBottom: '2px' }}>
                        {i + 1}. {node.label.substring(0, 30)}... ({node.degree})
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citation Stats */}
                {metrics.citationStats && (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                      Citation Analysis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      <div>Total: <strong>{metrics.citationStats.totalCitations.toLocaleString()}</strong></div>
                      <div>Average: <strong>{Math.round(metrics.citationStats.averageCitations)}</strong></div>
                      <div>Max: <strong>{metrics.citationStats.maxCitations.toLocaleString()}</strong></div>
                      <div>H-index: <strong>{metrics.citationStats.h_index}</strong></div>
                    </div>
                    <div style={{ fontSize: '10px', marginTop: '6px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>Most Cited:</div>
                      {metrics.citationStats.topCited.slice(0, 2).map((paper, i) => (
                        <div key={paper.nodeId} style={{ marginLeft: '8px', marginBottom: '2px' }}>
                          {i + 1}. {paper.label.substring(0, 25)}... ({paper.citations.toLocaleString()})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Temporal Stats */}
                {metrics.temporalStats && (
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                      Temporal Analysis
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      <div>Years: <strong>{metrics.temporalStats.yearRange.min} - {metrics.temporalStats.yearRange.max}</strong></div>
                      <div>Span: <strong>{metrics.temporalStats.yearRange.max - metrics.temporalStats.yearRange.min + 1} years</strong></div>
                    </div>
                  </div>
                )}

                {/* Clustering */}
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                    Network Structure
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    <div>Clustering Coeff: <strong>{(metrics.averageClustering * 100).toFixed(1)}%</strong></div>
                    <div>Degree Range: <strong>{metrics.minDegree} - {metrics.maxDegree}</strong></div>
                  </div>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => {
                    setMetrics(null);
                    setIsExpanded(true); // This will trigger recalculation
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                >
                  🔄 Recalculate Metrics
                </button>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#6b7280'
              }}>
                Click to calculate graph metrics
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
};

// ============================================================================
// Export Functionality and Data Export Tools
// ============================================================================

interface ExportOptions {
  format: 'png' | 'svg' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  backgroundColor: string;
  includeBackground: boolean;
  width?: number;
  height?: number;
}

interface GraphDataExportOptions {
  format: 'json' | 'csv' | 'graphml' | 'gexf' | 'cytoscape';
  includeMetadata: boolean;
  includePositions: boolean;
  includeFiltered: boolean;
}

const defaultExportOptions: ExportOptions = {
  format: 'png',
  quality: 1.0,
  scale: 2,
  backgroundColor: '#ffffff',
  includeBackground: true,
};

const defaultDataExportOptions: GraphDataExportOptions = {
  format: 'json',
  includeMetadata: true,
  includePositions: true,
  includeFiltered: false,
};

// Export utilities
const ExportUtils = {
  // Export graph as image using html-to-image
  exportAsImage: async (
    reactFlowInstance: ReactFlowInstance,
    options: ExportOptions = defaultExportOptions
  ): Promise<string> => {
    const { toPng, toJpeg, toSvg } = await import('html-to-image');

    // Get the ReactFlow viewport element
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      throw new Error('ReactFlow viewport not found');
    }

    // Prepare export options
    const exportConfig = {
      quality: options.quality,
      pixelRatio: options.scale,
      backgroundColor: options.includeBackground ? options.backgroundColor : 'transparent',
      width: options.width,
      height: options.height,
      style: {
        transform: 'none',
      },
    };

    // Export based on format
    switch (options.format) {
      case 'png':
        return await toPng(viewport, exportConfig);
      case 'jpeg':
        return await toJpeg(viewport, exportConfig);
      case 'svg':
        return await toSvg(viewport, exportConfig);
      case 'webp':
        // Use toPng and convert to WebP (simplified approach)
        const pngDataUrl = await toPng(viewport, exportConfig);
        return ExportUtils.convertToWebP(pngDataUrl);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  },

  // Convert PNG data URL to WebP (simplified approach)
  convertToWebP: (pngDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        try {
          const webpDataUrl = canvas.toDataURL('image/webp', 0.9);
          resolve(webpDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = reject;
      img.src = pngDataUrl;
    });
  },

  // Download data URL as file
  downloadDataUrl: (dataUrl: string, filename: string): void => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export graph data in various formats
  exportGraphData: (
    nodes: Node[],
    edges: Edge[],
    options: GraphDataExportOptions = defaultDataExportOptions
  ): string => {
    switch (options.format) {
      case 'json':
        return ExportUtils.exportAsJSON(nodes, edges, options);
      case 'csv':
        return ExportUtils.exportAsCSV(nodes, edges, options);
      case 'graphml':
        return ExportUtils.exportAsGraphML(nodes, edges, options);
      case 'gexf':
        return ExportUtils.exportAsGEXF(nodes, edges, options);
      case 'cytoscape':
        return ExportUtils.exportAsCytoscape(nodes, edges, options);
      default:
        throw new Error(`Unsupported data export format: ${options.format}`);
    }
  },

  // Export as JSON
  exportAsJSON: (nodes: Node[], edges: Edge[], options: GraphDataExportOptions): string => {
    const exportData: any = {
      metadata: {
        exportedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        format: 'xyflow-json',
        version: '1.0'
      },
      nodes: nodes.map(node => {
        const exportNode: any = {
          id: node.id,
          type: node.type,
          data: options.includeMetadata ? node.data : { label: node.data.label }
        };

        if (options.includePositions) {
          exportNode.position = node.position;
        }

        return exportNode;
      }),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: options.includeMetadata ? edge.data : {}
      }))
    };

    return JSON.stringify(exportData, null, 2);
  },

  // Export as CSV (nodes and edges separately)
  exportAsCSV: (nodes: Node[], edges: Edge[], options: GraphDataExportOptions): string => {
    const nodeHeaders = ['id', 'type', 'label'];
    if (options.includePositions) {
      nodeHeaders.push('x', 'y');
    }
    if (options.includeMetadata) {
      nodeHeaders.push('entityType', 'citationCount', 'publicationYear');
    }

    const edgeHeaders = ['id', 'source', 'target', 'type'];
    if (options.includeMetadata) {
      edgeHeaders.push('weight', 'relationshipType');
    }

    // Nodes CSV
    const nodeRows = nodes.map(node => {
      const row = [
        node.id,
        node.type || '',
        `"${(node.data as any).label || ''}"`,
      ];

      if (options.includePositions) {
        row.push(node.position.x.toString(), node.position.y.toString());
      }

      if (options.includeMetadata) {
        const data = node.data as any;
        row.push(
          data.entityType || '',
          (data.cited_by_count || '').toString(),
          (data.publication_year || '').toString()
        );
      }

      return row.join(',');
    });

    // Edges CSV
    const edgeRows = edges.map(edge => {
      const row = [
        edge.id,
        edge.source,
        edge.target,
        edge.type || ''
      ];

      if (options.includeMetadata) {
        const data = edge.data as any;
        row.push(
          (data.weight || '').toString(),
          data.relationshipType || ''
        );
      }

      return row.join(',');
    });

    return `# Nodes\n${nodeHeaders.join(',')}\n${nodeRows.join('\n')}\n\n# Edges\n${edgeHeaders.join(',')}\n${edgeRows.join('\n')}`;
  },

  // Export as GraphML (XML format for graph data)
  exportAsGraphML: (nodes: Node[], edges: Edge[], options: GraphDataExportOptions): string => {
    let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">

  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="entityType" for="node" attr.name="entityType" attr.type="string"/>`;

    if (options.includePositions) {
      graphml += `
  <key id="x" for="node" attr.name="x" attr.type="double"/>
  <key id="y" for="node" attr.name="y" attr.type="double"/>`;
    }

    if (options.includeMetadata) {
      graphml += `
  <key id="citationCount" for="node" attr.name="citationCount" attr.type="int"/>
  <key id="publicationYear" for="node" attr.name="publicationYear" attr.type="int"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>`;
    }

    graphml += `

  <graph id="G" edgedefault="undirected">`;

    // Add nodes
    nodes.forEach(node => {
      const data = node.data as any;
      graphml += `
    <node id="${node.id}">
      <data key="label">${ExportUtils.escapeXml(data.label || '')}</data>
      <data key="entityType">${data.entityType || ''}</data>`;

      if (options.includePositions) {
        graphml += `
      <data key="x">${node.position.x}</data>
      <data key="y">${node.position.y}</data>`;
      }

      if (options.includeMetadata) {
        graphml += `
      <data key="citationCount">${data.cited_by_count || 0}</data>
      <data key="publicationYear">${data.publication_year || 0}</data>`;
      }

      graphml += `
    </node>`;
    });

    // Add edges
    edges.forEach(edge => {
      const data = edge.data as any;
      graphml += `
    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}">`;

      if (options.includeMetadata && data.weight) {
        graphml += `
      <data key="weight">${data.weight}</data>`;
      }

      graphml += `
    </edge>`;
    });

    graphml += `
  </graph>
</graphml>`;

    return graphml;
  },

  // Export as GEXF (Graph Exchange XML Format)
  exportAsGEXF: (nodes: Node[], edges: Edge[], options: GraphDataExportOptions): string => {
    let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta lastmodifieddate="${new Date().toISOString().split('T')[0]}">
    <creator>Academic Explorer</creator>
    <description>Graph exported from Academic Explorer</description>
  </meta>

  <graph mode="static" defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="0" title="label" type="string"/>
      <attribute id="1" title="entityType" type="string"/>`;

    if (options.includeMetadata) {
      gexf += `
      <attribute id="2" title="citationCount" type="integer"/>
      <attribute id="3" title="publicationYear" type="integer"/>`;
    }

    gexf += `
    </attributes>

    <nodes>`;

    // Add nodes
    nodes.forEach(node => {
      const data = node.data as any;
      gexf += `
      <node id="${node.id}" label="${ExportUtils.escapeXml(data.label || '')}">`;

      if (options.includePositions) {
        gexf += `
        <viz:position x="${node.position.x}" y="${node.position.y}"/>`;
      }

      gexf += `
        <attvalues>
          <attvalue for="0" value="${ExportUtils.escapeXml(data.label || '')}"/>
          <attvalue for="1" value="${data.entityType || ''}"/>`;

      if (options.includeMetadata) {
        gexf += `
          <attvalue for="2" value="${data.cited_by_count || 0}"/>
          <attvalue for="3" value="${data.publication_year || 0}"/>`;
      }

      gexf += `
        </attvalues>
      </node>`;
    });

    gexf += `
    </nodes>

    <edges>`;

    // Add edges
    edges.forEach((edge, index) => {
      gexf += `
      <edge id="${index}" source="${edge.source}" target="${edge.target}"/>`;
    });

    gexf += `
    </edges>
  </graph>
</gexf>`;

    return gexf;
  },

  // Export as Cytoscape.js format
  exportAsCytoscape: (nodes: Node[], edges: Edge[], options: GraphDataExportOptions): string => {
    const cytoscapeData = {
      elements: {
        nodes: nodes.map(node => {
          const data = node.data as any;
          const element: any = {
            data: {
              id: node.id,
              label: data.label || '',
              entityType: data.entityType || ''
            }
          };

          if (options.includePositions) {
            element.position = {
              x: node.position.x,
              y: node.position.y
            };
          }

          if (options.includeMetadata) {
            element.data.citationCount = data.cited_by_count || 0;
            element.data.publicationYear = data.publication_year || 0;
          }

          return element;
        }),
        edges: edges.map(edge => {
          const data = edge.data as any;
          const element: any = {
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target
            }
          };

          if (options.includeMetadata && data.weight) {
            element.data.weight = data.weight;
          }

          return element;
        })
      }
    };

    return JSON.stringify(cytoscapeData, null, 2);
  },

  // Utility function to escape XML characters
  escapeXml: (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  // Generate filename with timestamp
  generateFilename: (prefix: string, extension: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}-${timestamp}.${extension}`;
  }
};

// Export Panel Component
const ExportPanel: React.FC<{
  reactFlowInstance: ReactFlowInstance | null;
  nodes: Node[];
  edges: Edge[];
}> = ({ reactFlowInstance, nodes, edges }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [imageOptions, setImageOptions] = React.useState<ExportOptions>(defaultExportOptions);
  const [dataOptions, setDataOptions] = React.useState<GraphDataExportOptions>(defaultDataExportOptions);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleImageExport = async () => {
    if (!reactFlowInstance) {
      alert('Graph not ready for export');
      return;
    }

    setIsExporting(true);
    try {
      const dataUrl = await ExportUtils.exportAsImage(reactFlowInstance, imageOptions);
      const filename = ExportUtils.generateFilename('graph', imageOptions.format);
      ExportUtils.downloadDataUrl(dataUrl, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataExport = () => {
    setIsExporting(true);
    try {
      const data = ExportUtils.exportGraphData(nodes, edges, dataOptions);
      const extension = dataOptions.format === 'graphml' || dataOptions.format === 'gexf' ? 'xml' : dataOptions.format;
      const filename = ExportUtils.generateFilename('graph-data', extension);

      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      ExportUtils.downloadDataUrl(url, filename);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Data export failed:', error);
      alert('Data export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Panel position="bottom-right">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '280px' : '120px',
        maxHeight: isExpanded ? '400px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: isExpanded ? 'auto' : 'hidden',
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>💾 Export</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Image Export Section */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Export Image
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>Format:</label>
                  <select
                    value={imageOptions.format}
                    onChange={(e) => setImageOptions({
                      ...imageOptions,
                      format: e.target.value as ExportOptions['format']
                    })}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="svg">SVG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>Scale:</label>
                    <select
                      value={imageOptions.scale}
                      onChange={(e) => setImageOptions({
                        ...imageOptions,
                        scale: parseFloat(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={3}>3x</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>Quality:</label>
                    <select
                      value={imageOptions.quality}
                      onChange={(e) => setImageOptions({
                        ...imageOptions,
                        quality: parseFloat(e.target.value)
                      })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}
                    >
                      <option value={0.7}>Low (70%)</option>
                      <option value={0.9}>High (90%)</option>
                      <option value={1.0}>Max (100%)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleImageExport}
                  disabled={isExporting || !reactFlowInstance}
                  style={{
                    padding: '6px 12px',
                    background: isExporting ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {isExporting ? '📤 Exporting...' : '📷 Export Image'}
                </button>
              </div>
            </div>

            {/* Data Export Section */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Export Data
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>Format:</label>
                  <select
                    value={dataOptions.format}
                    onChange={(e) => setDataOptions({
                      ...dataOptions,
                      format: e.target.value as GraphDataExportOptions['format']
                    })}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="graphml">GraphML</option>
                    <option value="gexf">GEXF</option>
                    <option value="cytoscape">Cytoscape.js</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                    <input
                      type="checkbox"
                      checked={dataOptions.includeMetadata}
                      onChange={(e) => setDataOptions({
                        ...dataOptions,
                        includeMetadata: e.target.checked
                      })}
                    />
                    Include Metadata
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                    <input
                      type="checkbox"
                      checked={dataOptions.includePositions}
                      onChange={(e) => setDataOptions({
                        ...dataOptions,
                        includePositions: e.target.checked
                      })}
                    />
                    Include Positions
                  </label>
                </div>

                <button
                  onClick={handleDataExport}
                  disabled={isExporting}
                  style={{
                    padding: '6px 12px',
                    background: isExporting ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  {isExporting ? '📤 Exporting...' : '📄 Export Data'}
                </button>
              </div>
            </div>

            <div style={{
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '10px',
              color: '#9ca3af'
            }}>
              {nodes.length} nodes, {edges.length} edges ready for export
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

// Enhanced MiniMap Component with custom styling and navigation
const EnhancedMiniMap: React.FC<{
  rfInstance: ReactFlowInstance | null;
  nodes: Node[];
  edges: Edge[];
  selectedNodes: Set<string>;
  currentZoom: number;
  config: any;
}> = ({ rfInstance, nodes, edges, selectedNodes, currentZoom, config }) => {
  const [minimapMode, setMinimapMode] = React.useState<'standard' | 'heatmap' | 'cluster' | 'selection'>('standard');
  const [showMinimapControls, setShowMinimapControls] = React.useState(false);
  const [minimapZoom, setMinimapZoom] = React.useState(0.1);
  const [showEdgesOnMinimap, setShowEdgesOnMinimap] = React.useState(false);

  // Enhanced node color function based on mode
  const getEnhancedNodeColor = React.useCallback((node: Node) => {
    const isSelected = selectedNodes.has(node.id);
    const entityData = node.data as EntityNodeData;

    switch (minimapMode) {
      case 'selection':
        return isSelected ? '#3b82f6' : '#e5e7eb';

      case 'heatmap':
        // Color based on citation count
        const citationCount = entityData.citationCount || 0;
        if (citationCount === 0) return '#f3f4f6';
        if (citationCount < 10) return '#fef3c7';
        if (citationCount < 50) return '#fed7aa';
        if (citationCount < 100) return '#fca5a5';
        return '#dc2626';

      case 'cluster':
        // Color based on entity type
        const entityType = entityData.entityType;
        const colorMap: Record<string, string> = {
          'work': '#3b82f6',
          'author': '#059669',
          'source': '#dc2626',
          'institution': '#7c3aed',
          'concept': '#ea580c',
          'publisher': '#0891b2',
          'funder': '#be123c'
        };
        return colorMap[entityType] || '#6b7280';

      default:
        return isSelected ? '#1d4ed8' : (entityData.entityType === 'work' ? '#3b82f6' : '#6b7280');
    }
  }, [minimapMode, selectedNodes]);

  // Custom node stroke color
  const getNodeStrokeColor = React.useCallback((node: Node) => {
    const isSelected = selectedNodes.has(node.id);
    return isSelected ? '#1e40af' : 'transparent';
  }, [selectedNodes]);

  // Navigation utilities for minimap
  const MinimapUtils = {
    focusOnSelection: () => {
      if (!rfInstance || selectedNodes.size === 0) return;

      const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
      if (selectedNodeObjects.length === 0) return;

      const bounds = {
        minX: Math.min(...selectedNodeObjects.map(n => n.position.x)),
        minY: Math.min(...selectedNodeObjects.map(n => n.position.y)),
        maxX: Math.max(...selectedNodeObjects.map(n => n.position.x + (n.width || 100))),
        maxY: Math.max(...selectedNodeObjects.map(n => n.position.y + (n.height || 50)))
      };

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      // Calculate zoom to fit selection with padding
      const padding = 100;
      const container = rfInstance.getViewport();
      const zoomX = (window.innerWidth - padding) / width;
      const zoomY = (window.innerHeight - padding) / height;
      const zoom = Math.min(zoomX, zoomY, 2); // Max zoom 2x

      rfInstance.setCenter(centerX, centerY, { zoom });
    },

    resetView: () => {
      if (!rfInstance) return;
      rfInstance.fitView({ padding: 0.1, maxZoom: 1.5 });
    },

    zoomToArea: (x: number, y: number, width: number, height: number) => {
      if (!rfInstance) return;

      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const padding = 50;

      const zoomX = (window.innerWidth - padding) / width;
      const zoomY = (window.innerHeight - padding) / height;
      const zoom = Math.min(zoomX, zoomY, 3);

      rfInstance.setCenter(centerX, centerY, { zoom });
    },

    panToNode: (nodeId: string) => {
      if (!rfInstance) return;

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      rfInstance.setCenter(node.position.x, node.position.y, { zoom: Math.max(currentZoom, 1) });
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <MiniMap
        nodeColor={getEnhancedNodeColor}
        nodeStrokeColor={getNodeStrokeColor}
        nodeClassName={(node) => `enhanced-minimap-node ${minimapMode}-mode`}
        maskColor={config.maskColor || 'rgba(0, 0, 0, 0.2)'}
        position={config.position || 'bottom-right'}
        ariaLabel="Enhanced graph minimap with navigation tools"
        zoomable={true}
        pannable={true}
        onClick={(event, position) => {
          // Custom click handler for minimap navigation
          if (rfInstance) {
            rfInstance.setCenter(position.x, position.y);
          }
        }}
      />

      {/* Minimap Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '6px',
          padding: showMinimapControls ? '8px' : '4px',
          fontSize: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          maxWidth: showMinimapControls ? '180px' : '30px',
          overflow: 'hidden'
        }}
        onClick={() => setShowMinimapControls(!showMinimapControls)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{showMinimapControls ? '🗺️' : '⚙️'}</span>
          {showMinimapControls && <span style={{ fontWeight: '600' }}>Minimap</span>}
        </div>

        {showMinimapControls && (
          <div style={{
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {/* View Mode Selector */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                View Mode
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                {[
                  { mode: 'standard' as const, label: 'Standard', icon: '⚪' },
                  { mode: 'heatmap' as const, label: 'Citations', icon: '🔥' },
                  { mode: 'cluster' as const, label: 'Type', icon: '🏷️' },
                  { mode: 'selection' as const, label: 'Selected', icon: '🎯' }
                ].map(({ mode, label, icon }) => (
                  <button
                    key={mode}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMinimapMode(mode);
                    }}
                    style={{
                      padding: '3px 6px',
                      border: minimapMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      background: minimapMode === mode ? '#eff6ff' : 'white',
                      borderRadius: '3px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      justifyContent: 'center'
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Tools */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                Navigation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    MinimapUtils.resetView();
                  }}
                  style={{
                    padding: '3px 6px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    borderRadius: '3px',
                    fontSize: '9px',
                    cursor: 'pointer'
                  }}
                >
                  🏠 Fit All
                </button>
                {selectedNodes.size > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      MinimapUtils.focusOnSelection();
                    }}
                    style={{
                      padding: '3px 6px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '3px',
                      fontSize: '9px',
                      cursor: 'pointer'
                    }}
                  >
                    🎯 Focus Selected
                  </button>
                )}
              </div>
            </div>

            {/* Options */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                Options
              </div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '9px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={showEdgesOnMinimap}
                  onChange={(e) => {
                    e.stopPropagation();
                    setShowEdgesOnMinimap(e.target.checked);
                  }}
                  style={{ width: '12px', height: '12px' }}
                />
                Show Edges
              </label>
            </div>

            {/* Minimap Stats */}
            <div style={{
              paddingTop: '6px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '8px',
              color: '#9ca3af'
            }}>
              <div>Zoom: {(currentZoom * 100).toFixed(0)}%</div>
              <div>Nodes: {nodes.length}</div>
              {selectedNodes.size > 0 && (
                <div>Selected: {selectedNodes.size}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mode Legend */}
      {minimapMode === 'heatmap' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Citations</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', background: '#f3f4f6', borderRadius: '50%' }}></span>
            <span>0</span>
            <span style={{ width: '8px', height: '8px', background: '#fef3c7', borderRadius: '50%' }}></span>
            <span>10+</span>
            <span style={{ width: '8px', height: '8px', background: '#fed7aa', borderRadius: '50%' }}></span>
            <span>50+</span>
            <span style={{ width: '8px', height: '8px', background: '#dc2626', borderRadius: '50%' }}></span>
            <span>100+</span>
          </div>
        </div>
      )}

      {minimapMode === 'cluster' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          maxWidth: '140px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>Entity Types</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px' }}>
            {[
              { type: 'work', color: '#3b82f6', label: 'Works' },
              { type: 'author', color: '#059669', label: 'Authors' },
              { type: 'source', color: '#dc2626', label: 'Sources' },
              { type: 'institution', color: '#7c3aed', label: 'Institutions' }
            ].map(({ type, color, label }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }}></span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Monitor Panel Component for real-time performance tracking and optimization
const PerformanceMonitorPanel: React.FC<{
  performanceMetrics: any;
  PerformanceMonitor: any;
  performanceHistory: Array<any>;
}> = ({ performanceMetrics, PerformanceMonitor, performanceHistory }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = React.useState(false);

  const performanceStats = PerformanceMonitor.getPerformanceStats();
  const isPerformanceGood = performanceMetrics.frameRate >= 30 && performanceMetrics.renderTime < 50;

  const getPerformanceColor = () => {
    if (performanceMetrics.frameRate >= 45) return '#059669'; // Green
    if (performanceMetrics.frameRate >= 30) return '#d97706'; // Orange
    return '#dc2626'; // Red
  };

  const getMemoryColor = () => {
    if (performanceMetrics.memoryUsage < 50) return '#059669';
    if (performanceMetrics.memoryUsage < 100) return '#d97706';
    return '#dc2626';
  };

  const handleAutoOptimize = () => {
    const optimizationsApplied = PerformanceMonitor.applyOptimizations();
    if (optimizationsApplied > 0) {
      alert(`Applied ${optimizationsApplied} automatic optimizations`);
    } else {
      alert('No optimizations needed at this time');
    }
  };

  // Simple performance chart using CSS
  const renderMiniChart = (data: number[], color: string) => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'end',
        height: '30px',
        width: '100px',
        gap: '1px',
        background: '#f9fafb',
        borderRadius: '2px',
        padding: '2px'
      }}>
        {data.slice(-20).map((value, index) => {
          const height = Math.max(((value - min) / range) * 26, 2);
          return (
            <div
              key={index}
              style={{
                width: '4px',
                height: `${height}px`,
                background: color,
                borderRadius: '1px',
                opacity: 0.7 + (index / data.length) * 0.3
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Panel position="top-left">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '300px' : '120px',
        maxHeight: isExpanded ? '500px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: isExpanded ? 'auto' : 'hidden',
        border: `2px solid ${getPerformanceColor()}`,
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>⚡ Performance ({performanceMetrics.frameRate}fps)</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Real-time Metrics */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Real-time Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{
                  padding: '6px',
                  background: '#f9fafb',
                  borderRadius: '4px',
                  border: `1px solid ${getPerformanceColor()}`
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Frame Rate</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: getPerformanceColor() }}>
                    {performanceMetrics.frameRate} fps
                  </div>
                </div>
                <div style={{
                  padding: '6px',
                  background: '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Render Time</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {performanceMetrics.renderTime.toFixed(1)}ms
                  </div>
                </div>
                <div style={{
                  padding: '6px',
                  background: '#f9fafb',
                  borderRadius: '4px',
                  border: `1px solid ${getMemoryColor()}`
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Memory</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: getMemoryColor() }}>
                    {performanceMetrics.memoryUsage}MB
                  </div>
                </div>
                <div style={{
                  padding: '6px',
                  background: '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>Graph Size</div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {performanceMetrics.nodeCount}N+{performanceMetrics.edgeCount}E
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Charts */}
            {performanceHistory.length > 0 && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                  Performance Trends
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>FPS:</span>
                    {renderMiniChart(performanceHistory.map(p => p.frameRate), getPerformanceColor())}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>Render:</span>
                    {renderMiniChart(performanceHistory.map(p => p.renderTime), '#6b7280')}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>Memory:</span>
                    {renderMiniChart(performanceHistory.map(p => p.memoryUsage), getMemoryColor())}
                  </div>
                </div>
              </div>
            )}

            {/* Optimization Suggestions */}
            {performanceMetrics.optimizationSuggestions.length > 0 && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                  Optimization Suggestions
                </div>
                <div style={{
                  maxHeight: '100px',
                  overflow: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '6px',
                  background: '#fef3c7'
                }}>
                  {performanceMetrics.optimizationSuggestions.map((suggestion: string, index: number) => (
                    <div key={index} style={{
                      fontSize: '10px',
                      color: '#92400e',
                      marginBottom: '4px',
                      paddingLeft: '8px',
                      position: 'relative'
                    }}>
                      <span style={{ position: 'absolute', left: '0' }}>•</span>
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={handleAutoOptimize}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #3b82f6',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      flex: 1
                    }}
                  >
                    🚀 Auto-Optimize
                  </button>
                  <button
                    onClick={() => PerformanceMonitor.exportPerformanceData()}
                    style={{
                      padding: '6px 8px',
                      border: '1px solid #6b7280',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Export
                  </button>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoOptimizeEnabled}
                    onChange={(e) => setAutoOptimizeEnabled(e.target.checked)}
                    style={{ width: '12px', height: '12px' }}
                  />
                  <span>Auto-optimize when needed</span>
                </label>
              </div>
            </div>

            {/* Advanced Statistics */}
            <div>
              <div
                style={{
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: '#1f2937',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>Advanced Stats</span>
                <span style={{ fontSize: '8px' }}>{showAdvanced ? '▼' : '▶'}</span>
              </div>

              {showAdvanced && performanceStats && (
                <div style={{
                  padding: '6px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <div>Avg FPS: {performanceStats.averageFrameRate}</div>
                    <div>Min FPS: {performanceStats.minFrameRate}</div>
                    <div>Avg Render: {performanceStats.averageRenderTime}ms</div>
                    <div>Max Render: {performanceStats.maxRenderTime}ms</div>
                    <div>Avg Memory: {performanceStats.averageMemoryUsage}MB</div>
                    <div>Samples: {performanceStats.sampleCount}</div>
                  </div>
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
                    <div>Render Calls: {performanceMetrics.renderCalls}</div>
                    <div>Zoom Level: {(performanceMetrics.zoomLevel * 100).toFixed(0)}%</div>
                    <div>Last Update: {new Date(performanceMetrics.lastUpdate).toLocaleTimeString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Status Summary */}
            <div style={{
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '9px',
              color: '#9ca3af'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: isPerformanceGood ? '#059669' : '#dc2626'
              }}>
                <span>{isPerformanceGood ? '✅' : '⚠️'}</span>
                <span>
                  {isPerformanceGood ? 'Performance is good' : 'Performance needs attention'}
                </span>
              </div>
              <div style={{ marginTop: '2px' }}>
                Monitoring: {performanceHistory.length}/30 samples
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

// Layout Persistence Panel Component for saving, loading, and managing graph layouts
const LayoutPersistencePanel: React.FC<{
  LayoutPersistence: any;
  savedLayouts: Record<string, any>;
  layoutHistory: Array<any>;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
}> = ({
  LayoutPersistence,
  savedLayouts,
  layoutHistory,
  autoSaveEnabled,
  setAutoSaveEnabled
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [newLayoutName, setNewLayoutName] = React.useState('');
  const [newLayoutDescription, setNewLayoutDescription] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const layoutStats = LayoutPersistence.getLayoutStats();
  const sortedLayouts = Object.values(savedLayouts).sort((a, b) => b.timestamp - a.timestamp);

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) return;

    setIsProcessing(true);
    try {
      const layoutId = LayoutPersistence.saveLayout(newLayoutName.trim(), newLayoutDescription.trim());
      if (layoutId) {
        setNewLayoutName('');
        setNewLayoutDescription('');
        setSaveDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
      alert('Failed to save layout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadLayout = async (layoutId: string) => {
    setIsProcessing(true);
    try {
      const success = await LayoutPersistence.loadLayout(layoutId);
      if (!success) {
        alert('Failed to load layout. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
      alert('Failed to load layout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (confirm('Are you sure you want to delete this layout?')) {
      LayoutPersistence.deleteLayout(layoutId);
    }
  };

  const handleImportLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      LayoutPersistence.importLayout(file).then((layoutId: string | null) => {
        if (layoutId) {
          alert('Layout imported successfully!');
        } else {
          alert('Failed to import layout. Please check the file format.');
        }
        setIsProcessing(false);
      });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Panel position="top-right">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '320px' : '140px',
        maxHeight: isExpanded ? '500px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: isExpanded ? 'auto' : 'hidden',
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>💾 Layouts ({layoutStats.totalLayouts})</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Quick Actions */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Quick Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={isProcessing}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #059669',
                      background: '#059669',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      flex: 1
                    }}
                  >
                    💾 Save Layout
                  </button>
                  {layoutHistory.length > 0 && (
                    <button
                      onClick={() => LayoutPersistence.undo()}
                      disabled={isProcessing}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #6b7280',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ↶ Undo
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                  >
                    📁 Import
                  </button>
                  <button
                    onClick={() => LayoutPersistence.exportLayout()}
                    disabled={isProcessing}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                  >
                    📤 Export
                  </button>
                  <button
                    onClick={() => LayoutPersistence.restoreAutoSave()}
                    disabled={isProcessing}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                  >
                    🔄 Restore
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportLayout}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Auto-save Toggle */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Settings
              </div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  style={{ width: '12px', height: '12px' }}
                />
                <span>Auto-save every 30s</span>
              </label>
            </div>

            {/* Saved Layouts */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Saved Layouts
              </div>
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '4px'
              }}>
                {sortedLayouts.length === 0 ? (
                  <div style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '10px'
                  }}>
                    No saved layouts yet
                  </div>
                ) : (
                  sortedLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      style={{
                        padding: '6px',
                        border: '1px solid #f3f4f6',
                        borderRadius: '3px',
                        marginBottom: '4px',
                        background: 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '10px',
                          color: '#1f2937',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {layout.name}
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button
                            onClick={() => handleLoadLayout(layout.id)}
                            disabled={isProcessing}
                            style={{
                              padding: '2px 4px',
                              border: '1px solid #3b82f6',
                              background: '#3b82f6',
                              color: 'white',
                              borderRadius: '2px',
                              fontSize: '8px',
                              cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => LayoutPersistence.exportLayout(layout.id)}
                            disabled={isProcessing}
                            style={{
                              padding: '2px 4px',
                              border: '1px solid #6b7280',
                              background: '#f3f4f6',
                              borderRadius: '2px',
                              fontSize: '8px',
                              cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                          >
                            📤
                          </button>
                          <button
                            onClick={() => handleDeleteLayout(layout.id)}
                            disabled={isProcessing}
                            style={{
                              padding: '2px 4px',
                              border: '1px solid #dc2626',
                              background: '#dc2626',
                              color: 'white',
                              borderRadius: '2px',
                              fontSize: '8px',
                              cursor: isProcessing ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '8px', color: '#6b7280' }}>
                        <div>
                          {layout.metadata.nodeCount} nodes, {layout.metadata.edgeCount} edges
                        </div>
                        <div>
                          {layout.metadata.algorithm} • {formatTimeAgo(layout.timestamp)}
                        </div>
                        {layout.metadata.description && (
                          <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                            {layout.metadata.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Layout Statistics */}
            <div style={{
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '9px',
              color: '#9ca3af'
            }}>
              <div>History: {layoutHistory.length}/10 entries</div>
              <div>Auto-save: {autoSaveEnabled ? 'Enabled' : 'Disabled'}</div>
              {layoutStats.totalLayouts > 0 && (
                <div>
                  Algorithms: {layoutStats.algorithms.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Layout Dialog */}
      {saveDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            width: '300px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Save Layout
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Layout Name *
              </label>
              <input
                type="text"
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="Enter layout name..."
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Description (Optional)
              </label>
              <textarea
                value={newLayoutDescription}
                onChange={(e) => setNewLayoutDescription(e.target.value)}
                placeholder="Describe this layout..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '12px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSaveDialogOpen(false)}
                disabled={isProcessing}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLayout}
                disabled={isProcessing || !newLayoutName.trim()}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #059669',
                  background: isProcessing || !newLayoutName.trim() ? '#9ca3af' : '#059669',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: isProcessing || !newLayoutName.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {isProcessing ? 'Saving...' : 'Save Layout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

// Selection Panel Component for enhanced node selection and bulk operations
const SelectionPanel: React.FC<{
  selectedNodes: Set<string>;
  selectionMode: 'single' | 'multi' | 'box';
  setSelectionMode: (mode: 'single' | 'multi' | 'box') => void;
  SelectionUtils: any;
  BulkOperations: any;
  nodes: Node[];
  availableEntityTypes: string[];
}> = ({
  selectedNodes,
  selectionMode,
  setSelectionMode,
  SelectionUtils,
  BulkOperations,
  nodes,
  availableEntityTypes
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [arrangementPattern, setArrangementPattern] = React.useState<'line' | 'circle' | 'grid'>('grid');
  const selectionStats = SelectionUtils.getSelectionStats();

  return (
    <Panel position="bottom-left">
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        minWidth: isExpanded ? '300px' : '140px',
        maxHeight: isExpanded ? '450px' : 'auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        overflow: isExpanded ? 'auto' : 'hidden',
      }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>🎯 Selection ({selectedNodes.size})</span>
          <span style={{ fontSize: '10px' }}>
            {isExpanded ? '▼' : '▲'}
          </span>
        </div>

        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Selection Mode */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Selection Mode
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { mode: 'single' as const, label: 'Single', icon: '👆' },
                  { mode: 'multi' as const, label: 'Multi', icon: '👆👆' },
                  { mode: 'box' as const, label: 'Box', icon: '⬜' }
                ].map(({ mode, label, icon }) => (
                  <button
                    key={mode}
                    onClick={() => setSelectionMode(mode)}
                    style={{
                      padding: '4px 8px',
                      border: selectionMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      background: selectionMode === mode ? '#eff6ff' : 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Selection Tools */}
            <div>
              <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                Quick Select
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={SelectionUtils.selectAll}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={SelectionUtils.selectNone}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    None
                  </button>
                </div>

                {/* Select by Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>By Type:</label>
                  <select
                    onChange={(e) => e.target.value && SelectionUtils.selectByType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '10px'
                    }}
                  >
                    <option value="">Select type...</option>
                    {availableEntityTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selection Stats */}
            {selectedNodes.size > 0 && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                  Selection Info
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  <div>Nodes: {selectionStats.nodeCount}</div>
                  <div>Connected Edges: {selectionStats.connectedEdges}</div>
                  <div>Total Edges: {selectionStats.totalEdges}</div>
                  {Object.keys(selectionStats.entityTypes).length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      Types: {Object.entries(selectionStats.entityTypes)
                        .map(([type, count]) => `${type}(${count})`)
                        .join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Operations */}
            {selectedNodes.size > 0 && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>
                  Bulk Actions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={BulkOperations.hideSelected}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e5e7eb',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Hide
                    </button>
                    <button
                      onClick={BulkOperations.showSelected}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e5e7eb',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Show
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={BulkOperations.lockSelected}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e5e7eb',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Lock
                    </button>
                    <button
                      onClick={BulkOperations.unlockSelected}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e5e7eb',
                        background: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Unlock
                    </button>
                  </div>

                  {selectedNodes.size >= 2 && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '2px', fontSize: '10px' }}>Arrange:</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <select
                            value={arrangementPattern}
                            onChange={(e) => setArrangementPattern(e.target.value as any)}
                            style={{
                              flex: 1,
                              padding: '4px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}
                          >
                            <option value="grid">Grid</option>
                            <option value="line">Line</option>
                            <option value="circle">Circle</option>
                          </select>
                          <button
                            onClick={() => BulkOperations.arrangeSelected(arrangementPattern)}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid #3b82f6',
                              background: '#3b82f6',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer'
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => BulkOperations.groupSelected()}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #059669',
                          background: '#059669',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        🏷️ Group Selected
                      </button>
                    </>
                  )}

                  <button
                    onClick={BulkOperations.deleteSelected}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #dc2626',
                      background: '#dc2626',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    🗑️ Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Keyboard shortcuts info */}
            <div style={{
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '9px',
              color: '#9ca3af'
            }}>
              Ctrl+Click: multi-select • Shift+Click: range select
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

// Helper function to calculate cluster bounds
const calculateClusterBounds = (nodes: Node[]) => {
  if (nodes.length === 0) return null;

  const positions = nodes.map(node => ({
    x: node.position.x,
    y: node.position.y,
  }));

  return {
    minX: Math.min(...positions.map(p => p.x)) - 50,
    minY: Math.min(...positions.map(p => p.y)) - 30,
    maxX: Math.max(...positions.map(p => p.x)) + 150,
    maxY: Math.max(...positions.map(p => p.y)) + 90,
  };
};

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  compact: CompactEntityNode,
};

// ============================================================================
// xyflow Engine Implementation
// ============================================================================

export class XyflowEngine<TVertexData = unknown, TEdgeData = unknown>
  implements IGraphEngine<TVertexData, TEdgeData> {

  // Engine identification
  readonly id = 'xyflow';
  readonly name = 'xyflow (React Flow)';
  readonly description = 'Modern React-based flow diagram library with excellent performance and built-in features';
  readonly version = '12.8.4';
  readonly isImplemented = true;

  // Engine capabilities
  readonly capabilities: IEngineCapabilities = {
    maxVertices: 5000,
    maxEdges: 10000,
    supportsHardwareAcceleration: false, // Uses React DOM rendering
    supportsInteractiveLayout: true,
    supportsPhysicsSimulation: false, // No built-in physics, but has positioning
    supportsClustering: false, // No built-in clustering
    supportsCustomShapes: true,
    supportsEdgeBundling: false,
    exportFormats: ['png', 'json'],
    memoryUsage: 'medium',
    cpuUsage: 'low',
    batteryImpact: 'moderate',
  };

  // Installation requirements
  readonly requirements: IEngineRequirements = {
    dependencies: [
      { name: '@xyflow/react', version: '^12.8.4' },
    ],
    browserSupport: {
      chrome: 88,
      firefox: 85,
      safari: 14,
      edge: 88,
    },
    requiredFeatures: [
      'ES6 Modules',
      'React 18+',
      'CSS Grid',
      'ResizeObserver',
    ],
    setupInstructions: `
# Install xyflow React Flow
npm install @xyflow/react

# Import in your component
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

# Basic setup
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
>
  <Background />
  <Controls />
  <MiniMap />
</ReactFlow>
    `.trim(),
  };

  // Current status
  private _status: IEngineStatus = {
    isInitialised: false,
    isRendering: false,
  };

  get status(): IEngineStatus {
    return this._status;
  }

  // Private state
  private container: HTMLElement | null = null;
  private dimensions: IDimensions = { width: 800, height: 600 };
  private config: IXyflowConfig = {};
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private reactFlowInstance: ReactFlowInstance | null = null;

  // ============================================================================
  // Engine Implementation
  // ============================================================================

  async initialise(
    container: HTMLElement,
    dimensions: IDimensions,
    config?: IEngineConfig
  ): Promise<void> {
    this.container = container;
    this.dimensions = dimensions;
    this.config = { ...this.getDefaultConfig(), ...config } as IXyflowConfig;

    try {
      // Clear the container
      container.innerHTML = '';

      // xyflow will be rendered via React components
      // The actual rendering happens in the React component

      this._status = {
        isInitialised: true,
        isRendering: false,
      };

    } catch (error) {
      this._status = {
        isInitialised: false,
        isRendering: false,
        lastError: error instanceof Error ? error.message : 'Failed to initialise xyflow engine',
      };
      throw error;
    }
  }

  async loadGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    config?: IGraphConfig<TVertexData, TEdgeData>
  ): Promise<void> {
    if (!this._status.isInitialised) {
      throw new Error('Engine not initialised');
    }

    // Validate input graph
    if (!graph || !Array.isArray(graph.vertices) || !Array.isArray(graph.edges)) {
      throw new Error('Invalid graph structure: missing vertices or edges arrays');
    }

    // Handle empty graph gracefully
    if (graph.vertices.length === 0) {
      this.nodes = [];
      this.edges = [];
      this._status = { ...this._status, isRendering: false };
      return;
    }

    try {
      this._status = { ...this._status, isRendering: true };

      // Convert graph vertices to xyflow nodes with enhanced data
      let tempNodes = graph.vertices.map((vertex, index) => {
        // Start with a default position - will be updated by layout algorithm
        const position = { x: 0, y: 0 };
        const entityType = this.getVertexType(vertex);
        const vertexData = vertex.data || {};

        // Determine node type based on graph density
        const nodeType = graph.vertices.length > 50 ? 'compact' : 'entity';

        return {
          id: vertex.id,
          type: nodeType,
          position,
          data: {
            label: this.getVertexLabel(vertex),
            entityType,
            originalVertex: vertex,
            // Extract additional metadata for enhanced display
            citationCount: ('cited_by_count' in vertexData ? vertexData.cited_by_count : null) ||
                          ('citation_count' in vertexData ? vertexData.citation_count : null) || 0,
            publicationYear: ('publication_year' in vertexData ? vertexData.publication_year : null) ||
                            ('published_year' in vertexData ? vertexData.published_year : null),
            openAccessStatus: ('open_access' in vertexData && vertexData.open_access && typeof vertexData.open_access === 'object' && 'oa_type' in vertexData.open_access ? vertexData.open_access.oa_type : null) ||
                             ('oa_type' in vertexData ? vertexData.oa_type : null),
            isSelected: false,
          } as EntityNodeData,
        } as Node;
      });

      // Convert graph edges to xyflow edges with enhanced styling (needed for layout algorithms)
      const tempEdges = graph.edges.map((edge) => {
        return {
          id: `${edge.sourceId}-${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
          type: 'smoothstep',
        } as Edge;
      });

      // Apply layout algorithm based on configuration with error handling
      const layoutAlgorithm = this.config.layout?.algorithm || 'force';
      const layoutDirection = this.config.layout?.direction || 'TB';

      try {
        switch (layoutAlgorithm) {
          case 'dagre':
            this.nodes = this.applyDagreLayout(tempNodes, tempEdges, layoutDirection);
            break;
          case 'force':
            this.nodes = this.applyForceLayout(tempNodes, tempEdges);
            break;
          case 'hierarchical':
            // Use dagre for hierarchical layout
            this.nodes = this.applyDagreLayout(tempNodes, tempEdges, layoutDirection);
            break;
          case 'manual':
            // For manual layout, use a simple grid arrangement
            this.nodes = this.applyGridLayout(tempNodes);
            break;
          default:
            // Fallback to force layout
            this.nodes = this.applyForceLayout(tempNodes, tempEdges);
        }
      } catch (layoutError) {
        // Fallback to simple grid layout if any layout algorithm fails
        console.warn(`Layout algorithm '${layoutAlgorithm}' failed, falling back to grid layout:`, layoutError);
        this.nodes = this.applyGridLayout(tempNodes);
      }

      // Convert graph edges to xyflow edges with enhanced styling
      this.edges = graph.edges.map((edge) => {
        const edgeData = edge.data || {};
        const rawWeight = ('weight' in edgeData ? edgeData.weight : null);
        const weight = typeof rawWeight === 'number' ? rawWeight : 1;
        const relationshipType = ('type' in edgeData ? edgeData.type : null) || 'default';

        // Enhanced edge appearance based on relationship strength and type
        const strokeWidth = Math.max(1.5, Math.min(4, weight * 3));
        const isStrong = weight > 0.7;
        const isMedium = weight > 0.4;

        // Sophisticated color scheme based on strength
        const getEdgeColor = (strength: number): string => {
          if (strength > 0.8) return '#059669'; // Strong - green
          if (strength > 0.6) return '#3b82f6'; // Medium-strong - blue
          if (strength > 0.3) return '#f59e0b'; // Medium - amber
          return '#94a3b8'; // Weak - gray
        };

        const edgeColor = getEdgeColor(weight);
        const opacity = Math.max(0.4, Math.min(0.9, 0.4 + (weight * 0.5)));

        // Determine custom edge type based on relationship
        const getCustomEdgeType = (type: string): string => {
          switch (type) {
            case 'citation':
            case 'cites':
            case 'cited_by':
              return 'citation';
            case 'collaboration':
            case 'coauthor':
            case 'co-author':
              return 'collaboration';
            case 'influence':
            case 'influenced_by':
            case 'references':
              return 'influence';
            default:
              return 'smoothstep'; // Fallback to default xyflow edge type
          }
        };

        const customEdgeType = getCustomEdgeType(relationshipType);

        return {
          id: `${edge.sourceId}-${edge.targetId}`,
          source: edge.sourceId,
          target: edge.targetId,
          type: customEdgeType,
          animated: isStrong,
          style: {
            stroke: edgeColor,
            strokeWidth,
            strokeDasharray: relationshipType === 'indirect' ? '8,4' :
                           relationshipType === 'potential' ? '4,4' : undefined,
            opacity,
            strokeLinecap: 'round',
            transition: 'all 0.2s ease-in-out',
          },
          markerEnd: {
            type: 'arrowclosed',
            color: edgeColor,
            width: Math.max(16, strokeWidth * 4),
            height: Math.max(16, strokeWidth * 4),
          },
          data: {
            originalEdge: edge,
            weight,
            relationshipType,
          },
        } as Edge;
      });

      this._status = { ...this._status, isRendering: false };

    } catch (error) {
      this._status = {
        ...this._status,
        isRendering: false,
        lastError: error instanceof Error ? error.message : 'Failed to load graph',
      };
      throw error;
    }
  }

  async updateGraph(
    graph: IGraph<TVertexData, TEdgeData>,
    animate = true
  ): Promise<void> {
    // For xyflow, updates are handled by React state changes
    // This method will be called by the React component
    await this.loadGraph(graph);
  }

  resize(dimensions: IDimensions): void {
    this.dimensions = dimensions;
    // xyflow handles resizing automatically via ResizeObserver
    if (this.reactFlowInstance) {
      // Trigger a fitView after resize
      setTimeout(() => {
        this.reactFlowInstance?.fitView({
          padding: 50,
          duration: 300,
        });
      }, 100);
    }
  }

  async export(
    format: 'png' | 'svg' | 'json' | 'pdf',
    options?: Record<string, unknown>
  ): Promise<string | Blob> {
    if (format === 'json') {
      return JSON.stringify({
        nodes: this.nodes,
        edges: this.edges,
        viewport: this.reactFlowInstance?.getViewport(),
      }, null, 2);
    }

    if ((format === 'png' || format === 'svg') && this.container && this.reactFlowInstance) {
      try {
        // Find the React Flow viewport element
        const viewportElement = this.container.querySelector('.react-flow__viewport');
        if (!viewportElement) {
          throw new Error('React Flow viewport element not found');
        }

        // Configure export options
        const exportOptions = {
          backgroundColor: options?.backgroundColor ? String(options.backgroundColor) : '#ffffff',
          width: options?.width ? Number(options.width) : this.dimensions.width,
          height: options?.height ? Number(options.height) : this.dimensions.height,
          style: {
            transform: 'none',
          },
          filter: (node: Element) => {
            // Exclude certain elements that shouldn't be in the export
            if (node.classList?.contains('react-flow__controls') ||
                node.classList?.contains('react-flow__minimap') ||
                node.classList?.contains('react-flow__attribution')) {
              return false;
            }
            return true;
          },
        };

        if (format === 'png') {
          return await toPng(viewportElement as HTMLElement, exportOptions);
        } else if (format === 'svg') {
          return await toSvg(viewportElement as HTMLElement, exportOptions);
        }
      } catch (error) {
        throw new Error(`Failed to export ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error(`Export format ${format} not supported by xyflow engine`);
  }

  getPositions(): ReadonlyArray<IPositionedVertex<TVertexData>> {
    return this.nodes.map(node => ({
      id: node.id,
      position: { x: node.position.x, y: node.position.y },
      data: node.data.originalVertex && 'data' in node.data.originalVertex ? node.data.originalVertex.data : undefined,
    }));
  }

  setPositions(
    positions: ReadonlyArray<IPositionedVertex<TVertexData>>,
    animate = true
  ): void {
    // Update node positions
    this.nodes = this.nodes.map(node => {
      const newPosition = positions.find(p => p.id === node.id);
      if (newPosition) {
        return {
          ...node,
          position: { x: newPosition.position.x, y: newPosition.position.y },
        };
      }
      return node;
    });
  }

  fitToView(padding = 50, animate = true): void {
    if (this.reactFlowInstance) {
      this.reactFlowInstance.fitView({
        padding,
        duration: animate ? 300 : 0,
      });
    }
  }

  destroy(): void {
    this.container = null;
    this.reactFlowInstance = null;
    this.nodes = [];
    this.edges = [];
    this._status = {
      isInitialised: false,
      isRendering: false,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getDefaultConfig(): IXyflowConfig {
    return {
      xyflowOptions: {
        fitView: true,
        fitViewOptions: {
          padding: 50,
          duration: 300,
        },
        nodeTypes,
        edgeTypes,
        background: {
          variant: BackgroundVariant.Dots,
          gap: 20,
          size: 1,
          color: '#e2e8f0',
        },
        controls: {
          showZoom: true,
          showFitView: true,
          showInteractive: true,
          position: 'bottom-left',
          orientation: 'vertical',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        miniMap: {
          position: 'bottom-right',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          ariaLabel: 'Graph minimap for navigation overview',
          nodeColor: (node: Node) => {
            const data = node.data as EntityNodeData;
            return getEntityColour(data.entityType);
          },
          nodeStrokeColor: (node: Node) => {
            return node.selected ? '#1f2937' : 'rgba(255, 255, 255, 0.8)';
          },
          nodeClassName: (node: Node) => {
            return node.selected ? 'selected-minimap-node' : 'minimap-node';
          },
        },
        nodes: {
          focusable: true,
          defaultSize: { width: 100, height: 60 },
          selectionColor: '#3b82f6',
        },
        edges: {
          focusable: true,
          selectionColor: '#3b82f6',
        },
        interaction: {
          nodesDraggable: true,
          nodesConnectable: false,
          elementsSelectable: true,
          selectNodesOnDrag: false,
          panOnDrag: true,
          minZoom: 0.1,
          maxZoom: 2,
          zoomOnScroll: true,
          zoomOnPinch: true,
          zoomOnDoubleClick: true,
        },
      },
      layout: {
        algorithm: 'force',
        direction: 'TB',
        spacing: {
          node: [120, 90], // Slightly more spacing for better readability
          rank: 100, // Increased rank spacing for clearer hierarchy
        },
      },
    };
  }

  // ============================================================================
  // Layout Algorithms
  // ============================================================================

  private applyDagreLayout(nodes: Node[], edges: Edge[], direction: 'TB' | 'BT' | 'LR' | 'RL' = 'TB'): Node[] {
    const g = new dagre.graphlib.Graph();

    // Use spacing configuration if available
    const nodeSpacing = this.config.layout?.spacing?.node || [120, 90];
    const rankSpacing = this.config.layout?.spacing?.rank || 100;

    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: nodeSpacing[0],
      ranksep: rankSpacing,
      marginx: 20,
      marginy: 20,
    });

    // Add nodes to dagre graph
    nodes.forEach((node) => {
      g.setNode(node.id, {
        width: node.data.entityType === 'work' ? 120 : 100,
        height: node.data.entityType === 'work' ? 80 : 60,
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(g);

    // Apply calculated positions to nodes
    return nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });
  }

  private applyForceLayout(nodes: Node[], edges: Edge[]): Node[] {
    // Simple force-directed layout simulation
    const iterations = 100;
    const k = Math.sqrt((this.dimensions.width * this.dimensions.height) / nodes.length);
    const positions = new Map(nodes.map(node => [node.id, { ...node.position }]));

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });

      // Repulsive forces between all pairs of nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          if (!node1 || !node2) continue;

          const pos1 = positions.get(node1.id);
          const pos2 = positions.get(node2.id);
          if (!pos1 || !pos2) continue;

          const dx = pos1.x - pos2.x;
          const dy = pos1.y - pos2.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = k * k / distance;
          const fx = force * dx / distance;
          const fy = force * dy / distance;

          const force1 = forces.get(node1.id);
          const force2 = forces.get(node2.id);
          if (!force1 || !force2) continue;

          force1.x += fx;
          force1.y += fy;
          force2.x -= fx;
          force2.y -= fy;
        }
      }

      // Attractive forces along edges
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = distance * distance / k;
        const fx = force * dx / distance;
        const fy = force * dy / distance;

        const force1 = forces.get(edge.source);
        const force2 = forces.get(edge.target);
        if (!force1 || !force2) return;

        force1.x += fx;
        force1.y += fy;
        force2.x -= fx;
        force2.y -= fy;
      });

      // Apply forces with cooling
      const temperature = 0.9 ** iter;
      forces.forEach((force, nodeId) => {
        const pos = positions.get(nodeId);
        if (!pos) return;

        const displacement = Math.sqrt(force.x * force.x + force.y * force.y) || 1;
        const limitedDisplacement = Math.min(displacement, temperature * k);

        pos.x += (force.x / displacement) * limitedDisplacement;
        pos.y += (force.y / displacement) * limitedDisplacement;

        // Keep nodes within bounds
        pos.x = Math.max(50, Math.min(this.dimensions.width - 50, pos.x));
        pos.y = Math.max(50, Math.min(this.dimensions.height - 50, pos.y));
      });
    }

    // Apply calculated positions to nodes
    return nodes.map(node => ({
      ...node,
      position: positions.get(node.id) || { x: 0, y: 0 },
    }));
  }

  private applyCircularLayout(nodes: Node[]): Node[] {
    const centerX = this.dimensions.width / 2;
    const centerY = this.dimensions.height / 2;
    const radius = Math.min(this.dimensions.width, this.dimensions.height) * 0.3;

    return nodes.map((node, index) => {
      if (nodes.length === 1) {
        return { ...node, position: { x: centerX, y: centerY } };
      }

      const angle = (index / nodes.length) * Math.PI * 2;
      return {
        ...node,
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
      };
    });
  }

  private applyGridLayout(nodes: Node[]): Node[] {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const nodeSpacing = this.config.layout?.spacing?.node || [120, 90];
    const nodeWidth = nodeSpacing[0];
    const nodeHeight = nodeSpacing[1];
    const startX = (this.dimensions.width - (cols * nodeWidth)) / 2;
    const startY = 50;

    return nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      return {
        ...node,
        position: {
          x: startX + col * nodeWidth,
          y: startY + row * nodeHeight,
        },
      };
    });
  }


  private getVertexLabel(vertex: any): string {
    if (vertex.data?.display_name) return vertex.data.display_name;
    if (vertex.data?.title) return vertex.data.title;
    if (vertex.data?.name) return vertex.data.name;
    return vertex.id || 'Node';
  }

  private getVertexType(vertex: any): string {
    if (vertex.entityType) return vertex.entityType;
    if (vertex.data?.type) return vertex.data.type;
    if (vertex.id?.startsWith('A')) return 'author';
    if (vertex.id?.startsWith('W')) return 'work';
    if (vertex.id?.startsWith('I')) return 'institution';
    if (vertex.id?.startsWith('S')) return 'source';
    return 'entity';
  }

  // ============================================================================
  // React Component for Integration
  // ============================================================================

  getReactComponent(): React.ComponentType<{
    width: number;
    height: number;
    onReady?: (instance: ReactFlowInstance) => void;
  }> {
    const engine = this;

    return function XyflowComponent({ width, height, onReady }) {
      const [nodes, setNodes, onNodesChange] = useNodesState(engine.nodes);
      const [edges, setEdges, onEdgesChange] = useEdgesState(engine.edges);
      const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

      // Animation system integration
      const { animateLayoutChange, isAnimating } = useAnimatedLayoutChange(rfInstance, {
        duration: 1000,
        easing: 'ease-in-out',
      });
      const [layoutTransitionActive, setLayoutTransitionActive] = useState(false);

      // Tooltip state management
      const [nodeTooltip, setNodeTooltip] = useState<{
        node: Node | null;
        position: { x: number; y: number };
        visible: boolean;
      }>({ node: null, position: { x: 0, y: 0 }, visible: false });

      const [edgeTooltip, setEdgeTooltip] = useState<{
        edge: Edge | null;
        position: { x: number; y: number };
        visible: boolean;
      }>({ edge: null, position: { x: 0, y: 0 }, visible: false });

      // Context menu state management
      const [nodeContextMenu, setNodeContextMenu] = useState<{
        node: Node | null;
        position: { x: number; y: number };
        visible: boolean;
      }>({ node: null, position: { x: 0, y: 0 }, visible: false });

      const [edgeContextMenu, setEdgeContextMenu] = useState<{
        edge: Edge | null;
        position: { x: number; y: number };
        visible: boolean;
      }>({ edge: null, position: { x: 0, y: 0 }, visible: false });

      const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
      );

      const onInit = useCallback((instance: ReactFlowInstance) => {
        setRfInstance(instance);
        engine.reactFlowInstance = instance;
        onReady?.(instance);
      }, [onReady]);

      // Interactive tooltip handlers
      const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
        setNodeTooltip({
          node,
          position: { x: event.clientX, y: event.clientY },
          visible: true,
        });
      }, []);

      const onNodeMouseLeave = useCallback(() => {
        setNodeTooltip(prev => ({ ...prev, visible: false }));
      }, []);

      const onNodeMouseMove = useCallback((event: React.MouseEvent, node: Node) => {
        setNodeTooltip(prev => ({
          ...prev,
          position: { x: event.clientX, y: event.clientY },
        }));
      }, []);

      const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
        setEdgeTooltip({
          edge,
          position: { x: event.clientX, y: event.clientY },
          visible: true,
        });
      }, []);

      const onEdgeMouseLeave = useCallback(() => {
        setEdgeTooltip(prev => ({ ...prev, visible: false }));
      }, []);

      const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (rfInstance) {
          // Focus on the double-clicked node
          rfInstance.fitView({
            nodes: [node],
            padding: 0.8,
            duration: 500,
          });
        }
      }, [rfInstance]);

      // Context menu handlers
      const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setNodeContextMenu({
          node,
          position: { x: event.clientX, y: event.clientY },
          visible: true,
        });
        // Hide tooltips when context menu appears
        setNodeTooltip(prev => ({ ...prev, visible: false }));
      }, []);

      const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.preventDefault();
        setEdgeContextMenu({
          edge,
          position: { x: event.clientX, y: event.clientY },
          visible: true,
        });
        // Hide tooltips when context menu appears
        setEdgeTooltip(prev => ({ ...prev, visible: false }));
      }, []);

      const closeNodeContextMenu = useCallback(() => {
        setNodeContextMenu(prev => ({ ...prev, visible: false }));
      }, []);

      const closeEdgeContextMenu = useCallback(() => {
        setEdgeContextMenu(prev => ({ ...prev, visible: false }));
      }, []);

      // Keyboard navigation handler
      const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (!rfInstance) return;

        // Focus management and navigation
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedNode = selectedNodes[0];

        switch (event.key) {
          case 'Escape':
            // Clear selection
            setNodes(nodes => nodes.map(node => ({ ...node, selected: false })));
            setEdges(edges => edges.map(edge => ({ ...edge, selected: false })));
            event.preventDefault();
            break;

          case 'Tab':
            // Focus next/previous node
            if (nodes.length > 0) {
              event.preventDefault();
              const currentIndex = selectedNode ? nodes.findIndex(n => n.id === selectedNode.id) : -1;
              const nextIndex = event.shiftKey
                ? (currentIndex - 1 + nodes.length) % nodes.length
                : (currentIndex + 1) % nodes.length;

              setNodes(nodes => nodes.map((node, index) => ({
                ...node,
                selected: index === nextIndex
              })));
            }
            break;

          case 'Enter':
          case ' ':
            // Activate/select focused node
            if (selectedNode) {
              event.preventDefault();
              // Could trigger node details or other actions
            }
            break;

          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight':
            // Pan the viewport or move selected node
            if (selectedNode && !event.shiftKey) {
              event.preventDefault();
              const step = 20;
              const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
              const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;

              setNodes(nodes => nodes.map(node =>
                node.id === selectedNode.id
                  ? { ...node, position: { x: node.position.x + deltaX, y: node.position.y + deltaY } }
                  : node
              ));
            } else if (event.shiftKey) {
              // Pan the viewport
              event.preventDefault();
              const panStep = 50;
              const deltaX = event.key === 'ArrowLeft' ? panStep : event.key === 'ArrowRight' ? -panStep : 0;
              const deltaY = event.key === 'ArrowUp' ? panStep : event.key === 'ArrowDown' ? -panStep : 0;

              const viewport = rfInstance.getViewport();
              rfInstance.setViewport({
                x: viewport.x + deltaX,
                y: viewport.y + deltaY,
                zoom: viewport.zoom
              });
            }
            break;

          case '+':
          case '=':
            // Zoom in
            event.preventDefault();
            rfInstance.zoomIn();
            break;

          case '-':
            // Zoom out
            event.preventDefault();
            rfInstance.zoomOut();
            break;

          case '0':
            // Fit view
            event.preventDefault();
            rfInstance.fitView();
            break;
        }
      }, [rfInstance, nodes, setNodes, setEdges]);

      // Performance optimization - Level of Detail based on zoom
      const [currentZoom, setCurrentZoom] = useState(1);
      const shouldShowCompactNodes = currentZoom < 0.5 || nodes.length > 100;
      const shouldShowEdgeLabels = currentZoom > 0.8 && nodes.length < 200;

      // Viewport change handler for performance optimization
      const onViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
        setCurrentZoom(viewport.zoom);
      }, []);

      // Enhanced Node Selection and Multi-Selection System
      const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
      const [selectionMode, setSelectionMode] = useState<'single' | 'multi' | 'box'>('single');
      const [selectionBoxActive, setSelectionBoxActive] = useState(false);
      const [lastSelectedNode, setLastSelectedNode] = useState<string | null>(null);

      // Selection utilities
      const SelectionUtils = React.useMemo(() => ({
        selectNode: (nodeId: string, multi: boolean = false) => {
          if (multi) {
            setSelectedNodes(prev => {
              const newSelection = new Set(prev);
              if (newSelection.has(nodeId)) {
                newSelection.delete(nodeId);
              } else {
                newSelection.add(nodeId);
              }
              return newSelection;
            });
          } else {
            setSelectedNodes(new Set([nodeId]));
          }
          setLastSelectedNode(nodeId);
        },

        selectRange: (fromNodeId: string, toNodeId: string) => {
          const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
          const fromIndex = sortedNodes.findIndex(n => n.id === fromNodeId);
          const toIndex = sortedNodes.findIndex(n => n.id === toNodeId);

          if (fromIndex === -1 || toIndex === -1) return;

          const start = Math.min(fromIndex, toIndex);
          const end = Math.max(fromIndex, toIndex);

          setSelectedNodes(new Set(sortedNodes.slice(start, end + 1).map(n => n.id)));
        },

        selectAll: () => {
          setSelectedNodes(new Set(nodes.map(n => n.id)));
        },

        selectNone: () => {
          setSelectedNodes(new Set());
          setLastSelectedNode(null);
        },

        selectByType: (entityType: string) => {
          const typeNodes = nodes
            .filter(node => (node.data as EntityNodeData).entityType === entityType)
            .map(n => n.id);
          setSelectedNodes(new Set(typeNodes));
        },

        selectByProperty: (property: string, value: unknown) => {
          const matchingNodes = nodes
            .filter(node => {
              const data = node.data as EntityNodeData;
              return (data as any)[property] === value;
            })
            .map(n => n.id);
          setSelectedNodes(new Set(matchingNodes));
        },

        selectConnected: (nodeId: string, includeOriginal: boolean = true) => {
          const connectedIds = new Set<string>();
          if (includeOriginal) connectedIds.add(nodeId);

          edges.forEach(edge => {
            if (edge.source === nodeId) connectedIds.add(edge.target);
            if (edge.target === nodeId) connectedIds.add(edge.source);
          });

          setSelectedNodes(connectedIds);
        },

        selectNeighborhood: (nodeId: string, depth: number = 1) => {
          const neighborhoodIds = new Set<string>([nodeId]);
          let currentLevel = new Set([nodeId]);

          for (let i = 0; i < depth; i++) {
            const nextLevel = new Set<string>();

            currentLevel.forEach(id => {
              edges.forEach(edge => {
                if (edge.source === id && !neighborhoodIds.has(edge.target)) {
                  nextLevel.add(edge.target);
                  neighborhoodIds.add(edge.target);
                }
                if (edge.target === id && !neighborhoodIds.has(edge.source)) {
                  nextLevel.add(edge.source);
                  neighborhoodIds.add(edge.source);
                }
              });
            });

            currentLevel = nextLevel;
            if (currentLevel.size === 0) break;
          }

          setSelectedNodes(neighborhoodIds);
        },

        getSelectionStats: () => {
          const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
          const entityTypes = selectedNodeObjects.reduce((acc, node) => {
            const type = (node.data as EntityNodeData).entityType || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const connectedEdges = edges.filter(edge =>
            selectedNodes.has(edge.source) && selectedNodes.has(edge.target)
          );

          return {
            nodeCount: selectedNodes.size,
            entityTypes,
            connectedEdges: connectedEdges.length,
            totalEdges: edges.filter(edge =>
              selectedNodes.has(edge.source) || selectedNodes.has(edge.target)
            ).length
          };
        }
      }), [nodes, edges]);

      // Bulk operations on selected nodes
      const BulkOperations = React.useMemo(() => ({
        deleteSelected: () => {
          setNodes(prev => prev.filter(n => !selectedNodes.has(n.id)));
          setEdges(prev => prev.filter(e =>
            !selectedNodes.has(e.source) && !selectedNodes.has(e.target)
          ));
          setSelectedNodes(new Set());
        },

        hideSelected: () => {
          setNodes(prev => prev.map(n =>
            selectedNodes.has(n.id)
              ? { ...n, hidden: true }
              : n
          ));
        },

        showSelected: () => {
          setNodes(prev => prev.map(n =>
            selectedNodes.has(n.id)
              ? { ...n, hidden: false }
              : n
          ));
        },

        lockSelected: () => {
          setNodes(prev => prev.map(n =>
            selectedNodes.has(n.id)
              ? { ...n, draggable: false }
              : n
          ));
        },

        unlockSelected: () => {
          setNodes(prev => prev.map(n =>
            selectedNodes.has(n.id)
              ? { ...n, draggable: true }
              : n
          ));
        },

        groupSelected: (color: string = '#3b82f6') => {
          const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
          if (selectedNodeObjects.length < 2) return;

          const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
          const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
          const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x + (n.width || 100)));
          const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y + (n.height || 50)));

          const groupNode = {
            id: `group-${Date.now()}`,
            type: 'group',
            position: { x: minX - 10, y: minY - 30 },
            style: {
              width: maxX - minX + 20,
              height: maxY - minY + 40,
              background: `${color}10`,
              border: `2px dashed ${color}`,
              borderRadius: '8px',
              zIndex: -1
            },
            data: { label: `Group (${selectedNodes.size} nodes)` }
          };

          setNodes(prev => [...prev, groupNode]);
        },

        arrangeSelected: (pattern: 'line' | 'circle' | 'grid') => {
          const selectedNodeObjects = nodes.filter(n => selectedNodes.has(n.id));
          if (selectedNodeObjects.length < 2) return;

          const centerX = selectedNodeObjects.reduce((sum, n) => sum + n.position.x, 0) / selectedNodeObjects.length;
          const centerY = selectedNodeObjects.reduce((sum, n) => sum + n.position.y, 0) / selectedNodeObjects.length;

          let newPositions: { x: number; y: number }[] = [];

          switch (pattern) {
            case 'line':
              newPositions = selectedNodeObjects.map((_, i) => ({
                x: centerX - (selectedNodeObjects.length - 1) * 50 + i * 100,
                y: centerY
              }));
              break;
            case 'circle':
              const radius = Math.max(100, selectedNodeObjects.length * 20);
              newPositions = selectedNodeObjects.map((_, i) => {
                const angle = (i / selectedNodeObjects.length) * 2 * Math.PI;
                return {
                  x: centerX + radius * Math.cos(angle),
                  y: centerY + radius * Math.sin(angle)
                };
              });
              break;
            case 'grid':
              const cols = Math.ceil(Math.sqrt(selectedNodeObjects.length));
              newPositions = selectedNodeObjects.map((_, i) => ({
                x: centerX + (i % cols) * 120 - ((cols - 1) * 120) / 2,
                y: centerY + Math.floor(i / cols) * 80 - (Math.ceil(selectedNodeObjects.length / cols) - 1) * 40
              }));
              break;
          }

          setNodes(prev => prev.map(n => {
            const selectedIndex = selectedNodeObjects.findIndex(sn => sn.id === n.id);
            if (selectedIndex >= 0) {
              return { ...n, position: newPositions[selectedIndex] };
            }
            return n;
          }));
        }
      }), [nodes, selectedNodes, setNodes, setEdges]);

      // Enhanced node click handler with selection modes
      const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        event.stopPropagation();

        const isCtrlClick = event.ctrlKey || event.metaKey;
        const isShiftClick = event.shiftKey;

        if (isShiftClick && lastSelectedNode && selectionMode !== 'single') {
          // Range selection
          SelectionUtils.selectRange(lastSelectedNode, node.id);
        } else if (isCtrlClick && selectionMode !== 'single') {
          // Multi-selection toggle
          SelectionUtils.selectNode(node.id, true);
        } else {
          // Single selection
          SelectionUtils.selectNode(node.id, false);
        }
      }, [lastSelectedNode, selectionMode, nodes, edges]);

      // Update nodes with selection state
      const nodesWithSelection = React.useMemo(() => {
        return nodes.map(node => ({
          ...node,
          selected: selectedNodes.has(node.id)
        }));
      }, [nodes, selectedNodes]);

      // Graph Layout Persistence and State Management System
      const [savedLayouts, setSavedLayouts] = useState<Record<string, {
        id: string;
        name: string;
        timestamp: number;
        layout: {
          nodes: Node[];
          edges: Edge[];
          viewport: { x: number; y: number; zoom: number };
        };
        metadata: {
          nodeCount: number;
          edgeCount: number;
          algorithm: string;
          description?: string;
        };
      }>>({});

      const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
      const [layoutHistory, setLayoutHistory] = useState<Array<{
        id: string;
        timestamp: number;
        action: string;
        snapshot: { nodes: Node[]; edges: Edge[]; viewport: any };
      }>>([]);

      // Layout persistence utilities
      const LayoutPersistence = React.useMemo(() => ({
        // Save current layout
        saveLayout: (name: string, description?: string) => {
          if (!rfInstance) return null;

          const layoutId = `layout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const viewport = rfInstance.getViewport();

          const layoutData = {
            id: layoutId,
            name,
            timestamp: Date.now(),
            layout: {
              nodes: [...nodesWithSelection],
              edges: [...edges],
              viewport
            },
            metadata: {
              nodeCount: nodesWithSelection.length,
              edgeCount: edges.length,
              algorithm: engine.config.layout?.algorithm || 'unknown',
              description
            }
          };

          setSavedLayouts(prev => ({
            ...prev,
            [layoutId]: layoutData
          }));

          // Save to localStorage for persistence across sessions
          try {
            const allLayouts = JSON.parse(localStorage.getItem('xyflow_saved_layouts') || '{}');
            allLayouts[layoutId] = layoutData;
            localStorage.setItem('xyflow_saved_layouts', JSON.stringify(allLayouts));
          } catch (error) {
            console.warn('Failed to save layout to localStorage:', error);
          }

          return layoutId;
        },

        // Load a saved layout
        loadLayout: async (layoutId: string) => {
          let layoutData = savedLayouts[layoutId];

          // Try loading from localStorage if not in memory
          if (!layoutData) {
            try {
              const allLayouts = JSON.parse(localStorage.getItem('xyflow_saved_layouts') || '{}');
              layoutData = allLayouts[layoutId];
            } catch (error) {
              console.warn('Failed to load layout from localStorage:', error);
              return false;
            }
          }

          if (!layoutData || !rfInstance) return false;

          try {
            // Create history entry before applying layout
            const currentSnapshot = {
              nodes: [...nodesWithSelection],
              edges: [...edges],
              viewport: rfInstance.getViewport()
            };

            setLayoutHistory(prev => [
              ...prev.slice(-9), // Keep last 10 entries
              {
                id: `history_${Date.now()}`,
                timestamp: Date.now(),
                action: `Applied layout: ${layoutData.name}`,
                snapshot: currentSnapshot
              }
            ]);

            // Apply the layout with smooth transitions
            setNodes(layoutData.layout.nodes);
            setEdges(layoutData.layout.edges);

            // Animate viewport change
            await new Promise(resolve => setTimeout(resolve, 100));
            rfInstance.setViewport(layoutData.layout.viewport, { duration: 800 });

            return true;
          } catch (error) {
            console.error('Failed to apply layout:', error);
            return false;
          }
        },

        // Delete a saved layout
        deleteLayout: (layoutId: string) => {
          setSavedLayouts(prev => {
            const updated = { ...prev };
            delete updated[layoutId];
            return updated;
          });

          // Remove from localStorage
          try {
            const allLayouts = JSON.parse(localStorage.getItem('xyflow_saved_layouts') || '{}');
            delete allLayouts[layoutId];
            localStorage.setItem('xyflow_saved_layouts', JSON.stringify(allLayouts));
          } catch (error) {
            console.warn('Failed to remove layout from localStorage:', error);
          }
        },

        // Auto-save current layout
        autoSave: () => {
          if (!autoSaveEnabled || !rfInstance) return;

          const autoSaveId = 'autosave_current';
          const viewport = rfInstance.getViewport();

          const autoSaveData = {
            id: autoSaveId,
            name: 'Auto-saved',
            timestamp: Date.now(),
            layout: {
              nodes: [...nodesWithSelection],
              edges: [...edges],
              viewport
            },
            metadata: {
              nodeCount: nodesWithSelection.length,
              edgeCount: edges.length,
              algorithm: engine.config.layout?.algorithm || 'auto',
              description: 'Automatically saved layout'
            }
          };

          try {
            localStorage.setItem('xyflow_autosave', JSON.stringify(autoSaveData));
          } catch (error) {
            console.warn('Auto-save failed:', error);
          }
        },

        // Restore auto-saved layout
        restoreAutoSave: async () => {
          try {
            const autoSaveData = JSON.parse(localStorage.getItem('xyflow_autosave') || 'null');
            if (autoSaveData && rfInstance) {
              setNodes(autoSaveData.layout.nodes);
              setEdges(autoSaveData.layout.edges);
              await new Promise(resolve => setTimeout(resolve, 100));
              rfInstance.setViewport(autoSaveData.layout.viewport, { duration: 600 });
              return true;
            }
          } catch (error) {
            console.warn('Failed to restore auto-save:', error);
          }
          return false;
        },

        // Create layout snapshot for history
        createSnapshot: (action: string) => {
          if (!rfInstance) return;

          const snapshot = {
            id: `snapshot_${Date.now()}`,
            timestamp: Date.now(),
            action,
            snapshot: {
              nodes: [...nodesWithSelection],
              edges: [...edges],
              viewport: rfInstance.getViewport()
            }
          };

          setLayoutHistory(prev => [
            ...prev.slice(-9), // Keep last 10 entries
            snapshot
          ]);
        },

        // Undo to previous layout state
        undo: async () => {
          if (layoutHistory.length === 0 || !rfInstance) return false;

          const previousState = layoutHistory[layoutHistory.length - 1];
          setLayoutHistory(prev => prev.slice(0, -1));

          try {
            setNodes(previousState.snapshot.nodes);
            setEdges(previousState.snapshot.edges);
            await new Promise(resolve => setTimeout(resolve, 100));
            rfInstance.setViewport(previousState.snapshot.viewport, { duration: 500 });
            return true;
          } catch (error) {
            console.error('Undo failed:', error);
            return false;
          }
        },

        // Export layout as JSON
        exportLayout: (layoutId?: string) => {
          const layoutData = layoutId ? savedLayouts[layoutId] : {
            id: `export_${Date.now()}`,
            name: 'Current Layout',
            timestamp: Date.now(),
            layout: {
              nodes: [...nodesWithSelection],
              edges: [...edges],
              viewport: rfInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
            },
            metadata: {
              nodeCount: nodesWithSelection.length,
              edgeCount: edges.length,
              algorithm: engine.config.layout?.algorithm || 'current'
            }
          };

          if (!layoutData) return null;

          const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            layout: layoutData
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${layoutData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_layout.json`;
          link.click();
          URL.revokeObjectURL(url);

          return exportData;
        },

        // Import layout from JSON
        importLayout: async (file: File) => {
          try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (importData.version && importData.layout) {
              const layoutData = importData.layout;
              const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              const finalLayoutData = {
                ...layoutData,
                id: importId,
                name: `${layoutData.name} (Imported)`,
                timestamp: Date.now()
              };

              setSavedLayouts(prev => ({
                ...prev,
                [importId]: finalLayoutData
              }));

              return importId;
            }
          } catch (error) {
            console.error('Import failed:', error);
          }
          return null;
        },

        // Get layout statistics
        getLayoutStats: () => {
          const layouts = Object.values(savedLayouts);
          return {
            totalLayouts: layouts.length,
            totalNodes: layouts.reduce((sum, layout) => sum + layout.metadata.nodeCount, 0),
            totalEdges: layouts.reduce((sum, layout) => sum + layout.metadata.edgeCount, 0),
            algorithms: [...new Set(layouts.map(layout => layout.metadata.algorithm))],
            oldestLayout: layouts.length > 0 ? Math.min(...layouts.map(layout => layout.timestamp)) : null,
            newestLayout: layouts.length > 0 ? Math.max(...layouts.map(layout => layout.timestamp)) : null,
            historyEntries: layoutHistory.length
          };
        }
      }), [nodesWithSelection, edges, rfInstance, savedLayouts, autoSaveEnabled, layoutHistory, engine.config.layout?.algorithm, setNodes, setEdges]);

      // Load saved layouts from localStorage on mount
      React.useEffect(() => {
        try {
          const stored = localStorage.getItem('xyflow_saved_layouts');
          if (stored) {
            const layouts = JSON.parse(stored);
            setSavedLayouts(layouts);
          }
        } catch (error) {
          console.warn('Failed to load saved layouts:', error);
        }
      }, []);

      // Auto-save periodically when enabled
      React.useEffect(() => {
        if (!autoSaveEnabled) return;

        const autoSaveInterval = setInterval(() => {
          LayoutPersistence.autoSave();
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(autoSaveInterval);
      }, [autoSaveEnabled, LayoutPersistence]);

      // Create snapshot on significant changes
      React.useEffect(() => {
        const debounceTimer = setTimeout(() => {
          if (nodesWithSelection.length > 0) {
            LayoutPersistence.createSnapshot('Layout changed');
          }
        }, 2000);

        return () => clearTimeout(debounceTimer);
      }, [nodesWithSelection, edges, LayoutPersistence]);

      // Performance Monitoring and Optimization System
      const [performanceMetrics, setPerformanceMetrics] = useState<{
        renderTime: number;
        frameRate: number;
        memoryUsage: number;
        nodeCount: number;
        edgeCount: number;
        zoomLevel: number;
        lastUpdate: number;
        renderCalls: number;
        optimizationSuggestions: string[];
      }>({
        renderTime: 0,
        frameRate: 60,
        memoryUsage: 0,
        nodeCount: 0,
        edgeCount: 0,
        zoomLevel: 1,
        lastUpdate: Date.now(),
        renderCalls: 0,
        optimizationSuggestions: []
      });

      const [performanceHistory, setPerformanceHistory] = useState<Array<{
        timestamp: number;
        renderTime: number;
        frameRate: number;
        memoryUsage: number;
        nodeCount: number;
        edgeCount: number;
      }>>([]);

      const performanceMonitorRef = React.useRef<{
        lastFrameTime: number;
        frameCount: number;
        lastMemoryCheck: number;
        renderStartTime: number;
        renderCalls: number;
      }>({
        lastFrameTime: performance.now(),
        frameCount: 0,
        lastMemoryCheck: Date.now(),
        renderStartTime: 0,
        renderCalls: 0
      });

      // Performance monitoring utilities
      const PerformanceMonitor = React.useMemo(() => ({
        // Start measuring render performance
        startRender: () => {
          performanceMonitorRef.current.renderStartTime = performance.now();
          performanceMonitorRef.current.renderCalls++;
        },

        // End measuring render performance
        endRender: () => {
          const renderTime = performance.now() - performanceMonitorRef.current.renderStartTime;

          setPerformanceMetrics(prev => ({
            ...prev,
            renderTime,
            renderCalls: performanceMonitorRef.current.renderCalls,
            nodeCount: nodesWithSelection.length,
            edgeCount: edges.length,
            zoomLevel: currentZoom,
            lastUpdate: Date.now()
          }));
        },

        // Update frame rate measurement
        updateFrameRate: () => {
          const now = performance.now();
          const monitor = performanceMonitorRef.current;

          monitor.frameCount++;
          const deltaTime = now - monitor.lastFrameTime;

          if (deltaTime >= 1000) { // Update every second
            const fps = Math.round((monitor.frameCount * 1000) / deltaTime);

            setPerformanceMetrics(prev => ({
              ...prev,
              frameRate: fps
            }));

            monitor.frameCount = 0;
            monitor.lastFrameTime = now;
          }
        },

        // Check memory usage (if available)
        checkMemoryUsage: () => {
          if ('memory' in performance) {
            const memInfo = (performance as any).memory;
            const memoryUsage = Math.round(memInfo.usedJSHeapSize / (1024 * 1024)); // MB

            setPerformanceMetrics(prev => ({
              ...prev,
              memoryUsage
            }));
          }
        },

        // Generate optimization suggestions
        generateSuggestions: () => {
          const suggestions: string[] = [];
          const nodeCount = nodesWithSelection.length;
          const edgeCount = edges.length;
          const currentFPS = performanceMetrics.frameRate;
          const renderTime = performanceMetrics.renderTime;

          // Node count suggestions
          if (nodeCount > 500) {
            suggestions.push('Consider enabling node virtualization for better performance with large graphs');
          }
          if (nodeCount > 1000 && !shouldShowCompactNodes) {
            suggestions.push('Enable compact node mode to improve rendering with many nodes');
          }

          // Edge suggestions
          if (edgeCount > 1000) {
            suggestions.push('Large number of edges detected - consider edge bundling or filtering');
          }
          if (edgeCount > 2000) {
            suggestions.push('Very high edge count - enable edge culling for performance');
          }

          // Performance suggestions
          if (currentFPS < 30) {
            suggestions.push('Low frame rate detected - reduce visual effects or enable performance mode');
          }
          if (renderTime > 50) {
            suggestions.push('High render time - consider reducing node complexity or batch updates');
          }

          // Zoom level suggestions
          if (currentZoom < 0.3) {
            suggestions.push('Very low zoom level - enable Level of Detail (LOD) rendering');
          }

          // Memory suggestions
          if (performanceMetrics.memoryUsage > 100) {
            suggestions.push('High memory usage detected - consider data pagination or cleanup');
          }

          // Interactive suggestions
          if (nodeCount > 100 && currentZoom < 0.5) {
            suggestions.push('Enable interaction throttling to improve responsiveness');
          }

          setPerformanceMetrics(prev => ({
            ...prev,
            optimizationSuggestions: suggestions
          }));
        },

        // Record performance snapshot
        recordSnapshot: () => {
          const snapshot = {
            timestamp: Date.now(),
            renderTime: performanceMetrics.renderTime,
            frameRate: performanceMetrics.frameRate,
            memoryUsage: performanceMetrics.memoryUsage,
            nodeCount: nodesWithSelection.length,
            edgeCount: edges.length
          };

          setPerformanceHistory(prev => [
            ...prev.slice(-29), // Keep last 30 entries
            snapshot
          ]);
        },

        // Get performance statistics
        getPerformanceStats: () => {
          const history = performanceHistory;
          if (history.length === 0) return null;

          const avgRenderTime = history.reduce((sum, entry) => sum + entry.renderTime, 0) / history.length;
          const avgFrameRate = history.reduce((sum, entry) => sum + entry.frameRate, 0) / history.length;
          const avgMemoryUsage = history.reduce((sum, entry) => sum + entry.memoryUsage, 0) / history.length;

          const minFrameRate = Math.min(...history.map(entry => entry.frameRate));
          const maxRenderTime = Math.max(...history.map(entry => entry.renderTime));

          return {
            averageRenderTime: Math.round(avgRenderTime * 100) / 100,
            averageFrameRate: Math.round(avgFrameRate),
            averageMemoryUsage: Math.round(avgMemoryUsage),
            minFrameRate,
            maxRenderTime: Math.round(maxRenderTime * 100) / 100,
            sampleCount: history.length
          };
        },

        // Apply automatic optimizations
        applyOptimizations: () => {
          const nodeCount = nodesWithSelection.length;
          const edgeCount = edges.length;
          const currentFPS = performanceMetrics.frameRate;

          let optimizationsApplied = 0;

          // Auto-enable compact mode for large graphs
          if (nodeCount > 200 && !shouldShowCompactNodes && currentFPS < 45) {
            // This would need to be hooked up to the actual state management
            console.log('Auto-optimization: Enabling compact node mode');
            optimizationsApplied++;
          }

          // Auto-reduce edge rendering for very large graphs
          if (edgeCount > 1500 && currentFPS < 30) {
            console.log('Auto-optimization: Reducing edge density');
            optimizationsApplied++;
          }

          // Auto-enable performance mode for struggling systems
          if (currentFPS < 25 || performanceMetrics.renderTime > 100) {
            console.log('Auto-optimization: Enabling performance mode');
            optimizationsApplied++;
          }

          return optimizationsApplied;
        },

        // Export performance data
        exportPerformanceData: () => {
          const exportData = {
            version: '1.0',
            exported: new Date().toISOString(),
            currentMetrics: performanceMetrics,
            history: performanceHistory,
            statistics: PerformanceMonitor.getPerformanceStats(),
            graphInfo: {
              nodeCount: nodesWithSelection.length,
              edgeCount: edges.length,
              algorithm: engine.config.layout?.algorithm || 'unknown',
              compactMode: shouldShowCompactNodes
            }
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `performance_report_${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          URL.revokeObjectURL(url);

          return exportData;
        }
      }), [nodesWithSelection.length, edges.length, currentZoom, shouldShowCompactNodes, performanceMetrics, performanceHistory, engine.config.layout?.algorithm]);

      // Performance monitoring effects
      React.useEffect(() => {
        // Measure render performance
        PerformanceMonitor.startRender();

        // Schedule render end measurement
        const timer = setTimeout(() => {
          PerformanceMonitor.endRender();
        }, 0);

        return () => clearTimeout(timer);
      }, [nodesWithSelection, edges, PerformanceMonitor]);

      // Frame rate monitoring
      React.useEffect(() => {
        let animationFrame: number;

        const measureFrameRate = () => {
          PerformanceMonitor.updateFrameRate();
          animationFrame = requestAnimationFrame(measureFrameRate);
        };

        animationFrame = requestAnimationFrame(measureFrameRate);

        return () => {
          if (animationFrame) {
            cancelAnimationFrame(animationFrame);
          }
        };
      }, [PerformanceMonitor]);

      // Periodic performance checks
      React.useEffect(() => {
        const interval = setInterval(() => {
          PerformanceMonitor.checkMemoryUsage();
          PerformanceMonitor.generateSuggestions();
          PerformanceMonitor.recordSnapshot();
        }, 5000); // Every 5 seconds

        return () => clearInterval(interval);
      }, [PerformanceMonitor]);

      // Advanced clustering system with multiple algorithms
      const [activeClusterType, setActiveClusterType] = useState<ClusterType>('entity');
      const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

      const shouldShowClusters = currentZoom < 0.8 && nodes.length > 5 && nodes.length < 200;

      const clusters = React.useMemo(() => {
        if (!shouldShowClusters) return [];

        switch (activeClusterType) {
          case 'entity':
            return ClusteringAlgorithms.entityClustering(nodes);
          case 'spatial':
            return ClusteringAlgorithms.spatialClustering(nodes, 200, 3);
          case 'citation':
            return ClusteringAlgorithms.citationClustering(nodes, edges);
          case 'year':
            return ClusteringAlgorithms.yearClustering(nodes);
          case 'collaboration':
            return ClusteringAlgorithms.collaborationClustering(nodes, edges);
          default:
            return ClusteringAlgorithms.entityClustering(nodes);
        }
      }, [nodes, edges, shouldShowClusters, activeClusterType]);

      // Animated cluster type change handler
      const handleClusterTypeChange = useCallback(async (newType: ClusterType) => {
        if (newType === activeClusterType || isAnimating) return;

        setLayoutTransitionActive(true);

        // Animate zoom out slightly during transition
        if (rfInstance) {
          const currentZoom = rfInstance.getZoom();
          await AnimationUtils.animateZoom(rfInstance, currentZoom * 0.9, { duration: 300, easing: 'ease-out' });
        }

        // Change cluster type
        setActiveClusterType(newType);

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 200));

        // Animate zoom back in
        if (rfInstance) {
          const currentZoom = rfInstance.getZoom();
          await AnimationUtils.animateZoom(rfInstance, currentZoom / 0.9, { duration: 400, easing: 'ease-in' });
        }

        setLayoutTransitionActive(false);
      }, [activeClusterType, isAnimating, rfInstance]);

      // Enhanced focus function with smooth animation
      const animatedFocusOnCluster = useCallback(async (cluster: Cluster) => {
        if (!rfInstance) return;

        // Calculate cluster center
        const centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
        const centerY = (cluster.bounds.minY + cluster.bounds.maxY) / 2;

        // Calculate appropriate zoom level
        const clusterWidth = cluster.bounds.maxX - cluster.bounds.minX;
        const clusterHeight = cluster.bounds.maxY - cluster.bounds.minY;
        const maxDimension = Math.max(clusterWidth, clusterHeight);
        const targetZoom = Math.min(1.5, Math.max(0.5, 800 / maxDimension));

        // Animate to cluster with smooth transition
        await rfInstance.setCenter(centerX, centerY, { zoom: targetZoom, duration: 800 });
      }, [rfInstance]);

      // Advanced filtering and search system
      const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>(defaultFilterCriteria);
      const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

      // Extract available entity types from nodes
      const availableEntityTypes = React.useMemo(() => {
        const types = new Set<string>();
        engine.nodes.forEach(node => {
          const data = node.data as EntityNodeData;
          if (data.entityType) {
            types.add(data.entityType);
          }
        });
        return Array.from(types).sort();
      }, [engine.nodes]);

      // Apply filtering and search
      const filteredNodes = React.useMemo(() => {
        let processedNodes = FilteringUtils.filterNodes(engine.nodes, engine.edges, filterCriteria);

        // Apply search highlighting if there's a search term
        if (filterCriteria.searchTerm) {
          const results = processedNodes.map(node => FilteringUtils.searchNode(node, filterCriteria.searchTerm))
                                      .filter(result => result.relevanceScore > 0);
          setSearchResults(results);
          processedNodes = FilteringUtils.highlightSearchResults(processedNodes, results);
        } else {
          setSearchResults([]);
        }

        return processedNodes;
      }, [engine.nodes, engine.edges, filterCriteria]);

      const filteredEdges = React.useMemo(() => {
        return FilteringUtils.filterEdges(engine.edges, filteredNodes);
      }, [engine.edges, filteredNodes]);

      // Sync nodes and edges with engine, applying filtering and performance optimizations
      useEffect(() => {
        let optimizedNodes = filteredNodes;
        let optimizedEdges = filteredEdges;

        // Level of Detail: Switch to compact nodes for large graphs or low zoom
        if (shouldShowCompactNodes && optimizedNodes.length > 0) {
          optimizedNodes = optimizedNodes.map(node => ({
            ...node,
            type: 'compact'
          }));
        }

        // Cull edges for very large graphs
        if (optimizedEdges.length > 500) {
          // Keep only the most important edges (those with higher weights or involving selected nodes)
          const selectedNodeIds = new Set(optimizedNodes.filter(n => n.selected).map(n => n.id));
          optimizedEdges = optimizedEdges
            .filter(edge => {
              // Keep edges connected to selected nodes
              if (selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target)) {
                return true;
              }
              // Keep edges with high weight (assuming weight is in edge data)
              const weight = edge.data?.weight || 0;
              return typeof weight === 'number' && weight > 0.5;
            })
            .slice(0, 300); // Limit to 300 edges maximum
        }

        setNodes(optimizedNodes);
        setEdges(optimizedEdges);
      }, [filteredNodes, filteredEdges, setNodes, setEdges, shouldShowCompactNodes]);

      const config = engine.config.xyflowOptions || {};

      return (
        <div
          style={{ width, height }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="application"
          aria-label="Interactive graph visualization"
          aria-describedby="graph-instructions"
        >
          {/* Screen reader instructions */}
          <div
            id="graph-instructions"
            style={{
              position: 'absolute',
              left: '-10000px',
              width: '1px',
              height: '1px',
              overflow: 'hidden'
            }}
          >
            Use Tab to navigate between nodes, Arrow keys to move selected nodes or pan (with Shift),
            + and - to zoom, 0 to fit view, Escape to clear selection, Enter or Space to activate nodes.
          </div>

          <ReactFlow
            nodes={nodesWithSelection}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onNodeClick={onNodeClick}
            onViewportChange={onViewportChange}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeMouseMove={onNodeMouseMove}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onEdgeContextMenu={onEdgeContextMenu}
            nodeTypes={config.nodeTypes || nodeTypes}
            edgeTypes={config.edgeTypes || edgeTypes}
            fitView={config.fitView}
            fitViewOptions={config.fitViewOptions}
            nodesDraggable={config.interaction?.nodesDraggable}
            nodesConnectable={config.interaction?.nodesConnectable}
            elementsSelectable={config.interaction?.elementsSelectable}
            selectNodesOnDrag={config.interaction?.selectNodesOnDrag}
            panOnDrag={config.interaction?.panOnDrag}
            minZoom={config.interaction?.minZoom}
            maxZoom={config.interaction?.maxZoom}
            zoomOnScroll={config.interaction?.zoomOnScroll}
            zoomOnPinch={config.interaction?.zoomOnPinch}
            zoomOnDoubleClick={config.interaction?.zoomOnDoubleClick}
            preventScrolling={config.interaction?.preventScrolling}
            aria-label="Graph visualization"
          >
            {config.background && (
              <Background
                variant={config.background.variant}
                gap={config.background.gap}
                size={config.background.size}
                offset={config.background.offset}
                lineWidth={config.background.lineWidth}
                color={config.background.color}
              />
            )}

            {/* Advanced Filter Panel */}
            <AdvancedFilterPanel
              criteria={filterCriteria}
              onCriteriaChange={setFilterCriteria}
              availableEntityTypes={availableEntityTypes}
              nodeCount={engine.nodes.length}
              filteredCount={filteredNodes.length}
            />

            {/* Graph Metrics and Analysis Panel */}
            <GraphMetricsPanel
              nodes={filteredNodes}
              edges={filteredEdges}
            />

            {/* Export Panel */}
            <ExportPanel
              reactFlowInstance={rfInstance}
              nodes={filteredNodes}
              edges={filteredEdges}
            />

            {/* Selection Panel */}
            <SelectionPanel
              selectedNodes={selectedNodes}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              SelectionUtils={SelectionUtils}
              BulkOperations={BulkOperations}
              nodes={filteredNodes}
              availableEntityTypes={availableEntityTypes}
            />

            {/* Layout Persistence Panel */}
            <LayoutPersistencePanel
              LayoutPersistence={LayoutPersistence}
              savedLayouts={savedLayouts}
              layoutHistory={layoutHistory}
              autoSaveEnabled={autoSaveEnabled}
              setAutoSaveEnabled={setAutoSaveEnabled}
            />

            {/* Performance Monitor Panel */}
            <PerformanceMonitorPanel
              performanceMetrics={performanceMetrics}
              PerformanceMonitor={PerformanceMonitor}
              performanceHistory={performanceHistory}
            />

            {/* Advanced Clustering Visualization */}
            {shouldShowClusters && clusters.map((cluster) => (
              <Panel key={cluster.id} position="top-left">
                <ClusterVisualization
                  cluster={cluster}
                  isActive={selectedCluster === cluster.id}
                  onClick={() => {
                    if (selectedCluster === cluster.id) {
                      setSelectedCluster(null);
                    } else {
                      setSelectedCluster(cluster.id);
                      animatedFocusOnCluster(cluster);
                    }
                  }}
                />
              </Panel>
            ))}

            {/* Clustering Algorithm Selector */}
            {shouldShowClusters && clusters.length > 0 && (
              <Panel position="top-right">
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  minWidth: '200px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    Clustering Algorithm
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { type: 'entity' as ClusterType, label: 'Entity Type', icon: '🏷️' },
                      { type: 'spatial' as ClusterType, label: 'Spatial Distance', icon: '📍' },
                      { type: 'citation' as ClusterType, label: 'Citation Count', icon: '📊' },
                      { type: 'year' as ClusterType, label: 'Publication Year', icon: '📅' },
                      { type: 'collaboration' as ClusterType, label: 'Collaboration', icon: '🤝' },
                    ].map(({ type, label, icon }) => (
                      <button
                        key={type}
                        onClick={() => handleClusterTypeChange(type)}
                        disabled={isAnimating || layoutTransitionActive}
                        style={{
                          padding: '6px 10px',
                          border: activeClusterType === type ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          background: activeClusterType === type ? '#eff6ff' : 'white',
                          borderRadius: '6px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'left',
                          color: activeClusterType === type ? '#1d4ed8' : '#6b7280',
                          fontWeight: activeClusterType === type ? '600' : '400',
                        }}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '10px',
                    color: '#9ca3af'
                  }}>
                    Found {clusters.length} clusters
                  </div>
                </div>
              </Panel>
            )}

            {config.controls && (
              <Controls
                showZoom={config.controls.showZoom}
                showFitView={config.controls.showFitView}
                showInteractive={config.controls.showInteractive}
                position={config.controls.position}
                orientation={config.controls.orientation}
                style={config.controls.style}
              />
            )}

            {config.miniMap && (
              <EnhancedMiniMap
                rfInstance={rfInstance}
                nodes={nodesWithSelection}
                edges={edges}
                selectedNodes={selectedNodes}
                currentZoom={currentZoom}
                config={config.miniMap}
              />
            )}

            <Panel position="top-left">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#4a5568',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                xyflow (React Flow)
              </div>
            </Panel>

            {/* Performance Status Panel */}
            {(nodes.length > 50 || edges.length > 100) && (
              <Panel position="top-right">
                <div
                  style={{
                    background: shouldShowCompactNodes ? 'rgba(255, 165, 0, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  title={`Performance mode: ${shouldShowCompactNodes ? 'Compact view for better performance' : 'Full detail view'}`}
                >
                  {shouldShowCompactNodes ? '⚡ Optimized' : '🔍 Detailed'}
                  ({nodes.length}N, {edges.length}E)
                </div>
              </Panel>
            )}

            {/* Animation Status Indicator */}
            {(isAnimating || layoutTransitionActive) && (
              <Panel position="bottom-right">
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.9)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'white',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <span>
                    {layoutTransitionActive ? '🔄 Transition' : '📐 Layout Animation'}
                  </span>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Interactive Tooltips */}
          <NodeTooltip
            node={nodeTooltip.node}
            position={nodeTooltip.position}
            visible={nodeTooltip.visible}
          />
          <EdgeTooltip
            edge={edgeTooltip.edge}
            position={edgeTooltip.position}
            visible={edgeTooltip.visible}
          />

          {/* Interactive Context Menus */}
          <NodeContextMenu
            node={nodeContextMenu.node}
            position={nodeContextMenu.position}
            visible={nodeContextMenu.visible}
            onClose={closeNodeContextMenu}
            rfInstance={rfInstance}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
          />
          <EdgeContextMenu
            edge={edgeContextMenu.edge}
            position={edgeContextMenu.position}
            visible={edgeContextMenu.visible}
            onClose={closeEdgeContextMenu}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
          />
        </div>
      );
    };
  }

  // ============================================================================
  // Preview Component
  // ============================================================================

  getPreviewComponent(): React.ComponentType<{
    dimensions: IDimensions;
    sampleData?: IGraph<TVertexData, TEdgeData>;
  }> {
    return XyflowPreview;
  }
}

// ============================================================================
// Preview Component
// ============================================================================

const XyflowPreview: React.FC<{
  dimensions: IDimensions;
  sampleData?: IGraph<unknown, unknown>;
}> = ({ dimensions }) => {
  const sampleNodes: Node[] = [
    {
      id: '1',
      type: 'entity',
      position: { x: 250, y: 50 },
      data: { label: 'Research Paper', entityType: 'work' },
    },
    {
      id: '2',
      type: 'entity',
      position: { x: 100, y: 150 },
      data: { label: 'Dr. Smith', entityType: 'author' },
    },
    {
      id: '3',
      type: 'entity',
      position: { x: 400, y: 150 },
      data: { label: 'University', entityType: 'institution' },
    },
  ];

  const sampleEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'smoothstep',
      animated: true,
    },
    {
      id: 'e1-3',
      source: '1',
      target: '3',
      type: 'smoothstep',
    },
  ];

  return (
    <div
      style={{
        width: dimensions.width,
        height: dimensions.height,
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f7fafc',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          XY
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
            xyflow (React Flow)
          </div>
          <div style={{ fontSize: '12px', color: '#718096' }}>
            Modern React Flow Diagrams
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            padding: '4px 8px',
            backgroundColor: '#c6f6d5',
            color: '#276749',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
          }}
        >
          Active
        </div>
      </div>

      {/* xyflow demonstration */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={sampleNodes}
            edges={sampleEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 20 }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor="#4299e1"
              maskColor="rgba(255, 255, 255, 0.7)"
              position="bottom-right"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Feature list */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          fontSize: '12px',
          color: '#718096',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span>✓ React Components</span>
          <span>✓ Interactive Controls</span>
          <span>✓ MiniMap & Zoom</span>
          <span>✓ Custom Nodes</span>
          <span>✓ High Performance</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new xyflow engine instance.
 */
export function createXyflowEngine<TVertexData = unknown, TEdgeData = unknown>(
  config?: IXyflowConfig
): XyflowEngine<TVertexData, TEdgeData> {
  const engine = new XyflowEngine<TVertexData, TEdgeData>();
  if (config) {
    engine['config'] = { ...engine['config'], ...config };
  }
  return engine;
}

/**
 * Get default xyflow configuration for academic graphs.
 */
export function getDefaultXyflowConfig(): IXyflowConfig {
  return {
    xyflowOptions: {
      fitView: true,
      fitViewOptions: {
        padding: 50,
        duration: 300,
      },
      nodeTypes,
      background: {
        variant: BackgroundVariant.Dots,
        gap: 20,
        size: 1,
        color: '#e2e8f0',
      },
      controls: {
        showZoom: true,
        showFitView: true,
        showInteractive: true,
        position: 'bottom-left',
      },
      miniMap: {
        position: 'bottom-right',
        maskColor: 'rgba(255, 255, 255, 0.7)',
      },
      interaction: {
        nodesDraggable: true,
        nodesConnectable: false,
        elementsSelectable: true,
        selectNodesOnDrag: false,
        panOnDrag: true,
        minZoom: 0.1,
        maxZoom: 2,
        zoomOnScroll: true,
        zoomOnPinch: true,
        zoomOnDoubleClick: true,
      },
    },
    layout: {
      algorithm: 'force',
      direction: 'TB',
      spacing: {
        node: [100, 80],
        rank: 80,
      },
    },
  };
}

// Export the utilities (XyflowEngine is already exported as a class declaration)
export { nodeTypes, edgeTypes };