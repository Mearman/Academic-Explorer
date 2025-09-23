/**
 * Missing Paper Detection Component for STAR Evaluation
 * Provides UI for identifying potentially missed papers in systematic reviews
 */

import React, { useState, useMemo } from "react"
import { IconClipboard, IconAlertTriangle } from "@tabler/icons-react"
import type {
	MissingPaperDetectionResults,
	MissingPaperDetectionConfig,
	DetectionProgress
} from "@academic-explorer/shared-utils";
import type { STARDataset, WorkReference } from "@academic-explorer/shared-utils";
import { logger } from "@academic-explorer/shared-utils/logger";

interface MissingPaperDetectionProps {
  dataset: STARDataset
  onDetectionComplete?: (results: MissingPaperDetectionResults) => void
}

interface DetectionJob {
  id: string
  datasetId: string
  status: "ready" | "running" | "completed" | "failed"
  results?: MissingPaperDetectionResults
  progress?: DetectionProgress
  error?: string
  startTime?: Date
  endTime?: Date
}

export function MissingPaperDetection({ dataset, onDetectionComplete }: MissingPaperDetectionProps) {
	const [detectionJobs, setDetectionJobs] = useState<DetectionJob[]>([])
	const [detectionConfig, setDetectionConfig] = useState<MissingPaperDetectionConfig>({
		maxPapersPerMethod: 50,
		minimumCitationThreshold: 5,
		temporalWindowYears: 2,
		enableCitationAnalysis: true,
		enableAuthorAnalysis: true,
		enableTemporalAnalysis: true,
		enableKeywordExpansion: false
	})

	const currentJob = useMemo(() => {
		return detectionJobs.find(job => job.datasetId === dataset.id)
	}, [detectionJobs, dataset.id])

	const handleStartDetection = async () => {
		const jobId = "detection_" + dataset.id + "_" + Date.now().toString()
		const newJob: DetectionJob = {
			id: jobId,
			datasetId: dataset.id,
			status: "running",
			startTime: new Date()
		}

		setDetectionJobs(prev => [...prev.filter(j => j.datasetId !== dataset.id), newJob])

		try {
			// Dynamic import to avoid loading the heavy detection module until needed
			const { detectMissingPapers } = await import("@academic-explorer/shared-utils")

			const results = await detectMissingPapers(
				dataset,
				detectionConfig,
				(progress) => {
					setDetectionJobs(prev => prev.map(job =>
						job.id === jobId ? { ...job, progress } : job
					))
				}
			)

			const completedJob: DetectionJob = {
				...newJob,
				status: "completed",
				results,
				endTime: new Date(),
				progress: undefined
			}

			setDetectionJobs(prev => prev.map(job =>
				job.id === jobId ? completedJob : job
			))

			onDetectionComplete?.(results)
		} catch (error) {
			const failedJob: DetectionJob = {
				...newJob,
				status: "failed",
				error: error instanceof Error ? error.message : "Detection failed",
				endTime: new Date(),
				progress: undefined
			}

			setDetectionJobs(prev => prev.map(job =>
				job.id === jobId ? failedJob : job
			))
		}
	}

	const formatExecutionTime = (job: DetectionJob): string => {
		if (!job.startTime || !job.endTime) return "N/A"
		const duration = job.endTime.getTime() - job.startTime.getTime()
		return `${(duration / 1000).toFixed(1)}s`
	}

	return (
		<div style={{
			backgroundColor: "white",
			borderRadius: "12px",
			border: "1px solid #e5e7eb",
			padding: "24px"
		}}>
			{/* Header */}
			<div style={{ marginBottom: "24px" }}>
				<h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "8px" }}>
          Missing Paper Detection
				</h3>
				<p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Identify potentially relevant papers that may have been missed by the systematic review
				</p>
			</div>

			{/* Configuration Panel */}
			<div style={{
				backgroundColor: "#f9fafb",
				borderRadius: "8px",
				border: "1px solid #e5e7eb",
				padding: "20px",
				marginBottom: "24px"
			}}>
				<h4 style={{ fontSize: "16px", fontWeight: "500", color: "#1f2937", marginBottom: "16px" }}>
          Detection Configuration
				</h4>

				<div style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "16px",
					marginBottom: "16px"
				}}>
					<div>
						<label htmlFor="max-papers-input" style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
              Max Papers per Method
						</label>
						<input
							id="max-papers-input"
							type="number"
							value={detectionConfig.maxPapersPerMethod}
							onChange={(e) => { setDetectionConfig(prev => ({ ...prev, maxPapersPerMethod: parseInt(e.target.value) })); }}
							style={{
								width: "100%",
								padding: "8px 12px",
								borderRadius: "6px",
								border: "1px solid #d1d5db",
								fontSize: "14px"
							}}
							min="10"
							max="200"
						/>
					</div>

					<div>
						<label htmlFor="min-citation-input" style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
              Min Citation Threshold
						</label>
						<input
							id="min-citation-input"
							type="number"
							value={detectionConfig.minimumCitationThreshold}
							onChange={(e) => { setDetectionConfig(prev => ({ ...prev, minimumCitationThreshold: parseInt(e.target.value) })); }}
							style={{
								width: "100%",
								padding: "8px 12px",
								borderRadius: "6px",
								border: "1px solid #d1d5db",
								fontSize: "14px"
							}}
							min="0"
							max="50"
						/>
					</div>

					<div>
						<label htmlFor="temporal-window-input" style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "4px" }}>
              Temporal Window (Years)
						</label>
						<input
							id="temporal-window-input"
							type="number"
							value={detectionConfig.temporalWindowYears}
							onChange={(e) => { setDetectionConfig(prev => ({ ...prev, temporalWindowYears: parseInt(e.target.value) })); }}
							style={{
								width: "100%",
								padding: "8px 12px",
								borderRadius: "6px",
								border: "1px solid #d1d5db",
								fontSize: "14px"
							}}
							min="0"
							max="10"
						/>
					</div>
				</div>

				{/* Detection Method Toggles */}
				<div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
					{[
						{ key: "enableTemporalAnalysis", label: "Temporal Gap Analysis" },
						{ key: "enableCitationAnalysis", label: "Citation Network Analysis" },
						{ key: "enableAuthorAnalysis", label: "Author Network Analysis" },
						{ key: "enableKeywordExpansion", label: "Keyword Expansion (Experimental)" }
					].map(({ key, label }) => (
						<label key={key} style={{ display: "flex", alignItems: "center", fontSize: "14px", color: "#374151" }}>
							<input
								type="checkbox"
								checked={(() => {
									// Type guard to check if key is a valid config property
									if (key === "enableTemporalAnalysis" || key === "enableCitationAnalysis" ||
                      key === "enableAuthorAnalysis" || key === "enableKeywordExpansion") {
										const value = detectionConfig[key];
										return typeof value === "boolean" ? value : false;
									}
									return false;
								})()}
								onChange={(e) => { setDetectionConfig(prev => ({ ...prev, [key]: e.target.checked })); }}
								style={{ marginRight: "8px" }}
							/>
							{label}
						</label>
					))}
				</div>
			</div>

			{/* Detection Control */}
			<div style={{ marginBottom: "24px" }}>
				<button
					onClick={() => { void handleStartDetection(); }}
					disabled={currentJob?.status === "running"}
					style={{
						padding: "12px 24px",
						backgroundColor: currentJob?.status === "running" ? "#9ca3af" : "#3b82f6",
						color: "white",
						border: "none",
						borderRadius: "8px",
						fontSize: "16px",
						fontWeight: "600",
						cursor: currentJob?.status === "running" ? "not-allowed" : "pointer",
						marginRight: "12px"
					}}
				>
					{currentJob?.status === "running" ? "Detecting..." : "Start Detection"}
				</button>

				{currentJob?.results && (
					<button
						onClick={() => { logger.debug("ui", "Export detection results clicked", { resultsCount: currentJob.results?.candidateMissingPapers.length }, "MissingPaperDetection"); }}
						style={{
							padding: "12px 24px",
							backgroundColor: "#10b981",
							color: "white",
							border: "none",
							borderRadius: "8px",
							fontSize: "16px",
							fontWeight: "600",
							cursor: "pointer"
						}}
					>
            Export Results
					</button>
				)}
			</div>

			{/* Progress Display */}
			{currentJob?.progress && (
				<div style={{
					backgroundColor: "#fef3c7",
					borderRadius: "8px",
					border: "1px solid #fbbf24",
					padding: "16px",
					marginBottom: "24px"
				}}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
						<span style={{ fontSize: "14px", fontWeight: "500", color: "#92400e" }}>
							{currentJob.progress.currentMethod}
						</span>
						<span style={{ fontSize: "14px", fontWeight: "500", color: "#92400e" }}>
							{currentJob.progress.progress}%
						</span>
					</div>
					<div style={{
						width: "100%",
						backgroundColor: "#fde68a",
						borderRadius: "4px",
						height: "8px",
						marginBottom: "8px"
					}}>
						<div style={{
							width: `${String(currentJob.progress.progress)}%`,
							backgroundColor: "#f59e0b",
							borderRadius: "4px",
							height: "100%"
						}} />
					</div>
					<p style={{ fontSize: "12px", color: "#78350f", margin: 0 }}>
						{currentJob.progress.message} • {currentJob.progress.papersFound} papers found
					</p>
				</div>
			)}

			{/* Results Display */}
			{currentJob?.results && (
				<MissingPaperResults
					results={currentJob.results}
					executionTime={formatExecutionTime(currentJob)}
				/>
			)}

			{/* Error Display */}
			{currentJob?.status === "failed" && (
				<div style={{
					backgroundColor: "#fef2f2",
					borderRadius: "8px",
					border: "1px solid #fca5a5",
					padding: "16px"
				}}>
					<h4 style={{ fontSize: "16px", fontWeight: "500", color: "#dc2626", marginBottom: "8px" }}>
            Detection Failed
					</h4>
					<p style={{ fontSize: "14px", color: "#7f1d1d", margin: 0 }}>
						{currentJob.error}
					</p>
				</div>
			)}
		</div>
	)
}

