import React from "react";
import { ErrorComponentProps } from "@tanstack/react-router";
import { Container, Alert, Text, Button, Stack, Group } from "@mantine/core";
import { IconAlertTriangle, IconRefresh, IconHome } from "@tabler/icons-react";
import { logger } from "@/lib/logger";

/**
 * Router Error Component
 * Handles TanStack Router errors at the route level
 * This prevents the router from intercepting errors that should go to GlobalErrorBoundary
 */
export const RouterErrorComponent: React.FC<ErrorComponentProps> = ({ error, reset, info }) => {
	// Log the router error
	React.useEffect(() => {
		logger.error("routing", "TanStack Router error", {
			error: error.message,
			stack: error.stack,
			info,
		}, "RouterErrorComponent");
	}, [error, info]);

	// For context/hook errors and React Flow errors, throw to let GlobalErrorBoundary handle them
	if (error.message.includes("must be used within") ||
		error.message.includes("Context") ||
		error.message.includes("Provider") ||
		error.message.includes("zustand provider") ||
		error.message.includes("React Flow") ||
		error.message.includes("ReactFlow")) {
		// Re-throw to bubble up to GlobalErrorBoundary
		throw error;
	}

	// Handle routing-specific errors here
	return (
		<Container size="md" py="xl">
			<Stack gap="md">
				<Alert
					icon={<IconAlertTriangle size={20} />}
					title="Navigation Error"
					color="orange"
					variant="light"
				>
					<Text size="sm">
						There was an error loading this page or route.
					</Text>
				</Alert>

				<Text c="dimmed" size="sm">
					{error.message}
				</Text>

				<Group>
					<Button
						leftSection={<IconRefresh size={16} />}
						onClick={reset}
						variant="filled"
					>
						Try Again
					</Button>
					<Button
						leftSection={<IconHome size={16} />}
						component="a"
						href="#/"
						variant="light"
					>
						Go Home
					</Button>
				</Group>
			</Stack>
		</Container>
	);
};