/**
 * STAR comparison results dashboard
 * Display precision/recall metrics and thesis-ready statistics
 */

import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'

export const Route = createFileRoute('/evaluation/results')({
  component: ComparisonResults,
})

interface ComparisonResult {
  id: string
  datasetName: string
  runDate: Date
  status: 'completed' | 'running' | 'failed'
  metrics: {
    precision: number
    recall: number
    f1Score: number
    truePositives: number
    falsePositives: number
    falseNegatives: number
    totalFound: number
    totalGroundTruth: number
    additionalPapersFound: number
  }
  searchCriteria: {
    query: string
    entityTypes: string[]
    dateRange?: {
      start: number
      end: number
    }
  }
  executionTime: number // milliseconds
  apiCalls: number
}

function ComparisonResults() {
  // Mock data for demonstration
  const [results] = useState<ComparisonResult[]>([
    {
      id: 'comparison_1',
      datasetName: 'Machine Learning Systematic Review',
      runDate: new Date('2025-01-10'),
      status: 'completed',
      metrics: {
        precision: 0.87,
        recall: 0.92,
        f1Score: 0.895,
        truePositives: 156,
        falsePositives: 23,
        falseNegatives: 14,
        totalFound: 179,
        totalGroundTruth: 170,
        additionalPapersFound: 12
      },
      searchCriteria: {
        query: 'machine learning systematic review',
        entityTypes: ['works', 'authors']
      },
      executionTime: 45000,
      apiCalls: 67
    },
    {
      id: 'comparison_2',
      datasetName: 'Cultural Heritage Digital Preservation',
      runDate: new Date('2025-01-12'),
      status: 'completed',
      metrics: {
        precision: 0.91,
        recall: 0.85,
        f1Score: 0.88,
        truePositives: 89,
        falsePositives: 9,
        falseNegatives: 16,
        totalFound: 98,
        totalGroundTruth: 105,
        additionalPapersFound: 18
      },
      searchCriteria: {
        query: 'digital preservation cultural heritage',
        entityTypes: ['works'],
        dateRange: { start: 2015, end: 2023 }
      },
      executionTime: 32000,
      apiCalls: 43
    }
  ])

  const averageMetrics = useMemo(() => {
    if (results.length === 0) return null

    const completed = results.filter(r => r.status === 'completed')
    const totalResults = completed.length

    return {
      avgPrecision: completed.reduce((sum, r) => sum + r.metrics.precision, 0) / totalResults,
      avgRecall: completed.reduce((sum, r) => sum + r.metrics.recall, 0) / totalResults,
      avgF1Score: completed.reduce((sum, r) => sum + r.metrics.f1Score, 0) / totalResults,
      totalAdditionalPapers: completed.reduce((sum, r) => sum + r.metrics.additionalPapersFound, 0),
      avgExecutionTime: completed.reduce((sum, r) => sum + r.executionTime, 0) / totalResults
    }
  }, [results])

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
          STAR Comparison Results
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280' }}>
          Detailed analysis of Academic Explorer performance against systematic literature review ground truth
        </p>
      </div>

      {results.length === 0 ? (
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            No comparison results available
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Run comparisons against STAR datasets to see detailed performance metrics here
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metrics */}
          {averageMetrics && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>
                  {formatPercent(averageMetrics.avgPrecision)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  Average Precision
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                  {formatPercent(averageMetrics.avgRecall)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  Average Recall
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '8px' }}>
                  {formatPercent(averageMetrics.avgF1Score)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  Average F1-Score
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                  +{averageMetrics.totalAdditionalPapers}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  Additional Papers Found
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px' }}>
                  {formatTime(averageMetrics.avgExecutionTime)}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  Average Execution Time
                </div>
              </div>
            </div>
          )}

          {/* Individual Results */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Individual Comparison Results
              </h2>
            </div>

            <div style={{ overflow: 'auto' }}>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < results.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {result.datasetName}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Query: "{result.searchCriteria.query}"
                      </p>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Completed on {result.runDate.toLocaleDateString()} •
                        {formatTime(result.executionTime)} • {result.apiCalls} API calls
                      </p>
                    </div>

                    <div style={{
                      backgroundColor: result.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: result.status === 'completed' ? '#065f46' : '#92400e',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {result.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {formatPercent(result.metrics.precision)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Precision</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                        {formatPercent(result.metrics.recall)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Recall</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                        {formatPercent(result.metrics.f1Score)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>F1-Score</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
                        {result.metrics.truePositives}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>True Positives</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
                        {result.metrics.falsePositives}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>False Positives</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#b45309' }}>
                        {result.metrics.falseNegatives}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>False Negatives</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                        +{result.metrics.additionalPapersFound}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Additional Found</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      style={{
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      onClick={() => console.log('View detailed breakdown for:', result.id)}
                    >
                      View Breakdown
                    </button>

                    <button
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      onClick={() => console.log('Export results for:', result.id)}
                    >
                      Export Results
                    </button>

                    <button
                      style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                      onClick={() => console.log('View additional papers for:', result.id)}
                    >
                      View Additional Papers ({result.metrics.additionalPapersFound})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Thesis Integration Notes */}
          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fbbf24',
            padding: '16px',
            marginTop: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
              💡 Thesis Integration Notes
            </h3>
            <p style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.5', margin: 0 }}>
              These results demonstrate Academic Explorer's quantitative performance improvements over traditional
              systematic review methodologies. The precision/recall metrics and additional papers discovered provide
              statistical evidence for Chapter 6 evaluation. Export individual results for detailed statistical analysis
              and inclusion in thesis appendices.
            </p>
          </div>
        </>
      )}
    </div>
  )
}