interface MissingPaperResultsProps {
  results: MissingPaperDetectionResults
  executionTime: string
}

function MissingPaperResults({ results, executionTime }: MissingPaperResultsProps) {
	const [activeTab, setActiveTab] = useState<"summary" | "candidates" | "methods" | "validation">("summary")

	const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

	return (
		<div style={{
			border: "1px solid #e5e7eb",
			borderRadius: "8px",
			overflow: "hidden"
		}}>
			{/* Tabs */}
			<div style={{
				display: "flex",
				borderBottom: "1px solid #e5e7eb",
				backgroundColor: "#f9fafb"
			}}>
				{[
					{ key: "summary", label: "Summary" },
					{ key: "candidates", label: `Candidates (${String(results.candidateMissingPapers.length)})` },
					{ key: "methods", label: "Methods" },
					{ key: "validation", label: "Validation" }
				].map((tab) => (
					<button
						key={tab.key}
						onClick={() => {
							const tabKey = tab.key;
							if (tabKey === "summary" || tabKey === "candidates" || tabKey === "methods" || tabKey === "validation") {
								setActiveTab(tabKey);
							}
						}}
						style={{
							padding: "12px 20px",
							border: "none",
							backgroundColor: activeTab === tab.key ? "white" : "transparent",
							color: activeTab === tab.key ? "#3b82f6" : "#6b7280",
							fontWeight: activeTab === tab.key ? "600" : "400",
							fontSize: "14px",
							cursor: "pointer",
							borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "none"
						}}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div style={{ padding: "24px" }}>
				{activeTab === "summary" && (
					<div>
						<h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
              Detection Summary
						</h4>

						<div style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "16px",
							marginBottom: "24px"
						}}>
							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#3b82f6", marginBottom: "8px" }}>
									{results.detectionStatistics.totalCandidates}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280" }}>Total Candidates</div>
							</div>

							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981", marginBottom: "8px" }}>
									{results.detectionStatistics.highConfidenceCandidates}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280" }}>High Confidence</div>
							</div>

							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6", marginBottom: "8px" }}>
									{results.detectionStatistics.averageCitationCount.toFixed(1)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280" }}>Avg Citations</div>
							</div>

							<div style={{ textAlign: "center" }}>
								<div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b", marginBottom: "8px" }}>
									{formatPercent(results.validationMetrics.confidenceScore)}
								</div>
								<div style={{ fontSize: "14px", color: "#6b7280" }}>Confidence</div>
							</div>
						</div>

						<div style={{
							backgroundColor: "#f3f4f6",
							borderRadius: "8px",
							padding: "16px"
						}}>
							<h5 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                Execution Details
							</h5>
							<p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                Dataset: {results.dataset.name} • Execution Time: {executionTime} •
                Methods: {Object.values(results.detectionStatistics.methodContributions).filter(count => count > 0).length}/4
							</p>
						</div>
					</div>
				)}

				{activeTab === "candidates" && (
					<div>
						<h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
              Candidate Missing Papers
						</h4>

						{results.candidateMissingPapers.length === 0 ? (
							<div style={{
								textAlign: "center",
								padding: "48px 24px",
								backgroundColor: "#f9fafb",
								borderRadius: "8px"
							}}>
								<div style={{ marginBottom: "16px", opacity: 0.3 }}>
									<IconClipboard size={48} />
								</div>
								<p style={{ fontSize: "16px", color: "#6b7280", margin: 0 }}>
                  No potential missing papers detected
								</p>
							</div>
						) : (
							<div style={{ display: "grid", gap: "16px" }}>
								{results.candidateMissingPapers.slice(0, 20).map((paper, index) => (
									<PaperCard key={paper.title || `paper-${String(index)}`} paper={paper} rank={index + 1} />
								))}

								{results.candidateMissingPapers.length > 20 && (
									<div style={{
										textAlign: "center",
										padding: "16px",
										backgroundColor: "#f9fafb",
										borderRadius: "8px"
									}}>
										<p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                      Showing top 20 of {results.candidateMissingPapers.length} candidates
										</p>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{activeTab === "methods" && (
					<div>
						<h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
              Detection Methods Breakdown
						</h4>

						<div style={{ display: "grid", gap: "16px" }}>
							{Object.entries(results.detectionStatistics.methodContributions).map(([method, count]) => (
								<div
									key={method}
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										padding: "16px",
										backgroundColor: "#f9fafb",
										borderRadius: "8px"
									}}
								>
									<div>
										<h5 style={{ fontSize: "14px", fontWeight: "500", color: "#1f2937", marginBottom: "4px" }}>
											{method.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
										</h5>
										<p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
											{getMethodDescription(method)}
										</p>
									</div>
									<div style={{
										padding: "8px 16px",
										backgroundColor: count > 0 ? "#10b981" : "#9ca3af",
										color: "white",
										borderRadius: "20px",
										fontSize: "14px",
										fontWeight: "600"
									}}>
										{count}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{activeTab === "validation" && (
					<div>
						<h4 style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>
              Validation Metrics
						</h4>

						<div style={{ marginBottom: "24px" }}>
							<div style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "8px"
							}}>
								<span style={{ fontSize: "14px", color: "#374151" }}>Algorithm Confidence</span>
								<span style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
									{formatPercent(results.validationMetrics.confidenceScore)}
								</span>
							</div>
							<div style={{
								width: "100%",
								backgroundColor: "#e5e7eb",
								borderRadius: "4px",
								height: "8px"
							}}>
								<div style={{
									width: `${String(results.validationMetrics.confidenceScore * 100)}%`,
									backgroundColor: "#3b82f6",
									borderRadius: "4px",
									height: "100%"
								}} />
							</div>
						</div>

						{results.validationMetrics.algorithmicBias.length > 0 && (
							<div>
								<h5 style={{ fontSize: "14px", fontWeight: "600", color: "#dc2626", marginBottom: "12px" }}>
                  Potential Algorithmic Biases
								</h5>
								<div style={{ display: "grid", gap: "8px" }}>
									{results.validationMetrics.algorithmicBias.map((bias, index) => (
										<div
											key={`bias-${String(index)}-${bias.substring(0, 10)}`}
											style={{
												padding: "12px",
												backgroundColor: "#fef2f2",
												border: "1px solid #fca5a5",
												borderRadius: "6px"
											}}
										>
											<div style={{ fontSize: "12px", color: "#7f1d1d", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
												<IconAlertTriangle size={12} />
												{bias}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

interface PaperCardProps {
  paper: WorkReference
  rank: number
}

function PaperCard({ paper, rank }: PaperCardProps) {
	return (
		<div style={{
			padding: "16px",
			border: "1px solid #e5e7eb",
			borderRadius: "8px",
			backgroundColor: "white"
		}}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
				<div style={{ flex: 1 }}>
					<div style={{
						display: "flex",
						alignItems: "center",
						marginBottom: "8px"
					}}>
						<span style={{
							backgroundColor: "#3b82f6",
							color: "white",
							padding: "4px 8px",
							borderRadius: "12px",
							fontSize: "12px",
							fontWeight: "600",
							marginRight: "12px"
						}}>
              #{rank}
						</span>
						<h5 style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937", margin: 0, lineHeight: "1.4" }}>
							{paper.title}
						</h5>
					</div>

					<p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
						{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? ` et al. (${String(paper.authors.length)} authors)` : ""}
					</p>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
						<span style={{ fontSize: "12px", color: "#6b7280" }}>
							{paper.publicationYear} • {paper.source}
						</span>
						{paper.citedByCount !== undefined && (
							<span style={{
								backgroundColor: "#f3f4f6",
								color: "#374151",
								padding: "2px 6px",
								borderRadius: "4px",
								fontSize: "11px",
								fontWeight: "500"
							}}>
								{paper.citedByCount} citations
							</span>
						)}
						{paper.doi && (
							<a
								href={`https://doi.org/${paper.doi}`}
								target="_blank"
								rel="noopener noreferrer"
								style={{
									backgroundColor: "#dbeafe",
									color: "#3b82f6",
									padding: "2px 6px",
									borderRadius: "4px",
									fontSize: "11px",
									fontWeight: "500",
									textDecoration: "none"
								}}
							>
                DOI
							</a>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function getMethodDescription(method: string): string {
	const descriptions: { [key: string]: string } = {
		temporalGapAnalysis: "Find papers published during review period matching search criteria",
		citationNetworkAnalysis: "Discover papers that cite or are cited by included papers",
		authorNetworkAnalysis: "Locate papers by authors who published included papers",
		keywordExpansionAnalysis: "Use semantic similarity to find papers with related terminology"
	}

	return descriptions[method] || "Unknown detection method"
}