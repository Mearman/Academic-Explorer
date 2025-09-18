/**
 * STAR comparison results dashboard
 * Display precision/recall metrics and thesis-ready statistics
 */

import { createFileRoute } from "@tanstack/react-router"
import React, { useState, useMemo, useEffect } from "react"
import { IconChartBar, IconSearch, IconBulb } from "@tabler/icons-react"
import { compareAcademicExplorerResults, DEFAULT_MATCHING_CONFIG } from "@/lib/evaluation/comparison-engine"
import { searchBasedOnSTARDataset, calculateSearchCoverage, DEFAULT_SEARCH_CONFIG } from "@/lib/evaluation/openalex-search-service"
import type { STARDataset, ComparisonResults as ComparisonResultsType, WorkReference, ComparisonProgress } from "@/lib/evaluation/types"

// Type guard for STARDataset array
function isSTARDatasetArray(data: unknown): data is STARDataset[] {
	return Array.isArray(data) && data.every(item =>
		typeof item === "object" &&
		item !== null &&
		"id" in item &&
		"name" in item &&
		"reviewTopic" in item &&
		"originalPaperCount" in item &&
		"includedPapers" in item
	)
}
import {
	PerformanceComparisonChart,
	PrecisionRecallScatterPlot,
	ConfusionMatrixHeatmap,
	DatasetStatisticsOverview
} from "@/components/evaluation/MetaAnalysisCharts"
import { MissingPaperDetection } from "@/components/evaluation/MissingPaperDetection"
import type { MissingPaperDetectionResults } from "@/lib/evaluation/missing-paper-detection"
import { logError, logger } from "@/lib/logger"

export const Route = createFileRoute("/evaluation/results")({
	component: ComparisonResults,
})

interface ComparisonRun {
  id: string
  datasetName: string
  runDate: Date
  status: "completed" | "running" | "failed" | "ready"
  comparisonResults?: ComparisonResultsType
  searchCriteria: {
    query: string
    entityTypes: string[]
    dateRange?: {
      start: number
      end: number
    }
  }
  executionTime?: number // milliseconds
  progress?: ComparisonProgress
  error?: string
}

interface LegacyResult {
  id: string
  datasetName: string
  runDate: Date
  status: string
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
  }
  executionTime: number
}

