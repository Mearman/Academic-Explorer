import React, { Component, ErrorInfo, ReactNode } from "react";
import {
	Container,
	Stack,
	Title,
	Text,
	Button,
	Card,
	Group,
	Alert,
	Code,
	ScrollArea,
	Divider,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import {
	IconAlertTriangle,
	IconRefresh,
	IconCopy,
	IconCheck,
	IconBug,
	IconExternalLink,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { logger, logError } from "@/lib/logger";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
	errorId: string | null;
	debugInfo: DebugInfo | null;
	copied: boolean;
}

interface DebugInfo {
	timestamp: string;
	userAgent: string;
	url: string;
	buildInfo?: unknown;
	errorStack?: string;
	componentStack?: string;
	errorBoundary: string;
	additionalContext: {
		reactVersion: string;
		nodeEnv: string;
		isDev: boolean;
	};
}

export class GlobalErrorBoundary extends Component<Props, State> {
	private copyTimeout: NodeJS.Timeout | null = null;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: null,
			debugInfo: null,
			copied: false,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		const errorId = Math.random().toString(36).substring(7);

		// Generate comprehensive debug info
		const debugInfo: DebugInfo = {
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			url: window.location.href,
			errorStack: error.stack,
			componentStack: errorInfo.componentStack,
			errorBoundary: "GlobalErrorBoundary",
			additionalContext: {
				reactVersion: React.version,
				nodeEnv: import.meta.env.MODE,
				isDev: import.meta.env.DEV,
			},
		};

		// Try to get build info if available
		try {
			import("@/lib/build-info").then((buildModule) => {
				debugInfo.buildInfo = buildModule.getBuildInfo?.();
			}).catch(() => {
				// Build info not available
			});
		} catch {
			// Build info not available
		}

		// Log error using application logger
		logError("React Error Boundary caught an error", error, "GlobalErrorBoundary");

		// Log additional context
		logger.error("ui", "Component stack trace", {
			componentStack: errorInfo.componentStack,
			errorId,
		}, "GlobalErrorBoundary");

		this.setState({
			errorInfo,
			errorId,
			debugInfo,
		});
	}

	private handleReload = (): void => {
		window.location.reload();
	};

	private handleReset = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			errorId: null,
			debugInfo: null,
			copied: false,
		});
	};

	private generateDebugData = (): string => {
		const { error, errorInfo, errorId, debugInfo } = this.state;

		const debugData = {
			errorId,
			timestamp: debugInfo?.timestamp,
			error: {
				name: error?.name,
				message: error?.message,
				stack: error?.stack,
			},
			errorInfo: {
				componentStack: errorInfo?.componentStack,
			},
			environment: debugInfo?.additionalContext,
			browser: {
				userAgent: debugInfo?.userAgent,
				url: debugInfo?.url,
			},
			buildInfo: debugInfo?.buildInfo,
		};

		return JSON.stringify(debugData, null, 2);
	};

	private handleCopyDebugData = async (): Promise<void> => {
		try {
			const debugData = this.generateDebugData();
			await navigator.clipboard.writeText(debugData);

			this.setState({ copied: true });

			notifications.show({
				title: "Debug data copied",
				message: "Error information has been copied to your clipboard",
				color: "green",
				icon: <IconCheck size={16} />,
			});

			// Reset copied state after 2 seconds
			if (this.copyTimeout) {
				clearTimeout(this.copyTimeout);
			}
			this.copyTimeout = setTimeout(() => {
				this.setState({ copied: false });
			}, 2000);
		} catch (clipboardError) {
			logger.error("ui", "Failed to copy debug data to clipboard", {
				clipboardError
			}, "GlobalErrorBoundary");

			notifications.show({
				title: "Copy failed",
				message: "Could not copy to clipboard. Please copy manually from the debug section below.",
				color: "red",
				icon: <IconAlertTriangle size={16} />,
			});
		}
	};

	componentWillUnmount(): void {
		if (this.copyTimeout) {
			clearTimeout(this.copyTimeout);
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const { error, errorId, copied } = this.state;

			return (
				<Container size="md" py="xl">
					<Stack gap="lg">
						{/* Header */}
						<Alert
							icon={<IconAlertTriangle size={24} />}
							title="Application Error"
							color="red"
							variant="light"
						>
							<Text size="sm">
								Something went wrong and the application encountered an unexpected error.
								This error has been logged for investigation.
							</Text>
						</Alert>

						{/* Error Details Card */}
						<Card withBorder shadow="sm">
							<Stack gap="md">
								<Group justify="space-between" align="flex-start">
									<div>
										<Title order={3} c="red">
											{error?.name || "Unknown Error"}
										</Title>
										<Text size="sm" c="dimmed" mt={4}>
											Error ID: {errorId}
										</Text>
									</div>
									<Group gap="xs">
										<Tooltip label={copied ? "Copied!" : "Copy debug data"}>
											<ActionIcon
												variant="light"
												color={copied ? "green" : "blue"}
												onClick={this.handleCopyDebugData}
												size="lg"
											>
												{copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
											</ActionIcon>
										</Tooltip>
									</Group>
								</Group>

								<Text c="red.7" fw={500}>
									{error?.message || "An unexpected error occurred"}
								</Text>

								{/* Action Buttons */}
								<Group>
									<Button
										leftSection={<IconRefresh size={16} />}
										onClick={this.handleReload}
										variant="filled"
									>
										Reload Page
									</Button>
									<Button
										leftSection={<IconBug size={16} />}
										onClick={this.handleReset}
										variant="light"
									>
										Try Again
									</Button>
									<Button
										leftSection={<IconExternalLink size={16} />}
										component="a"
										href="https://github.com/JosephMearman/Academic-Explorer/issues"
										target="_blank"
										variant="outline"
									>
										Report Issue
									</Button>
								</Group>
							</Stack>
						</Card>

						{/* Debug Information (Development) */}
						{import.meta.env.DEV && (
							<Card withBorder shadow="sm">
								<Stack gap="md">
									<Group align="center">
										<IconBug size={20} />
										<Title order={4}>Debug Information</Title>
									</Group>

									<Text size="sm" c="dimmed">
										This debug information is only shown in development mode.
										Click the copy button above to copy all debug data to clipboard.
									</Text>

									<Divider />

									{error?.stack && (
										<div>
											<Text fw={500} size="sm" mb="xs">
												Error Stack:
											</Text>
											<ScrollArea.Autosize maxHeight={200}>
												<Code block color="red">
													{error.stack}
												</Code>
											</ScrollArea.Autosize>
										</div>
									)}

									{this.state.errorInfo?.componentStack && (
										<div>
											<Text fw={500} size="sm" mb="xs">
												Component Stack:
											</Text>
											<ScrollArea.Autosize maxHeight={150}>
												<Code block color="orange">
													{this.state.errorInfo.componentStack}
												</Code>
											</ScrollArea.Autosize>
										</div>
									)}

									<details>
										<summary style={{ cursor: "pointer", fontWeight: 500 }}>
											<Text size="sm" component="span">
												Full Debug Data (JSON)
											</Text>
										</summary>
										<ScrollArea.Autosize maxHeight={300} mt="xs">
											<Code block>
												{this.generateDebugData()}
											</Code>
										</ScrollArea.Autosize>
									</details>
								</Stack>
							</Card>
						)}

						{/* User Guidance */}
						<Alert icon={<IconBug size={16} />} title="What you can do:" variant="light">
							<Stack gap="xs">
								<Text size="sm">
									• <strong>Reload the page</strong> - This often resolves temporary issues
								</Text>
								<Text size="sm">
									• <strong>Try again</strong> - Reset the error state and continue using the app
								</Text>
								<Text size="sm">
									• <strong>Report the issue</strong> - Help us improve by reporting this error on GitHub
								</Text>
								{import.meta.env.DEV && (
									<Text size="sm">
									• <strong>Copy debug data</strong> - Share technical details when reporting issues
								</Text>
								)}
							</Stack>
						</Alert>
					</Stack>
				</Container>
			);
		}

		return this.props.children;
	}
}