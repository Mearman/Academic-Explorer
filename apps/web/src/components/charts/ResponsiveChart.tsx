/**
 * Responsive Chart Components
 *
 * Touch-friendly, accessible chart components that adapt to different screen sizes
 * and device capabilities. Supports both desktop and mobile interactions.
 */

import type { ComparisonResults } from "@bibgraph/utils";
import { useMantineTheme } from "@mantine/core";
import { useCallback, useEffect,useMemo, useRef, useState } from "react";

import { useTouchGestures } from "@/hooks/use-touch-gestures";
import { announceToScreenReader } from "@/utils/accessibility";

interface ResponsiveChartProps {
  comparisonResults: ComparisonResults[];
  title: string;
  description?: string;
  height?: number;
  mobileHeight?: number;
  ariaLabel?: string;
}

interface DatasetPerformanceData {
  datasetName: string;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  additionalPapers: number;
  totalFound: number;
  totalGroundTruth: number;
}

/**
 * Touch-friendly bar chart component with responsive design
 * @param root0
 * @param root0.comparisonResults
 * @param root0.title
 * @param root0.description
 * @param root0.height
 * @param root0.mobileHeight
 * @param root0.ariaLabel
 */
export const ResponsivePerformanceChart = ({
  comparisonResults,
  title,
  description,
  height = 400,
  mobileHeight = 300,
  ariaLabel
}: ResponsiveChartProps) => {
  const theme = useMantineTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [focusedBar, setFocusedBar] = useState<{dataset: string, metric: string} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < (Number.parseInt(theme.breakpoints.sm.replace('px', ''))));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [theme.breakpoints.sm]);

  const chartData = useMemo(() => {
    return comparisonResults.map(
      (result): DatasetPerformanceData => ({
        datasetName: result.dataset.name,
        precision: result.precision,
        recall: result.recall,
        f1Score: result.f1Score,
        truePositives: result.truePositives.length,
        falsePositives: result.falsePositives.length,
        falseNegatives: result.falseNegatives.length,
        additionalPapers: result.additionalPapersFound.length,
        totalFound: result.bibGraphResults.length,
        totalGroundTruth: result.dataset.includedPapers.length,
      }),
    );
  }, [comparisonResults]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.flatMap((d) => [d.precision, d.recall, d.f1Score]));
  }, [chartData]);

  const actualHeight = isMobile ? mobileHeight : height;

  // Enhanced touch interactions with gesture support
  const handleTouchStart = useCallback((datasetName: string, metric: string) => {
    if (isMobile) {
      setSelectedDataset(datasetName);
      setFocusedBar({ dataset: datasetName, metric });
      const value = (chartData.find(d => d.datasetName === datasetName)?.[metric as keyof DatasetPerformanceData] as number * 100).toFixed(1);
      announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
    }
  }, [isMobile, chartData]);

  // Touch gesture handlers
  const touchHandlers = useTouchGestures({
    onSwipe: (direction, velocity) => {
      if (!isMobile || !scrollContainerRef.current) return;

      const scrollAmount = 200 * velocity;
      switch (direction) {
        case 'left':
          scrollContainerRef.current.scrollLeft += scrollAmount;
          break;
        case 'right':
          scrollContainerRef.current.scrollLeft -= scrollAmount;
          break;
        case 'up':
        case 'down':
          // Vertical scrolling handled by native scroll
          break;
      }
    },
    onDoubleTap: (x, y) => {
      if (isMobile) {
        setZoomLevel(prev => prev === 1 ? 1.5 : 1);
        announceToScreenReader(`Zoom ${zoomLevel === 1 ? 'in' : 'out'}`);
      }
    },
    onPinch: (scale, centerX, centerY) => {
      if (isMobile) {
        setZoomLevel(Math.max(1, Math.min(3, scale)));
        announceToScreenReader(`Zoom level: ${Math.round(scale * 100)}%`);
      }
    },
  }, {
    swipeThreshold: 30,
    pinchThreshold: 0.1,
    doubleTapDelay: 300,
    preventDefault: false, // Allow scrolling
  });

  const handleKeyDown = useCallback((event: React.KeyboardEvent, datasetName: string, metric: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedDataset(datasetName);
      setFocusedBar({ dataset: datasetName, metric });
      const value = (chartData.find(d => d.datasetName === datasetName)?.[metric as keyof DatasetPerformanceData] as number * 100).toFixed(1);
      announceToScreenReader(`${datasetName} ${metric}: ${value}%`);
    }
  }, [chartData]);

  const getBarColor = useCallback((metric: string, isHighlighted: boolean) => {
    const colors = {
      precision: isHighlighted ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-blue-5)',
      recall: isHighlighted ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-green-5)',
      f1Score: isHighlighted ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-violet-5)',
    };
    return colors[metric as keyof typeof colors] || 'var(--mantine-color-gray-5)';
  }, []);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'var(--mantine-color-gray-1)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          minHeight: actualHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="img"
        aria-label="No data available"
      >
        <p style={{ color: 'var(--mantine-color-dimmed)', margin: 0 }}>
          No comparison results available for visualization
        </p>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '12px',
        padding: isMobile ? '16px' : '24px',
        minHeight: actualHeight,
      }}
      role="img"
      aria-label={ariaLabel || `Performance chart showing ${chartData.length} datasets`}
      tabIndex={0}
    >
      {/* Title and description */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <h3
          style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            color: 'var(--mantine-color-text)',
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontSize: isMobile ? '14px' : '16px',
              color: 'var(--mantine-color-dimmed)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Chart container */}
      <div
        ref={scrollContainerRef}
        style={{
          height: `${actualHeight - (isMobile ? 80 : 100)}px`,
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
        {...touchHandlers.handlers}
      >
        <div
          style={{
            minWidth: isMobile ? `${600 * zoomLevel}px` : 'auto',
            transform: isMobile ? `scale(${zoomLevel})` : 'none',
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
          }}>
          {chartData.map((dataset, index) => (
            <div
              key={dataset.datasetName || `dataset-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '12px' : '16px',
                marginBottom: isMobile ? '20px' : '24px',
                padding: isMobile ? '8px' : '0',
              }}
            >
              {/* Dataset name */}
              <div
                style={{
                  width: isMobile ? '120px' : '200px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  color: 'var(--mantine-color-text)',
                  textAlign: isMobile ? 'left' : 'right',
                  flexShrink: 0,
                }}
              >
                {dataset.datasetName}
              </div>

              {/* Bars container */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: isMobile ? '3px' : '4px',
                  minWidth: 0,
                }}
              >
                {['precision', 'recall', 'f1Score'].map((metric) => {
                  const value = dataset[metric as keyof DatasetPerformanceData] as number;
                  const percentage = (value / maxValue) * 100;
                  const isFocused = focusedBar?.dataset === dataset.datasetName && focusedBar?.metric === metric;
                  const isSelected = selectedDataset === dataset.datasetName;

                  return (
                    <div
                      key={metric}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '6px' : '8px',
                      }}
                    >
                      {/* Metric label */}
                      <div
                        style={{
                          width: isMobile ? '50px' : '60px',
                          fontSize: isMobile ? '10px' : '12px',
                          color: isSelected ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
                          textAlign: 'right',
                          textTransform: 'capitalize',
                          fontWeight: isSelected ? 500 : 400,
                        }}
                      >
                        {metric.replace('f1Score', 'F1-Score')}
                      </div>

                      {/* Bar container */}
                      <div
                        style={{
                          flex: 1,
                          height: isMobile ? '12px' : '16px',
                          backgroundColor: 'var(--mantine-color-gray-2)',
                          borderRadius: isMobile ? '6px' : '8px',
                          position: 'relative',
                          overflow: 'hidden',
                          minWidth: '80px',
                        }}
                      >
                        {/* Bar */}
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: getBarColor(metric, isFocused),
                            borderRadius: isMobile ? '6px' : '8px',
                            transition: isMobile ? 'none' : 'all 0.2s ease',
                            cursor: isMobile ? 'pointer' : 'default',
                            transform: isFocused ? 'scaleY(1.1)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                          }}
                          onTouchStart={() => handleTouchStart(dataset.datasetName, metric)}
                          onKeyDown={(e) => handleKeyDown(e, dataset.datasetName, metric)}
                          tabIndex={0}
                          role="button"
                          aria-label={`${dataset.datasetName} ${metric}: ${(value * 100).toFixed(1)}%`}
                          aria-pressed={isFocused}
                        />
                      </div>

                      {/* Value */}
                      <div
                        style={{
                          width: isMobile ? '40px' : '50px',
                          fontSize: isMobile ? '10px' : '12px',
                          color: isSelected ? 'var(--mantine-color-text)' : 'var(--mantine-color-text)',
                          fontWeight: isFocused ? 600 : 500,
                          textAlign: 'right',
                        }}
                      >
                        {(value * 100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile selection indicator */}
      {isMobile && selectedDataset && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--mantine-color-blue-0)',
            border: '1px solid var(--mantine-color-blue-3)',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          role="status"
          aria-live="polite"
        >
          <strong>Selected:</strong> {selectedDataset}
          <br />
          <div style={{ fontSize: '12px', color: 'var(--mantine-color-dimmed)', marginTop: '8px' }}>
            <div>📱 Tap bars to hear values</div>
            <div>👆 Swipe to scroll horizontally</div>
            <div>🔍 Double-tap to zoom in/out</div>
            <div>🤏 Pinch to zoom (scale: {Math.round(zoomLevel * 100)}%)</div>
          </div>
        </div>
      )}

      {/* Desktop instructions */}
      {!isMobile && (
        <div
          style={{
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--mantine-color-dimmed)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          Hover over bars for details • Use Tab + Enter for keyboard navigation
        </div>
      )}
    </div>
  );
};

/**
 * Responsive scatter plot with touch and keyboard support
 * @param root0
 * @param root0.comparisonResults
 * @param root0.title
 * @param root0.description
 * @param root0.height
 * @param root0.mobileHeight
 * @param root0.ariaLabel
 */
export const ResponsiveScatterPlot = ({
  comparisonResults,
  title,
  description,
  height = 400,
  mobileHeight = 350,
  ariaLabel
}: ResponsiveChartProps) => {
  const theme = useMantineTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < (Number.parseInt(theme.breakpoints.sm.replace('px', ''))));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [theme.breakpoints.sm]);

  const plotData = useMemo(() => {
    return comparisonResults.map((result, index) => ({
      id: index,
      datasetName: result.dataset.name,
      precision: result.precision,
      recall: result.recall,
      f1Score: result.f1Score,
      totalPapers: result.dataset.includedPapers.length,
    }));
  }, [comparisonResults]);

  if (plotData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: 'var(--mantine-color-gray-1)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          minHeight: mobileHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="img"
        aria-label="No data available"
      >
        <p style={{ color: 'var(--mantine-color-dimmed)', margin: 0 }}>
          No comparison results available for scatter plot
        </p>
      </div>
    );
  }

  const plotSize = isMobile ? 250 : 300;
  const padding = isMobile ? 30 : 40;
  const touchRadius = isMobile ? 20 : 10;

  return (
    <div
      ref={plotRef}
      style={{
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: '12px',
        padding: isMobile ? '16px' : '24px',
      }}
      role="img"
      aria-label={ariaLabel || `Precision-Recall scatter plot with ${plotData.length} data points`}
      tabIndex={0}
    >
      {/* Title and description */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <h3
          style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            color: 'var(--mantine-color-text)',
            margin: '0 0 8px 0',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontSize: isMobile ? '14px' : '16px',
              color: 'var(--mantine-color-dimmed)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '16px' : '24px' }}>
        {/* SVG Plot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg
            width={plotSize + padding * 2}
            height={plotSize + padding * 2}
            style={{
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: '8px',
              cursor: isMobile ? 'pointer' : 'default',
            }}
            role="application"
            aria-label="Scatter plot showing precision vs recall trade-off"
          >
            {/* Grid lines */}
            <defs>
              <pattern
                id="grid"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="var(--mantine-color-gray-2)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Axes */}
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={plotSize + padding}
              stroke="var(--mantine-color-gray-6)"
              strokeWidth="2"
            />
            <line
              x1={padding}
              y1={plotSize + padding}
              x2={plotSize + padding}
              y2={plotSize + padding}
              stroke="var(--mantine-color-gray-6)"
              strokeWidth="2"
            />

            {/* Touch-friendly invisible hit areas for mobile */}
            {isMobile && plotData.map((point) => {
              const x = padding + point.recall * plotSize;
              const y = padding + (plotSize - point.precision * plotSize);
              return (
                <circle
                  key={`hit-${point.id}`}
                  cx={x}
                  cy={y}
                  r={touchRadius}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onTouchStart={() => setSelectedPoint(point.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPoint(point.id);
                      announceToScreenReader(`${point.datasetName}: Precision ${(point.precision * 100).toFixed(1)}%, Recall ${(point.recall * 100).toFixed(1)}%, F1 ${(point.f1Score * 100).toFixed(1)}%`);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.datasetName}: Precision ${(point.precision * 100).toFixed(1)}%, Recall ${(point.recall * 100).toFixed(1)}%`}
                />
              );
            })}

            {/* Data points */}
            {plotData.map((point) => {
              const x = padding + point.recall * plotSize;
              const y = padding + (plotSize - point.precision * plotSize);
              const radius = Math.max(
                isMobile ? 8 : 4,
                Math.min(isMobile ? 16 : 12, point.totalPapers / 20)
              );
              const isSelected = selectedPoint === point.id;

              return (
                <g key={point.id}>
                  {/* Selection highlight */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 4}
                      fill="var(--mantine-color-blue-1)"
                      stroke="var(--mantine-color-blue-4)"
                      strokeWidth={2}
                      style={{
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  )}

                  {/* Actual data point */}
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-blue-5)'}
                    fillOpacity={isSelected ? 1 : 0.7}
                    stroke={isSelected ? 'var(--mantine-color-blue-7)' : 'var(--mantine-color-blue-7)'}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{
                      cursor: 'pointer',
                      transition: isMobile ? 'none' : 'all 0.2s ease',
                    }}
                    onMouseEnter={!isMobile ? () => setSelectedPoint(point.id) : undefined}
                    onMouseLeave={!isMobile ? () => setSelectedPoint(null) : undefined}
                  />

                  {/* Tooltip */}
                  <title>
                    {point.datasetName}: Precision=
                    {(point.precision * 100).toFixed(1)}%, Recall=
                    {(point.recall * 100).toFixed(1)}%, F1=
                    {(point.f1Score * 100).toFixed(1)}%
                  </title>
                </g>
              );
            })}

            {/* Axis labels */}
            <text
              x={plotSize / 2 + padding}
              y={plotSize + padding + (isMobile ? 25 : 30)}
              textAnchor="middle"
              style={{ fontSize: isMobile ? '10px' : '12px', fill: 'var(--mantine-color-gray-6)' }}
            >
              Recall
            </text>
            <text
              x={15}
              y={plotSize / 2 + padding}
              textAnchor="middle"
              transform={`rotate(-90 15 ${String(plotSize / 2 + padding)})`}
              style={{ fontSize: isMobile ? '10px' : '12px', fill: 'var(--mantine-color-gray-6)' }}
            >
              Precision
            </text>

            {/* Scale indicators */}
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
              <g key={`scale-${String(tick)}`}>
                {/* X-axis ticks */}
                <line
                  x1={padding + tick * plotSize}
                  y1={plotSize + padding}
                  x2={padding + tick * plotSize}
                  y2={plotSize + padding + 5}
                  stroke="var(--mantine-color-gray-6)"
                  strokeWidth="1"
                />
                <text
                  x={padding + tick * plotSize}
                  y={plotSize + padding + (isMobile ? 15 : 18)}
                  textAnchor="middle"
                  style={{ fontSize: isMobile ? '9px' : '10px', fill: 'var(--mantine-color-gray-6)' }}
                >
                  {(tick * 100).toFixed(0)}%
                </text>

                {/* Y-axis ticks */}
                <line
                  x1={padding - 5}
                  y1={padding + plotSize - tick * plotSize}
                  x2={padding}
                  y2={padding + plotSize - tick * plotSize}
                  stroke="var(--mantine-color-gray-6)"
                  strokeWidth="1"
                />
                <text
                  x={padding - (isMobile ? 10 : 12)}
                  y={padding + plotSize - tick * plotSize + 3}
                  textAnchor="end"
                  style={{ fontSize: isMobile ? '9px' : '10px', fill: 'var(--mantine-color-gray-6)' }}
                >
                  {(tick * 100).toFixed(0)}%
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: isMobile ? '150px' : '200px',
            flexShrink: 0,
          }}
        >
          <h4
            style={{
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '600',
              color: 'var(--mantine-color-text)',
              marginBottom: '8px',
            }}
          >
            Datasets
          </h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {plotData.map((point) => (
              <div
                key={point.datasetName || `point-${point.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: isMobile ? '10px' : '12px',
                  color: selectedPoint === point.id ? 'var(--mantine-color-text)' : 'var(--mantine-color-gray-6)',
                  padding: isMobile ? '4px 0' : '2px 0',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: selectedPoint === point.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-blue-5)',
                    border: selectedPoint === point.id ? '1px solid var(--mantine-color-blue-7)' : '1px solid var(--mantine-color-blue-7)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {point.datasetName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile selection display */}
      {isMobile && selectedPoint !== null && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--mantine-color-blue-0)',
            border: '1px solid var(--mantine-color-blue-3)',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          role="status"
          aria-live="polite"
        >
          {(() => {
            const point = plotData.find(p => p.id === selectedPoint);
            if (!point) return null;
            return (
              <>
                <strong>{point.datasetName}</strong>
                <br />
                Precision: {(point.precision * 100).toFixed(1)}%
                <br />
                Recall: {(point.recall * 100).toFixed(1)}%
                <br />
                F1-Score: {(point.f1Score * 100).toFixed(1)}%
              </>
            );
          })()}
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          marginTop: '16px',
          fontSize: isMobile ? '11px' : '12px',
          color: 'var(--mantine-color-gray-6)',
          fontStyle: 'italic',
        }}
      >
        {isMobile ? (
          'Tap points to select • Swipe legend to scroll • Use Tab + Enter for keyboard navigation'
        ) : (
          'Circle size represents dataset size. Hover over points for detailed metrics.'
        )}
      </div>
    </div>
  );
};