function ComparisonResults() {
	const [starDatasets, setStarDatasets] = useState<STARDataset[]>([])
	const [comparisonRuns, setComparisonRuns] = useState<ComparisonRun[]>([])
	const [isRunningComparison, setIsRunningComparison] = useState(false)
	const [, setSelectedDatasetId] = useState<string | null>(null)
	const [activeVisualizationTab, setActiveVisualizationTab] = useState<"performance" | "scatter" | "heatmap" | "overview">("performance")
	const [, setMissingPaperResults] = useState<{ [datasetId: string]: MissingPaperDetectionResults }>({})
	const [selectedDatasetForMissingPapers, setSelectedDatasetForMissingPapers] = useState<string | null>(null)

	// Load STAR datasets from localStorage on component mount
	useEffect(() => {
		try {
			const savedDatasets = localStorage.getItem("star-datasets")
			if (savedDatasets) {
				const parsedDatasets: unknown = JSON.parse(savedDatasets)
				if (isSTARDatasetArray(parsedDatasets)) {
					const datasets = parsedDatasets
					setStarDatasets(datasets)

					// Initialize comparison runs for each dataset
					const runs: ComparisonRun[] = datasets.map(dataset => ({
						id: `run_${dataset.id}`,
						datasetName: dataset.name,
						runDate: new Date(),
						status: "ready",
						searchCriteria: {
							query: dataset.reviewTopic,
							entityTypes: ["works"]
						}
					}))
					setComparisonRuns(runs)
				}
			}
		} catch (error) {
			logError("Failed to load STAR datasets:", error, "ComparisonResults", "routing")
		}
	}, [])

	// Real Academic Explorer search function using OpenAlex API
	const performAcademicExplorerSearch = async (dataset: STARDataset): Promise<WorkReference[]> => {
		try {
			// Use the optimized search based on the STAR dataset criteria
			const results = await searchBasedOnSTARDataset(dataset, DEFAULT_SEARCH_CONFIG)

			// Calculate and log search coverage for debugging
			const coverage = calculateSearchCoverage(results, dataset)
			logger.debug("api", "Search coverage analysis", { coverage }, "ComparisonResults");

			return results
		} catch (error) {
			logError("Academic Explorer search failed:", error, "ComparisonResults", "routing")
			throw error
		}
	}

	// Run comparison for a specific dataset
	const runComparison = async (datasetId: string) => {
		const dataset = starDatasets.find(d => d.id === datasetId)
		if (!dataset) return

		setIsRunningComparison(true)
		setSelectedDatasetId(datasetId)

		// Update run status
		setComparisonRuns(prev => prev.map(run =>
			run.id === `run_${datasetId}`
				? { ...run, status: "running" as const, runDate: new Date() }
				: run
		))

		try {
			const startTime = performance.now()

			// Step 1: Perform Academic Explorer search
			const academicExplorerResults = await performAcademicExplorerSearch(dataset)

			// Step 2: Run comparison with progress tracking
			const comparisonResults = compareAcademicExplorerResults(
				academicExplorerResults,
				dataset,
				DEFAULT_MATCHING_CONFIG,
				(progress) => {
					setComparisonRuns(prev => prev.map(run =>
						run.id === `run_${datasetId}`
							? { ...run, progress }
							: run
					))
				}
			)

			const executionTime = performance.now() - startTime

			// Update with completed results
			setComparisonRuns(prev => prev.map(run =>
				run.id === `run_${datasetId}`
					? {
						...run,
						status: "completed" as const,
						comparisonResults,
						executionTime,
						progress: undefined
					}
					: run
			))

		} catch (error) {
			logError("Comparison failed:", error, "ComparisonResults", "routing")
			setComparisonRuns(prev => prev.map(run =>
				run.id === `run_${datasetId}`
					? {
						...run,
						status: "failed" as const,
						error: error instanceof Error ? error.message : "Unknown error",
						progress: undefined
					}
					: run
			))
		} finally {
			setIsRunningComparison(false)
			setSelectedDatasetId(null)
		}
	}

	// Mock data for demonstration when no real datasets exist
	const mockResults = useMemo(() => [
		{
			id: "mock_comparison_1",
			datasetName: "Machine Learning Systematic Review",
			runDate: new Date("2025-01-10"),
			status: "completed",
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
				query: "machine learning systematic review",
				entityTypes: ["works", "authors"]
			},
			executionTime: 45000
		}
	], [])

	// Use real comparison runs if available, otherwise show mock data
	const displayResults = useMemo(() => {
		return comparisonRuns.length > 0 ? comparisonRuns : mockResults
	}, [comparisonRuns, mockResults])

	const averageMetrics = useMemo(() => {
		if (displayResults.length === 0) return null

		const completed = displayResults.filter(r => r.status === "completed")
		const totalResults = completed.length

		if (totalResults === 0) return null

		const metricsArray = completed.map(r => getResultMetrics(r)).filter(m => m !== null)

		if (metricsArray.length === 0) return null

		return {
			avgPrecision: metricsArray.reduce((sum, m) => sum + m.precision, 0) / metricsArray.length,
			avgRecall: metricsArray.reduce((sum, m) => sum + m.recall, 0) / metricsArray.length,
			avgF1Score: metricsArray.reduce((sum, m) => sum + m.f1Score, 0) / metricsArray.length,
			totalAdditionalPapers: metricsArray.reduce((sum, m) => sum + m.additionalPapersFound, 0),
			avgExecutionTime: completed.reduce((sum, r) => {
				const execTime = "executionTime" in r ? r.executionTime : 0
				return sum + (execTime || 0)
			}, 0) / totalResults
		}
	}, [displayResults])

	// Extract completed comparison results for visualizations
	const completedComparisonResults = useMemo(() => {
		return comparisonRuns
			.filter(run => run.status === "completed" && run.comparisonResults)
			.map(run => {
				if (!run.comparisonResults) {
					throw new Error("Comparison results missing for completed run")
				}
				return run.comparisonResults
			})
	}, [comparisonRuns])

	const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`
	const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`

	// Helper to get metrics from either ComparisonRun or legacy format
	const getResultMetrics = (result: ComparisonRun | LegacyResult) => {
		if ("comparisonResults" in result && result.comparisonResults) {
			const comp = result.comparisonResults
			return {
				precision: comp.precision,
				recall: comp.recall,
				f1Score: comp.f1Score,
				truePositives: comp.truePositives.length,
				falsePositives: comp.falsePositives.length,
				falseNegatives: comp.falseNegatives.length,
				totalFound: comp.academicExplorerResults.length,
				totalGroundTruth: comp.dataset.includedPapers.length,
				additionalPapersFound: comp.additionalPapersFound.length
			}
		} else if ("metrics" in result) {
			return result.metrics
		}
		return null
	}

	return (
		<div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
			{/* Header */}
			<div style={{ marginBottom: "32px" }}>
				<h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
          STAR Comparison Results
				</h1>
				<p style={{ fontSize: "16px", color: "#6b7280" }}>
          Detailed analysis of Academic Explorer performance against systematic literature review ground truth
				</p>
			</div>

			{/* Run Comparison Controls */}
			{starDatasets.length > 0 && (
				<div style={{
					backgroundColor: "white",
					borderRadius: "12px",
					border: "1px solid #e5e7eb",
					padding: "24px",
					marginBottom: "32px"
				}}>
					<h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
            Available STAR Datasets
					</h2>
					<div style={{ display: "grid", gap: "12px" }}>
						{starDatasets.map((dataset) => {
							const run = comparisonRuns.find(r => r.id === `run_${dataset.id}`)
							const isRunning = run?.status === "running"
							const isCompleted = run?.status === "completed"

							return (
								<div
									key={dataset.id}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: "16px",
										backgroundColor: "#f9fafb",
										borderRadius: "8px",
										border: "1px solid #e5e7eb"
									}}
								>
									<div>
										<h3 style={{ fontSize: "16px", fontWeight: "500", color: "#1f2937", marginBottom: "4px" }}>
											{dataset.name}
										</h3>
										<p style={{ fontSize: "14px", color: "#6b7280" }}>
											{dataset.originalPaperCount} papers • {dataset.reviewTopic}
										</p>
										{run?.progress && (
											<div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "4px" }}>
												{run.progress.message} ({run.progress.progress}%)
											</div>
										)}
									</div>
									<button
										onClick={() => void runComparison(dataset.id)}
										disabled={isRunningComparison || isRunning}
										style={{
											padding: "8px 16px",
											backgroundColor: isCompleted ? "#10b981" : (isRunning ? "#f59e0b" : "#3b82f6"),
											color: "white",
											border: "none",
											borderRadius: "6px",
											fontSize: "14px",
											fontWeight: "500",
											cursor: isRunningComparison || isRunning ? "not-allowed" : "pointer",
											opacity: isRunningComparison || isRunning ? 0.6 : 1
										}}
									>
										{isCompleted ? "Re-run" : (isRunning ? "Running..." : "Run Comparison")}
									</button>
								</div>
							)
						})}
					</div>
				</div>
			)}

			{displayResults.length === 0 ? (
				<div style={{
					backgroundColor: "#f9fafb",
					borderRadius: "12px",
					border: "1px solid #e5e7eb",
					padding: "48px 24px",
					textAlign: "center"
				}}>
					<div style={{ marginBottom: "16px", opacity: 0.3 }}>
						<IconChartBar size={48} />
					</div>
					<h3 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
            No comparison results available
					</h3>
					<p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
						{starDatasets.length === 0
							? "Upload STAR datasets first, then run comparisons to see detailed performance metrics here"
							: "Run comparisons against uploaded STAR datasets to see detailed performance metrics here"
						}
					</p>
				</div>
			) : (
				<>
					{/* Summary Metrics */}
					{averageMetrics && (
						<div style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "16px",
							marginBottom: "32px"
						}}>
							<div style={{
								backgroundColor: "white",
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								padding: "20px",
								textAlign: "center"
							}}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6", marginBottom: "8px" }}>
									{formatPercent(averageMetrics.avgPrecision)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Average Precision
								</div>
							</div>

							<div style={{
								backgroundColor: "white",
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								padding: "20px",
								textAlign: "center"
							}}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981", marginBottom: "8px" }}>
									{formatPercent(averageMetrics.avgRecall)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Average Recall
								</div>
							</div>

							<div style={{
								backgroundColor: "white",
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								padding: "20px",
								textAlign: "center"
							}}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6", marginBottom: "8px" }}>
									{formatPercent(averageMetrics.avgF1Score)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Average F1-Score
								</div>
							</div>

							<div style={{
								backgroundColor: "white",
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								padding: "20px",
								textAlign: "center"
							}}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b", marginBottom: "8px" }}>
                  +{averageMetrics.totalAdditionalPapers}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Additional Papers Found
								</div>
							</div>

							<div style={{
								backgroundColor: "white",
								borderRadius: "8px",
								border: "1px solid #e5e7eb",
								padding: "20px",
								textAlign: "center"
							}}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#6b7280", marginBottom: "8px" }}>
									{formatTime(averageMetrics.avgExecutionTime)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280", fontWeight: "500" }}>
                  Average Execution Time
								</div>
							</div>
						</div>
					)}

					{/* Individual Results */}
					<div style={{
						backgroundColor: "white",
						borderRadius: "12px",
						border: "1px solid #e5e7eb",
						overflow: "hidden"
					}}>
						<div style={{
							padding: "20px",
							borderBottom: "1px solid #e5e7eb",
							backgroundColor: "#f9fafb"
						}}>
							<h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", margin: 0 }}>
                Individual Comparison Results
							</h2>
						</div>

						<div style={{ overflow: "auto" }}>
							{displayResults.map((result, index) => {
								const metrics = getResultMetrics(result)
								if (!metrics) return null

								return (
									<div
										key={result.id}
										style={{
											padding: "20px",
											borderBottom: index < displayResults.length - 1 ? "1px solid #f3f4f6" : "none"
										}}
									>
										<div style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "flex-start",
											marginBottom: "16px"
										}}>
											<div>
												<h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
													{result.datasetName}
												</h3>
												<p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                        Query: "{result.searchCriteria.query}"
												</p>
												<p style={{ fontSize: "12px", color: "#9ca3af" }}>
                        Completed on {result.runDate.toLocaleDateString()} •
													{formatTime(("executionTime" in result ? result.executionTime : 0) || 0)} • {"apiCalls" in result && result.apiCalls ? result.apiCalls : "N/A"} API calls
												</p>
											</div>

											<div style={{
												backgroundColor: result.status === "completed" ? "#dcfce7" : "#fef3c7",
												color: result.status === "completed" ? "#065f46" : "#92400e",
												padding: "4px 8px",
												borderRadius: "4px",
												fontSize: "12px",
												fontWeight: "500",
												textTransform: "capitalize"
											}}>
												{result.status}
											</div>
										</div>

										<div style={{
											display: "grid",
											gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
											gap: "16px",
											marginBottom: "16px"
										}}>
											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#3b82f6" }}>
													{formatPercent(metrics.precision)}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>Precision</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>
													{formatPercent(metrics.recall)}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>Recall</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#8b5cf6" }}>
													{formatPercent(metrics.f1Score)}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>F1-Score</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>
													{metrics.truePositives}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>True Positives</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}>
													{metrics.falsePositives}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>False Positives</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#b45309" }}>
													{metrics.falseNegatives}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>False Negatives</div>
											</div>

											<div style={{ textAlign: "center" }}>
												<div style={{ fontSize: "20px", fontWeight: "bold", color: "#f59e0b" }}>
                        +{metrics.additionalPapersFound}
												</div>
												<div style={{ fontSize: "12px", color: "#6b7280" }}>Additional Found</div>
											</div>
										</div>

										<div style={{
											display: "flex",
											gap: "12px",
											flexWrap: "wrap"
										}}>
											<button
												style={{
													backgroundColor: "#f3f4f6",
													color: "#374151",
													padding: "8px 12px",
													borderRadius: "6px",
													border: "none",
													fontSize: "13px",
													fontWeight: "500",
													cursor: "pointer"
												}}
												onClick={() => { logger.debug("ui", "View detailed breakdown clicked", { resultId: result.id }, "ComparisonResults"); }}
											>
                      View Breakdown
											</button>

											<button
												style={{
													backgroundColor: "#3b82f6",
													color: "white",
													padding: "8px 12px",
													borderRadius: "6px",
													border: "none",
													fontSize: "13px",
													fontWeight: "500",
													cursor: "pointer"
												}}
												onClick={() => { logger.debug("ui", "Export results clicked", { resultId: result.id }, "ComparisonResults"); }}
											>
                      Export Results
											</button>

											<button
												style={{
													backgroundColor: "#10b981",
													color: "white",
													padding: "8px 12px",
													borderRadius: "6px",
													border: "none",
													fontSize: "13px",
													fontWeight: "500",
													cursor: "pointer"
												}}
												onClick={() => { logger.debug("ui", "View additional papers clicked", { resultId: result.id }, "ComparisonResults"); }}
											>
                      View Additional Papers ({metrics.additionalPapersFound})
											</button>
										</div>
									</div>
								)
							})}
						</div>
					</div>

					{/* Meta-Analysis Visualizations */}
					{completedComparisonResults.length > 0 && (
						<div style={{
							backgroundColor: "white",
							borderRadius: "12px",
							border: "1px solid #e5e7eb",
							marginTop: "32px",
							overflow: "hidden"
						}}>
							<div style={{
								padding: "20px",
								borderBottom: "1px solid #e5e7eb",
								backgroundColor: "#f9fafb"
							}}>
								<h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
                  Meta-Analysis Visualizations
								</h2>
								<p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Advanced charts and statistical visualizations for thesis presentation
								</p>
							</div>

							{/* Visualization Tabs */}
							<div style={{
								display: "flex",
								borderBottom: "1px solid #e5e7eb",
								backgroundColor: "#fafbfc"
							}}>
								{[
									{ key: "performance", label: "Performance Comparison" },
									{ key: "scatter", label: "Precision-Recall Plot" },
									{ key: "heatmap", label: "Confusion Matrix" },
									{ key: "overview", label: "Statistical Overview" }
								].map((tab) => (
									<button
										key={tab.key}
										onClick={() => {
											if (tab.key === "performance" || tab.key === "scatter" || tab.key === "heatmap" || tab.key === "overview") {
												setActiveVisualizationTab(tab.key)
											}
										}}
										style={{
											padding: "12px 20px",
											border: "none",
											backgroundColor: activeVisualizationTab === tab.key ? "white" : "transparent",
											color: activeVisualizationTab === tab.key ? "#3b82f6" : "#6b7280",
											fontWeight: activeVisualizationTab === tab.key ? "600" : "400",
											fontSize: "14px",
											cursor: "pointer",
											borderBottom: activeVisualizationTab === tab.key ? "2px solid #3b82f6" : "none",
											transition: "all 0.2s"
										}}
										onMouseEnter={(e) => {
											if (activeVisualizationTab !== tab.key) {
												e.currentTarget.style.backgroundColor = "#f3f4f6"
											}
										}}
										onMouseLeave={(e) => {
											if (activeVisualizationTab !== tab.key) {
												e.currentTarget.style.backgroundColor = "transparent"
											}
										}}
									>
										{tab.label}
									</button>
								))}
							</div>

							{/* Visualization Content */}
							<div style={{ padding: "24px" }}>
								{activeVisualizationTab === "performance" && (
									<PerformanceComparisonChart comparisonResults={completedComparisonResults} />
								)}
								{activeVisualizationTab === "scatter" && (
									<PrecisionRecallScatterPlot comparisonResults={completedComparisonResults} />
								)}
								{activeVisualizationTab === "heatmap" && (
									<ConfusionMatrixHeatmap comparisonResults={completedComparisonResults} />
								)}
								{activeVisualizationTab === "overview" && (
									<DatasetStatisticsOverview comparisonResults={completedComparisonResults} />
								)}
							</div>
						</div>
					)}

					{/* Missing Paper Detection */}
					{starDatasets.length > 0 && (
						<div style={{
							backgroundColor: "white",
							borderRadius: "12px",
							border: "1px solid #e5e7eb",
							marginTop: "32px",
							overflow: "hidden"
						}}>
							<div style={{
								padding: "20px",
								borderBottom: "1px solid #e5e7eb",
								backgroundColor: "#f9fafb"
							}}>
								<h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
                  Missing Paper Detection
								</h2>
								<p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  Identify potentially relevant papers that systematic reviews may have missed
								</p>
							</div>

							<div style={{ padding: "24px" }}>
								{/* Dataset Selection */}
								<div style={{ marginBottom: "24px" }}>
									<label
										htmlFor="dataset-select"
										style={{
											fontSize: "14px",
											fontWeight: "500",
											color: "#374151",
											display: "block",
											marginBottom: "8px"
										}}
									>
                    Select Dataset for Missing Paper Analysis:
									</label>
									<select
										id="dataset-select"
										value={selectedDatasetForMissingPapers || ""}
										onChange={(e) => { setSelectedDatasetForMissingPapers(e.target.value || null); }}
										style={{
											padding: "8px 12px",
											borderRadius: "6px",
											border: "1px solid #d1d5db",
											fontSize: "14px",
											backgroundColor: "white",
											minWidth: "300px"
										}}
									>
										<option value="">Choose a dataset...</option>
										{starDatasets.map((dataset) => (
											<option key={dataset.id} value={dataset.id}>
												{dataset.name} ({dataset.originalPaperCount} papers)
											</option>
										))}
									</select>
								</div>

								{/* Missing Paper Detection Component */}
								{selectedDatasetForMissingPapers && starDatasets.find(d => d.id === selectedDatasetForMissingPapers) && (
									<MissingPaperDetection
										dataset={(() => {
											const foundDataset = starDatasets.find(d => d.id === selectedDatasetForMissingPapers)
											if (!foundDataset) {
												throw new Error("Dataset not found")
											}
											return foundDataset
										})()}
										onDetectionComplete={(results) => {
											setMissingPaperResults(prev => ({
												...prev,
												[selectedDatasetForMissingPapers]: results
											}))
										}}
									/>
								)}

								{!selectedDatasetForMissingPapers && (
									<div style={{
										textAlign: "center",
										padding: "48px 24px",
										backgroundColor: "#f9fafb",
										borderRadius: "8px"
									}}>
										<div style={{ marginBottom: "16px", opacity: 0.3 }}>
											<IconSearch size={48} />
										</div>
										<h3 style={{ fontSize: "18px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                      Select a Dataset
										</h3>
										<p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                      Choose a STAR dataset above to begin missing paper detection analysis
										</p>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Thesis Integration Notes */}
					<div style={{
						backgroundColor: "#fef3c7",
						borderRadius: "8px",
						border: "1px solid #fbbf24",
						padding: "16px",
						marginTop: "24px"
					}}>
						<h3 style={{ fontSize: "16px", fontWeight: "600", color: "#92400e", marginBottom: "8px" }}>
							<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
								<IconBulb size={16} />
                Thesis Integration Notes
							</span>
						</h3>
						<p style={{ fontSize: "14px", color: "#78350f", lineHeight: "1.5", margin: 0 }}>
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