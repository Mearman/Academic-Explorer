/**
 * Network Diagram Component
 * 
 * Interactive network visualization component for displaying academic collaboration
 * networks, citation networks, and other graph-based data relationships.
 */

import * as d3 from 'd3';
import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';

import { Icon } from '@/components';

import type { 
  NetworkDiagramProps, 
  NetworkNode, 
  NetworkEdge,
  NetworkLayoutConfig,
  ClusterConfig
} from '../types';

import * as styles from './network-diagram.css';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface D3SimulationNode extends NetworkNode, d3.SimulationNodeDatum {
  vx?: number;
  vy?: number;
}

interface D3SimulationLink extends Omit<NetworkEdge, 'source' | 'target'>, d3.SimulationLinkDatum<D3SimulationNode> {
  source: D3SimulationNode;
  target: D3SimulationNode;
  originalSource: string;
  originalTarget: string;
}

interface TooltipData {
  node?: NetworkNode;
  edge?: NetworkEdge;
  x: number;
  y: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create force simulation for network layout
 */
function createSimulation(
  nodes: D3SimulationNode[],
  links: D3SimulationLink[],
  width: number,
  height: number,
  layoutConfig?: NetworkLayoutConfig
): d3.Simulation<D3SimulationNode, D3SimulationLink> {
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius((d: any) => (d.size || 5) + 2));

  // Apply layout-specific configurations
  if (layoutConfig?.algorithm === 'hierarchical') {
    simulation.force('y', d3.forceY().strength(0.1));
  }

  return simulation;
}

/**
 * Get node color based on type and clustering
 */
function getNodeColor(node: NetworkNode, clustering?: ClusterConfig): string {
  if (node.color) return node.color;
  
  // Color by cluster if available
  if (node.metadata?.clusterId !== undefined && node.metadata.clusterId !== null && typeof node.metadata.clusterId === 'number') {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
      '#ef4444', '#06b6d4', '#f97316', '#84cc16'
    ];
    return colors[node.metadata.clusterId % colors.length];
  }
  
  // Default color by type
  return node.type === 'author' ? '#3b82f6' : '#6b7280';
}

/**
 * Format tooltip content for nodes
 */
function formatNodeTooltip(node: NetworkNode): string {
  const metadata = node.metadata || {};
  
  return `
    <div class="${styles.tooltipTitle}">${node.label}</div>
    <div class="${styles.tooltipType}">${node.type}</div>
    ${metadata.worksCount ? `<div class="${styles.tooltipMetric}">Works: ${metadata.worksCount}</div>` : ''}
    ${metadata.citationsCount ? `<div class="${styles.tooltipMetric}">Citations: ${metadata.citationsCount}</div>` : ''}
  `;
}

// ============================================================================
// Network Diagram Component
// ============================================================================

