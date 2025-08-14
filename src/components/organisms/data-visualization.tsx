import React, { useMemo } from 'react';
import { EntityBadge } from '@/components';
import * as styles from './data-visualization.css';

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  entity_type?: string;
}

interface ChartProps {
  data: DataPoint[];
  title: string;
  type: 'bar' | 'line' | 'pie' | 'scatter';
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

interface NetworkNode {
  id: string;
  name: string;
  entity_type: string;
  citations?: number;
  size?: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  strength?: number;
}

interface NetworkVisualizationProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  title: string;
  width?: number;
  height?: number;
}

// Simple SVG-based chart component
export function Chart({
  data,
  title,
  type,
  width = 600,
  height = 400,
  showGrid = true,
  showLabels = true
}: ChartProps) {
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const { xScale, yScale, maxY } = useMemo(() => {
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    
    const xValues = data.map(d => d.x);
    const isNumeric = typeof xValues[0] === 'number';
    
    let xScale: (value: string | number, index?: number) => number;
    if (isNumeric) {
      const maxX = Math.max(...(xValues as number[]));
      const minX = Math.min(...(xValues as number[]));
      xScale = (x: number) => ((x - minX) / (maxX - minX)) * chartWidth;
    } else {
      xScale = (_x: string | number, index: number = 0) => (index / (data.length - 1)) * chartWidth;
    }
    
    const yScale = (y: number) => chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;
    
    return { xScale, yScale, maxY };
  }, [data, chartWidth, chartHeight]);

  const renderBarChart = () => {
    const barWidth = chartWidth / data.length * 0.8;
    
    return data.map((point, index) => (
      <g key={index}>
        <rect
          x={index * (chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2}
          y={yScale(point.y)}
          width={barWidth}
          height={chartHeight - yScale(point.y)}
          className={styles.chartBar}
          fill={`hsl(${210 + index * 20}, 70%, 50%)`}
        />
        {showLabels && (
          <text
            x={index * (chartWidth / data.length) + chartWidth / data.length / 2}
            y={chartHeight + 20}
            className={styles.chartLabel}
            textAnchor="middle"
          >
            {point.x}
          </text>
        )}
      </g>
    ));
  };

  const renderLineChart = () => {
    const points = data.map((point, index) => {
      const x = typeof point.x === 'number' 
        ? xScale(point.x) 
        : index * (chartWidth / (data.length - 1));
      const y = yScale(point.y);
      return { x, y, original: point };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <>
        <path
          d={pathData}
          fill="none"
          stroke="hsl(210, 70%, 50%)"
          strokeWidth="2"
          className={styles.chartLine}
        />
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="hsl(210, 70%, 50%)"
              className={styles.chartPoint}
            />
            {showLabels && (
              <text
                x={point.x}
                y={chartHeight + 20}
                className={styles.chartLabel}
                textAnchor="middle"
              >
                {point.original.x}
              </text>
            )}
          </g>
        ))}
      </>
    );
  };

  const renderGrid = () => {
    if (!showGrid) return null;

    const gridLines = [];
    const ySteps = 5;
    
    for (let i = 0; i <= ySteps; i++) {
      const y = (chartHeight / ySteps) * i;
      gridLines.push(
        <line
          key={`grid-${i}`}
          x1={0}
          y1={y}
          x2={chartWidth}
          y2={y}
          className={styles.gridLine}
        />
      );
    }

    return <g className={styles.grid}>{gridLines}</g>;
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <svg width={width} height={height} className={styles.chart}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {renderGrid()}
          {type === 'bar' && renderBarChart()}
          {type === 'line' && renderLineChart()}
          
          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            className={styles.axis}
          />
          
          {/* X-axis */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            className={styles.axis}
          />
          
          {/* Y-axis labels */}
          {Array.from({ length: 6 }, (_, i) => {
            const value = (maxY / 5) * i;
            const y = chartHeight - (i / 5) * chartHeight;
            return (
              <text
                key={`y-label-${i}`}
                x={-10}
                y={y + 4}
                className={styles.axisLabel}
                textAnchor="end"
              >
                {Math.round(value).toLocaleString()}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Network visualization component
export function NetworkVisualization({
  nodes,
  edges,
  title,
  width = 800,
  height = 600
}: NetworkVisualizationProps) {
  const margin = 40;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - margin;

  // Simple circular layout
  const positionedNodes = useMemo(() => {
    return nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const nodeRadius = radius * 0.8;
      const x = centerX + Math.cos(angle) * nodeRadius;
      const y = centerY + Math.sin(angle) * nodeRadius;
      
      return {
        ...node,
        x,
        y,
        radius: Math.sqrt((node.size || node.citations || 10) / 100) * 20 + 5
      };
    });
  }, [nodes, centerX, centerY, radius]);

  const getNodeById = (id: string) => positionedNodes.find(n => n.id === id);

  return (
    <div className={styles.networkContainer}>
      <h3 className={styles.networkTitle}>{title}</h3>
      <svg width={width} height={height} className={styles.network}>
        {/* Edges */}
        {edges.map((edge, index) => {
          const source = getNodeById(edge.source);
          const target = getNodeById(edge.target);
          
          if (!source || !target) return null;
          
          return (
            <line
              key={`edge-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={styles.networkEdge}
              strokeWidth={Math.sqrt(edge.strength || 1) * 2 + 1}
              opacity={0.6}
            />
          );
        })}
        
        {/* Nodes */}
        {positionedNodes.map((node) => (
          <g key={node.id} className={styles.networkNode}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              className={`${styles.nodeCircle} ${styles[`node${node.entity_type}` as keyof typeof styles] || ''}`}
            />
            <text
              x={node.x}
              y={node.y + node.radius + 15}
              className={styles.nodeLabel}
              textAnchor="middle"
            >
              {node.name.length > 15 ? `${node.name.slice(0, 12)}...` : node.name}
            </text>
            {node.citations && (
              <text
                x={node.x}
                y={node.y + 4}
                className={styles.nodeMetric}
                textAnchor="middle"
              >
                {node.citations}
              </text>
            )}
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className={styles.networkLegend}>
        {Array.from(new Set(nodes.map(n => n.entity_type))).map(entityType => (
          <div key={entityType} className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles[`node${entityType}` as keyof typeof styles] || ''}`}></div>
            <EntityBadge type={entityType} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Metrics dashboard component
interface MetricsPanelProps {
  title: string;
  metrics: Array<{
    label: string;
    value: number;
    trend?: 'up' | 'down' | 'neutral';
    format?: 'number' | 'percentage' | 'currency';
  }>;
}

export function MetricsPanel({ title, metrics }: MetricsPanelProps) {
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'neutral': return '➖';
      default: return '';
    }
  };

  return (
    <div className={styles.metricsPanel}>
      <h3 className={styles.metricsPanelTitle}>{title}</h3>
      <div className={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <div key={index} className={styles.metricCard}>
            <div className={styles.metricLabel}>{metric.label}</div>
            <div className={styles.metricValue}>
              {formatValue(metric.value, metric.format)}
              {metric.trend && (
                <span className={styles.metricTrend}>
                  {getTrendIcon(metric.trend)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}