/**
 * Data Fetching Progress Component
 * Shows progress indicators for background data fetching operations
 */

import React from "react";
import { Progress, Text, Badge, Card, Group, Stack } from "@mantine/core";
import { IconCloudDownload, IconCheck, IconX, IconLoader } from "@tabler/icons-react";

interface DataFetchingProgressItem {
  nodeId: string;
  entityName?: string;
  entityType?: string;
  progress: {
    completed: number;
    total: number;
    stage: string;
  };
  status: "active" | "completed" | "error";
  error?: string;
}

interface DataFetchingProgressProps {
  activeRequests: DataFetchingProgressItem[];
  workerReady: boolean;
}

export const DataFetchingProgress: React.FC<DataFetchingProgressProps> = ({
	activeRequests,
	workerReady
}) => {
	if (activeRequests.length === 0) {
		return null;
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return <IconLoader size={14} className="animate-spin" />;
			case "completed":
				return <IconCheck size={14} />;
			case "error":
				return <IconX size={14} />;
			default:
				return <IconCloudDownload size={14} />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "blue";
			case "completed":
				return "green";
			case "error":
				return "red";
			default:
				return "gray";
		}
	};

	return (
		<Card
			shadow="sm"
			padding="sm"
			radius="md"
			withBorder
			style={{
				position: "fixed",
				top: 20,
				right: 20,
				width: 320,
				maxHeight: 400,
				overflow: "auto",
				zIndex: 1000,
				backgroundColor: "rgba(255, 255, 255, 0.95)",
				backdropFilter: "blur(8px)"
			}}
		>
			<Stack gap="xs">
				<Group justify="space-between" align="center">
					<Group gap="xs">
						<IconCloudDownload size={16} />
						<Text size="sm" fw={500}>
              Fetching Data
						</Text>
					</Group>
					<Badge
						color={workerReady ? "green" : "gray"}
						size="xs"
						variant="filled"
					>
						{workerReady ? "Worker Ready" : "Worker Loading"}
					</Badge>
				</Group>

				{activeRequests.map((request) => (
					<Card key={request.nodeId} withBorder padding="xs">
						<Stack gap="xs">
							<Group justify="space-between" align="center">
								<Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
									{getStatusIcon(request.status)}
									<div style={{ flex: 1, minWidth: 0 }}>
										<Text
											size="xs"
											fw={500}
											truncate
											title={request.entityName || request.nodeId}
										>
											{request.entityName || `Node ${request.nodeId.slice(0, 8)}...`}
										</Text>
										{request.entityType && (
											<Badge size="xs" variant="light" color="gray">
												{request.entityType}
											</Badge>
										)}
									</div>
								</Group>
								<Badge
									size="xs"
									color={getStatusColor(request.status)}
									variant="light"
								>
									{request.status}
								</Badge>
							</Group>

							{request.status === "active" && (
								<>
									<Progress
										value={(request.progress.completed / request.progress.total) * 100}
										size="xs"
										color="blue"
										animated
									/>
									<Group justify="space-between">
										<Text size="xs" c="dimmed">
											{request.progress.stage}
										</Text>
										<Text size="xs" c="dimmed">
											{request.progress.completed}/{request.progress.total}
										</Text>
									</Group>
								</>
							)}

							{request.status === "error" && request.error && (
								<Text size="xs" c="red" title={request.error} truncate>
									{request.error}
								</Text>
							)}
						</Stack>
					</Card>
				))}
			</Stack>
		</Card>
	);
};