export function NetworkDiagram({
  id = 'network-diagram',
  nodes = [],
  edges = [],
  width = 800,
  height = 600,
  className,
  loading = false,
  error = null,
  ariaLabel = 'Network diagram',
  interactive = true,
  layout,
  clustering,
  style: styleConfig,
  interactions,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  onClusterSelect
}: NetworkDiagramProps) {
  
  // ============================================================================
  // State and Refs
  // ============================================================================
  
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  
  // ============================================================================
  // Memoized Values
  // ============================================================================
  
  const simulationData = useMemo(() => {
    if (nodes.length === 0 || edges.length === 0) {
      return { nodes: [], links: [] };
    }
    
    const simulationNodes: D3SimulationNode[] = nodes.map(node => ({
      ...node,
      x: Math.random() * width,
      y: Math.random() * height
    }));
    
    const nodeMap = new Map(simulationNodes.map(n => [n.id, n]));
    const simulationLinks: D3SimulationLink[] = edges
      .map(edge => ({
        ...edge,
        originalSource: edge.source,
        originalTarget: edge.target,
        source: nodeMap.get(edge.source),
        target: nodeMap.get(edge.target)
      }))
      .filter(link => link.source && link.target) as D3SimulationLink[];
    
    return { nodes: simulationNodes, links: simulationLinks };
  }, [nodes, edges, width, height]);
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleNodeClick = useCallback((node: NetworkNode, event: MouseEvent) => {
    if (interactions?.selection) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          if (interactions.selectionMode !== 'multiple') {
            newSet.clear();
          }
          newSet.add(node.id);
        }
        return newSet;
      });
    }
    
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [interactions, onNodeClick]);
  
  const handleNodeHover = useCallback((
    node: NetworkNode | null, 
    event?: MouseEvent
  ) => {
    if (node && event && tooltipRef.current && svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const tooltipData: TooltipData = {
        node,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
      setTooltip(tooltipData);
    } else {
      setTooltip(null);
    }
    
    if (onNodeHover) {
      onNodeHover(node);
    }
  }, [onNodeHover]);
  
  // ============================================================================
  // D3 Network Rendering
  // ============================================================================
  
  useEffect(() => {
    if (!svgRef.current || simulationData.nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render
    
    const { nodes: simulationNodes, links: simulationLinks } = simulationData;
    
    // Create simulation
    const simulation = createSimulation(simulationNodes, simulationLinks, width, height, layout);
    
    // Create container group
    const container = svg.append('g');
    
    // Add zoom and pan behavior if enabled
    if (interactive && (interactions?.zoom || interactions?.pan)) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
          container.attr('transform', event.transform);
        });
      
      svg.call(zoom);
    }
    
    // Create links
    const linkSelection = container
      .append('g')
      .attr('class', styles.linksGroup)
      .selectAll('line')
      .data(simulationLinks)
      .enter()
      .append('line')
      .attr('class', styles.link)
      .style('stroke', d => d.color || '#999')
      .style('stroke-width', d => Math.sqrt(d.weight || 1))
      .style('stroke-opacity', 0.6);
    
    // Create nodes
    const nodeSelection = container
      .append('g')
      .attr('class', styles.nodesGroup)
      .selectAll('circle')
      .data(simulationNodes)
      .enter()
      .append('circle')
      .attr('class', styles.node)
      .attr('r', d => d.size || 5)
      .style('fill', d => getNodeColor(d, clustering))
      .style('stroke', '#fff')
      .style('stroke-width', 1.5);
    
    // Add interactivity
    if (interactive) {
      // Drag behavior
      if (interactions?.drag) {
        const drag = d3.drag<SVGCircleElement, D3SimulationNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          });
        
        nodeSelection.call(drag);
      }
      
      // Click and hover events
      nodeSelection
        .on('click', (event, d) => handleNodeClick(d, event))
        .on('mouseenter', (event, d) => {
          if (interactions?.hover) {
            handleNodeHover(d, event);
          }
        })
        .on('mouseleave', () => {
          if (interactions?.hover) {
            handleNodeHover(null);
          }
        });
      
      // Link click events
      if (onEdgeClick) {
        linkSelection.on('click', (event, d) => {
          const networkEdge: NetworkEdge = {
            ...d,
            source: d.originalSource,
            target: d.originalTarget
          };
          onEdgeClick(networkEdge);
        });
      }
    }
    
    // Add node labels if enabled
    if (styleConfig?.labels?.show) {
      const labelSelection = container
        .append('g')
        .attr('class', styles.labelsGroup)
        .selectAll('text')
        .data(simulationNodes)
        .enter()
        .append('text')
        .attr('class', styles.label)
        .text(d => d.label)
        .style('font-size', styleConfig.labels.fontSize || 12)
        .style('font-family', styleConfig.labels.fontFamily || 'sans-serif')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none');
      
      // Update label positions
      simulation.on('tick', () => {
        linkSelection
          .attr('x1', d => (d.source as D3SimulationNode).x!)
          .attr('y1', d => (d.source as D3SimulationNode).y!)
          .attr('x2', d => (d.target as D3SimulationNode).x!)
          .attr('y2', d => (d.target as D3SimulationNode).y!);
        
        nodeSelection
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!);
        
        labelSelection
          .attr('x', d => d.x!)
          .attr('y', d => d.y! + 4);
      });
    } else {
      // Update positions without labels
      simulation.on('tick', () => {
        linkSelection
          .attr('x1', d => (d.source as D3SimulationNode).x!)
          .attr('y1', d => (d.source as D3SimulationNode).y!)
          .attr('x2', d => (d.target as D3SimulationNode).x!)
          .attr('y2', d => (d.target as D3SimulationNode).y!);
        
        nodeSelection
          .attr('cx', d => d.x!)
          .attr('cy', d => d.y!);
      });
    }
    
    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
    
  }, [simulationData, width, height, layout, clustering, styleConfig, interactions, interactive, handleNodeClick, handleNodeHover, onEdgeClick]);
  
  // ============================================================================
  // Render Logic
  // ============================================================================
  
  // Loading state
  if (loading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loadingState}>
          <Icon name="loader" size="lg" />
          Loading network diagram...
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.errorState}>
          <Icon name="alert-circle" className={styles.errorIcon} />
          <div className={styles.errorMessage}>Network Error</div>
          <div className={styles.errorDescription}>{error}</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (nodes.length === 0) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.emptyState}>
          <Icon name="network" className={styles.emptyIcon} />
          <div className={styles.emptyMessage}>No Network Data Available</div>
          <div className={styles.emptyDescription}>
            Add nodes and edges to display the network diagram
          </div>
        </div>
      </div>
    );
  }
  
  // Main diagram render
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <svg
        ref={svgRef}
        id={id}
        className={styles.svg}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={interactive ? 0 : undefined}
      >
        {/* Network content is rendered via D3 */}
      </svg>
      
      {/* Tooltip */}
      {tooltip && tooltip.node && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10
          }}
          dangerouslySetInnerHTML={{
            __html: formatNodeTooltip(tooltip.node)
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default NetworkDiagram;