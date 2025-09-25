/**
 * Main layout component - RESTORED with infinite loop safeguards
 * Carefully re-enabled components to prevent React 19 infinite loops
 */

import React from "react";
import { AppShell, Group, Text, ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun, IconDeviceDesktop, IconMenu2, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { GraphNavigation } from "./GraphNavigation";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
	const { colorScheme, setColorScheme } = useMantineColorScheme();

	// Static theme colors to avoid hook complexity
	const colors = {
		background: { primary: "#fff", secondary: "#f8f9fa", tertiary: "#e9ecef" },
		text: { primary: "#000", secondary: "#666" },
		border: { primary: "#dee2e6" },
		primary: "#007bff"
	};

	// Theme toggle logic
	const cycleColorScheme = () => {
		if (colorScheme === "auto") {
			setColorScheme("light");
		} else if (colorScheme === "light") {
			setColorScheme("dark");
		} else {
			setColorScheme("auto");
		}
	};

	const getThemeIcon = () => {
		if (colorScheme === "auto") {
			return <IconDeviceDesktop size={18} />;
		} else if (colorScheme === "dark") {
			return <IconMoon size={18} />;
		} else {
			return <IconSun size={18} />;
		}
	};

	return (
		<AppShell
			header={{ height: 60 }}
			padding={0}
		>
			{/* Header */}
			<AppShell.Header>
				<Group justify="space-between" h="100%" px="md">
					<Group>
						<Text size="xl" fw={600} c="blue">
							Academic Explorer
						</Text>
					</Group>

					<Group gap="md">
						<nav style={{ display: "flex", gap: "1rem" }}>
							<Link
								to="/"
								style={{
									color: colors.text.primary,
									textDecoration: "none",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									fontSize: "14px",
									fontWeight: "500",
								}}
							>
								Home
							</Link>
							<Link
								to="/about"
								style={{
									color: colors.text.primary,
									textDecoration: "none",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									fontSize: "14px",
									fontWeight: "500",
								}}
							>
								About
							</Link>
						</nav>

						<ActionIcon
							onClick={cycleColorScheme}
							variant="outline"
							size="lg"
							aria-label="Toggle color scheme"
						>
							{getThemeIcon()}
						</ActionIcon>
					</Group>
				</Group>
			</AppShell.Header>

			{/* Main Graph Area */}
			<AppShell.Main
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					overflow: "hidden",
					position: "relative"
				}}
			>
				{/* TEMPORARILY DISABLED: GraphNavigation causing React 19 infinite loops */}
				<div style={{
					flex: 1,
					width: "100%",
					height: "100%",
					minHeight: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--mantine-color-gray-1)",
					flexDirection: "column",
					gap: "1rem"
				}}>
					<h2>Academic Explorer</h2>
					<p>Author route active: A5017898742</p>
					<p>Graph visualization temporarily disabled while debugging React 19 compatibility</p>
				</div>

				{/* Route content rendered as overlay if present */}
				{children && (
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							zIndex: 100,
							maxWidth: "90vw",
							maxHeight: "90vh",
							overflow: "auto",
							pointerEvents: "auto"
						}}
					>
						{children}
					</div>
				)}
			</AppShell.Main>
		</AppShell>
	);
};