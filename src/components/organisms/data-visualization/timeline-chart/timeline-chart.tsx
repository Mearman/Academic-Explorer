/**
 * Timeline Chart Component
 * 
 * Advanced timeline visualization component for academic data with support for
 * multiple series, interactive features, animations, and comprehensive accessibility.
 */

import * as d3 from 'd3';
import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';

import { Icon } from '@/components';

import type { 
  TimelineChartProps, 
  TimelineDataPoint, 
  TimelineSeries,
  AxisConfig
} from '../types';

import * as styles from './timeline-chart.css';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface D3Scales {
  x: d3.ScaleTime<number, number>;
  y: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface TooltipData {
  point: TimelineDataPoint;
  series: TimelineSeries;
  x: number;
  y: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate chart dimensions including margins
 */
function calculateDimensions(
  width: number, 
  height: number, 
  hasXAxisLabel?: boolean,
  hasYAxisLabel?: boolean
): ChartDimensions {
  return {
    width,
    height,
    margin: {
      top: 20,
      right: 20,
      bottom: hasXAxisLabel ? 60 : 40,
      left: hasYAxisLabel ? 80 : 60
    }
  };
}

/**
 * Get domain for time scale
 */
function getTimeDomain(series: TimelineSeries[]): [Date, Date] {
  const allDates = series
    .filter(s => s.visible !== false)
    .flatMap(s => s.data.map(d => d.date))
    .filter(date => date instanceof Date && !isNaN(date.getTime()));
  
  if (allDates.length === 0) {
    return [new Date(), new Date()];
  }
  
  return d3.extent(allDates) as [Date, Date];
}

/**
 * Get domain for value scale
 */
function getValueDomain(series: TimelineSeries[], yAxisConfig?: AxisConfig): [number, number] {
  if (yAxisConfig?.domain) {
    return yAxisConfig.domain as [number, number];
  }
  
  const allValues = series
    .filter(s => s.visible !== false)
    .flatMap(s => s.data.map(d => d.value))
    .filter(value => typeof value === 'number' && !isNaN(value) && isFinite(value));
  
  if (allValues.length === 0) {
    return [0, 1];
  }
  
  const [min, max] = d3.extent(allValues) as [number, number];
  const padding = (max - min) * 0.1;
  
  return [
    Math.max(0, min - padding),
    max + padding
  ];
}

/**
 * Create D3 scales
 */
function createScales(
  series: TimelineSeries[],
  dimensions: ChartDimensions,
  xAxisConfig?: AxisConfig,
  yAxisConfig?: AxisConfig
): D3Scales {
  const { width, height, margin } = dimensions;
  
  const xScale = d3.scaleTime()
    .domain(getTimeDomain(series))
    .range([margin.left, width - margin.right]);
  
  const yScale = yAxisConfig?.scale === 'log' 
    ? d3.scaleLog()
        .domain(getValueDomain(series, yAxisConfig))
        .range([height - margin.bottom, margin.top])
        .nice()
    : d3.scaleLinear()
        .domain(getValueDomain(series, yAxisConfig))
        .range([height - margin.bottom, margin.top])
        .nice();
  
  return { x: xScale, y: yScale };
}

/**
 * Generate color for series
 */
function getSeriesColor(series: TimelineSeries, index: number): string {
  if (series.color) return series.color;
  
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16'
  ];
  
  return colors[index % colors.length];
}

/**
 * Format tooltip content
 */
function formatTooltipContent(point: TimelineDataPoint, series: TimelineSeries): string {
  const dateStr = point.date.toLocaleDateString();
  const valueStr = typeof point.value === 'number' 
    ? point.value.toLocaleString() 
    : String(point.value);
  
  return `
    <div class="${styles.tooltipTitle}">${series.name}</div>
    <div class="${styles.tooltipValue}">${valueStr}</div>
    <div class="${styles.tooltipDate}">${dateStr}</div>
  `;
}

// ============================================================================
// Timeline Chart Component
// ============================================================================

export function TimelineChart({
  id = 'timeline-chart',
  series = [],
  width = 800,
  height = 400,
  className,
  loading = false,
  error = null,
  ariaLabel = 'Timeline chart',
  interactive = true,
  xAxis,
  yAxis,
  style: styleConfig,
  interactions,
  onPointClick,
  onPointHover,
  onRangeSelect,
  exportConfig: _exportConfig
}: TimelineChartProps) {
  
  // ============================================================================
  // State and Refs
  // ============================================================================
  
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [_selectedRange, _setSelectedRange] = useState<[Date, Date] | null>(null);
  
  // ============================================================================
  // Memoized Values
  // ============================================================================
  
  const dimensions = useMemo(() => 
    calculateDimensions(width, height, !!xAxis?.label, !!yAxis?.label), 
    [width, height, xAxis?.label, yAxis?.label]
  );
  
  const scales = useMemo(() => 
    createScales(series, dimensions, xAxis, yAxis), 
    [series, dimensions, xAxis, yAxis]
  );
  
  const validSeries = useMemo(() => 
    series.filter(s => s.data && s.data.length > 0), 
    [series]
  );
  
  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handlePointClick = useCallback((
    point: TimelineDataPoint, 
    series: TimelineSeries, 
    _event: MouseEvent
  ) => {
    if (onPointClick) {
      onPointClick(point, series);
    }
  }, [onPointClick]);
  
  const handlePointHover = useCallback((
    point: TimelineDataPoint | null, 
    series?: TimelineSeries,
    event?: MouseEvent
  ) => {
    if (point && series && event && tooltipRef.current && svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const tooltipData: TooltipData = {
        point,
        series,
        x: event.clientX - svgRect.left,
        y: event.clientY - svgRect.top
      };
      setTooltip(tooltipData);
    } else {
      setTooltip(null);
    }
    
    if (onPointHover) {
      onPointHover(point, series);
    }
  }, [onPointHover]);
  
  const handleRangeSelect = useCallback((range: [Date, Date]) => {
    _setSelectedRange(range);
    if (onRangeSelect) {
      onRangeSelect(range[0], range[1]);
    }
  }, [onRangeSelect]);
  
  // ============================================================================
  // D3 Chart Rendering
  // ============================================================================
  
  useEffect(() => {
    if (!svgRef.current || validSeries.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render
    
    const { x: xScale, y: yScale } = scales;
    const { margin } = dimensions;
    
    // Create main chart group
    const chartGroup = svg
      .append('g')
      .attr('class', styles.chartGroup);
    
    // Add grid lines if enabled
    if (xAxis?.grid) {
      chartGroup
        .selectAll('.grid-line-x')
        .data(xScale.ticks())
        .enter()
        .append('line')
        .attr('class', styles.gridLine)
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom);
    }
    
    if (yAxis?.grid) {
      chartGroup
        .selectAll('.grid-line-y')
        .data(yScale.ticks())
        .enter()
        .append('line')
        .attr('class', styles.gridLine)
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d));
    }
    
    // Render each series
    validSeries.forEach((seriesData, index) => {
      if (seriesData.visible === false) return;
      
      const color = getSeriesColor(seriesData, index);
      const sortedData = [...seriesData.data]
        .filter(d => d.date instanceof Date && !isNaN(d.date.getTime()))
        .filter(d => typeof d.value === 'number' && !isNaN(d.value) && isFinite(d.value))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const seriesGroup = chartGroup
        .append('g')
        .attr('class', styles.seriesGroup)
        .attr('data-series-id', seriesData.id);
      
      // Render based on series style
      switch (seriesData.style) {
        case 'area':
          renderAreaSeries(seriesGroup, sortedData, xScale, yScale, color, dimensions);
          break;
        case 'bar':
          renderBarSeries(seriesGroup, sortedData, xScale, yScale, color, dimensions);
          break;
        case 'scatter':
          renderScatterSeries(seriesGroup, sortedData, xScale, yScale, color, {
            onClick: (point, event) => handlePointClick(point, seriesData, event),
            onHover: (point, event) => handlePointHover(point, seriesData, event),
            onLeave: () => handlePointHover(null)
          });
          break;
        case 'line':
        default:
          renderLineSeries(seriesGroup, sortedData, xScale, yScale, color);
          renderScatterSeries(seriesGroup, sortedData, xScale, yScale, color, {
            onClick: (point, event) => handlePointClick(point, seriesData, event),
            onHover: (point, event) => handlePointHover(point, seriesData, event),
            onLeave: () => handlePointHover(null)
          });
          break;
      }
    });
    
    // Add axes
    const xAxisGenerator = d3.axisBottom(xScale);
    if (xAxis?.ticks?.format) {
      // Type-safe tick format handling
      const formatFn = xAxis.ticks.format;
      if (typeof formatFn === 'function') {
        xAxisGenerator.tickFormat(formatFn as (domainValue: Date | d3.NumberValue, index: number) => string);
      }
    }
    if (xAxis?.ticks?.count) {
      xAxisGenerator.ticks(xAxis.ticks.count);
    }
    
    chartGroup
      .append('g')
      .attr('class', styles.xAxis)
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxisGenerator);
    
    const yAxisGenerator = d3.axisLeft(yScale);
    if (yAxis?.ticks?.format) {
      // Type-safe tick format handling
      const formatFn = yAxis.ticks.format;
      if (typeof formatFn === 'function') {
        yAxisGenerator.tickFormat(formatFn as (domainValue: d3.NumberValue, index: number) => string);
      }
    }
    if (yAxis?.ticks?.count) {
      yAxisGenerator.ticks(yAxis.ticks.count);
    }
    
    chartGroup
      .append('g')
      .attr('class', styles.yAxis)
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxisGenerator);
    
    // Add axis labels
    if (xAxis?.label) {
      chartGroup
        .append('text')
        .attr('class', styles.axisLabel)
        .attr('x', (width - margin.left - margin.right) / 2 + margin.left)
        .attr('y', height - 10)
        .text(xAxis.label);
    }
    
    if (yAxis?.label) {
      chartGroup
        .append('text')
        .attr('class', styles.axisLabel)
        .attr('transform', 'rotate(-90)')
        .attr('x', -(height - margin.top - margin.bottom) / 2 - margin.top)
        .attr('y', 15)
        .text(yAxis.label);
    }
    
    // Add interactive features
    if (interactive && interactions?.brush) {
      addBrushInteraction(svg, dimensions, xScale, handleRangeSelect);
    }
    
    if (interactive && (interactions?.zoom || interactions?.pan)) {
      addZoomPanInteraction(svg, chartGroup, scales, dimensions);
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validSeries, scales, dimensions, xAxis, yAxis, interactive, interactions, handlePointClick, handlePointHover, handleRangeSelect, width, height, styleConfig]);
  
  // ============================================================================
  // Render Functions for Different Series Types
  // ============================================================================
  
  function renderLineSeries(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TimelineDataPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>,
    color: string
  ) {
    const line = d3.line<TimelineDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    group
      .append('path')
      .datum(data)
      .attr('class', styles.lineSeriesPath)
      .attr('d', line)
      .style('stroke', color);
  }
  
  function renderAreaSeries(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TimelineDataPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>,
    color: string,
    dimensions: ChartDimensions
  ) {
    const area = d3.area<TimelineDataPoint>()
      .x(d => xScale(d.date))
      .y0(dimensions.height - dimensions.margin.bottom)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    group
      .append('path')
      .datum(data)
      .attr('class', styles.areaSeriesPath)
      .attr('d', area)
      .style('fill', color)
      .style('stroke', color);
  }
  
  function renderBarSeries(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TimelineDataPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>,
    color: string,
    dimensions: ChartDimensions
  ) {
    const barWidth = Math.max(2, (dimensions.width - dimensions.margin.left - dimensions.margin.right) / data.length * 0.8);
    
    group
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', styles.barSeriesRect)
      .attr('x', d => xScale(d.date) - barWidth / 2)
      .attr('y', d => yScale(d.value))
      .attr('width', barWidth)
      .attr('height', d => dimensions.height - dimensions.margin.bottom - yScale(d.value))
      .style('fill', color);
  }
  
  function renderScatterSeries(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: TimelineDataPoint[],
    xScale: d3.ScaleTime<number, number>,
    yScale: d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number>,
    color: string,
    handlers: {
      onClick: (point: TimelineDataPoint, event: MouseEvent) => void;
      onHover: (point: TimelineDataPoint, event: MouseEvent) => void;
      onLeave: () => void;
    }
  ) {
    group
      .selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', styles.scatterPoint)
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', styleConfig?.pointStyle?.radius || 4)
      .style('fill', color)
      .on('click', (event, d) => handlers.onClick(d, event))
      .on('mouseenter', (event, d) => handlers.onHover(d, event))
      .on('mouseleave', handlers.onLeave);
  }
  
  function addBrushInteraction(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    dimensions: ChartDimensions,
    xScale: d3.ScaleTime<number, number>,
    onRangeSelect: (range: [Date, Date]) => void
  ) {
    const brush = d3.brushX()
      .extent([
        [dimensions.margin.left, dimensions.margin.top],
        [dimensions.width - dimensions.margin.right, dimensions.height - dimensions.margin.bottom]
      ])
      .on('end', (event) => {
        if (event.selection) {
          const [x1, x2] = event.selection;
          const range: [Date, Date] = [xScale.invert(x1), xScale.invert(x2)];
          onRangeSelect(range);
        }
      });
    
    svg
      .append('g')
      .attr('class', 'brush')
      .call(brush);
  }
  
  function addZoomPanInteraction(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    chartGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    scales: D3Scales,
    _dimensions: ChartDimensions
  ) {
    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event;
        
        // Update scales with transform
        const newXScale = transform.rescaleX(scales.x);
        const newYScale = transform.rescaleY(scales.y);
        
        // Update axes with type-safe calls
        const xAxisSelection = chartGroup.select(`.${styles.xAxis}`);
        const yAxisSelection = chartGroup.select(`.${styles.yAxis}`);
        
        if (!xAxisSelection.empty()) {
          (xAxisSelection as unknown as d3.Selection<SVGGElement, unknown, null, undefined>).call(d3.axisBottom(newXScale));
        }
        
        if (!yAxisSelection.empty()) {
          (yAxisSelection as unknown as d3.Selection<SVGGElement, unknown, null, undefined>).call(d3.axisLeft(newYScale));
        }
        
        // Update series elements (simplified - in production, would update all series)
        chartGroup.selectAll(`.${styles.lineSeriesPath}`)
          .attr('transform', transform.toString());
        
        chartGroup.selectAll(`.${styles.scatterPoint}`)
          .attr('transform', transform.toString());
      });
    
    // Type-safe zoom application
    const zoomBehavior = zoom as unknown as d3.ZoomBehavior<SVGSVGElement, unknown>;
    svg.call(zoomBehavior);
  }
  
  // ============================================================================
  // Render Logic
  // ============================================================================
  
  // Loading state
  if (loading) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.loadingState}>
          <Icon name="loader" size="lg" />
          Loading timeline chart...
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
          <div className={styles.errorMessage}>Chart Error</div>
          <div className={styles.errorDescription}>{error}</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (validSeries.length === 0) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.emptyState}>
          <Icon name="bar-chart" className={styles.emptyIcon} />
          <div className={styles.emptyMessage}>No Data Available</div>
          <div className={styles.emptyDescription}>
            Add data series to display the timeline chart
          </div>
        </div>
      </div>
    );
  }
  
  // Main chart render
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
        {/* Chart content is rendered via D3 */}
      </svg>
      
      {/* Tooltip */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10
          }}
          dangerouslySetInnerHTML={{
            __html: formatTooltipContent(tooltip.point, tooltip.series)
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================