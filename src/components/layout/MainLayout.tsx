/**
 * Main layout component integrating graph navigation with sidebars
 * Implementation of the decoupled graph navigation plan architecture
 */

import React from "react";
import { AppShell, Group, Text, ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun, IconDeviceDesktop, IconMenu2, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useLayoutStore } from "@/stores/layout-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { GraphNavigation } from "./GraphNavigation";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
	const {
		leftSidebarOpen,
		rightSidebarOpen,
		leftSidebarPinned,
		rightSidebarPinned,
		leftSidebarAutoHidden,
		rightSidebarAutoHidden,
		leftSidebarHovered,
		rightSidebarHovered,
		toggleLeftSidebar,
		toggleRightSidebar,
	} = useLayoutStore();

	const { colorScheme, setColorScheme } = useMantineColorScheme();
	const { colors } = useThemeColors();

	// Calculate effective visibility for each sidebar
	const leftSidebarEffectivelyVisible = leftSidebarOpen && (!leftSidebarAutoHidden || leftSidebarHovered || leftSidebarPinned);
	const rightSidebarEffectivelyVisible = rightSidebarOpen && (!rightSidebarAutoHidden || rightSidebarHovered || rightSidebarPinned);

	// Theme toggle logic
	const getSystemTheme = () => {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	};

	const cycleColorScheme = () => {
		const systemTheme = getSystemTheme();
		const oppositeSystemTheme = systemTheme === "dark" ? "light" : "dark";

		if (colorScheme === "auto") {
			setColorScheme(oppositeSystemTheme);
		} else if (colorScheme === oppositeSystemTheme) {
			setColorScheme(systemTheme);
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

	const getAriaLabel = () => {
		const systemTheme = getSystemTheme();
		const oppositeSystemTheme = systemTheme === "dark" ? "light" : "dark";

		if (colorScheme === "auto") {
			return `Current: Auto (${systemTheme}). Click for ${oppositeSystemTheme} mode`;
		} else if (colorScheme === oppositeSystemTheme) {
			return `Current: ${colorScheme === "light" ? "Light" : "Dark"} mode. Click for ${systemTheme} mode`;
		} else {
			return `Current: ${colorScheme === "light" ? "Light" : "Dark"} mode. Click for auto mode`;
		}
	};

	return (
		<AppShell
			header={{ height: 60 }}
			navbar={{
				width: leftSidebarEffectivelyVisible ? { base: 280, sm: 300, md: 350 } : 60,
				collapsed: { mobile: !leftSidebarEffectivelyVisible },
				breakpoint: "sm"
			}}
			aside={{
				width: rightSidebarEffectivelyVisible ? { base: 280, sm: 300, md: 350 } : 60,
				collapsed: { mobile: !rightSidebarEffectivelyVisible },
				breakpoint: "sm"
			}}
			padding={0}
		>
			{/* Header */}
			<AppShell.Header>
				<Group justify="space-between" h="100%" px="md">
					<Group>
						{/* Left sidebar toggle */}
						<ActionIcon
							onClick={toggleLeftSidebar}
							variant="subtle"
							size="lg"
							aria-label={leftSidebarOpen ? "Hide left sidebar" : "Show left sidebar"}
						>
							{leftSidebarOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
						</ActionIcon>

						<Text size="xl" fw={600} c="blue">
							Academic Explorer
						</Text>
					</Group>

					<Group gap="md">
						<nav style={{ display: "flex", gap: "1rem", padding: "0 1rem" }}>
							<Link
								to="/"
								style={{
									color: colors.text.primary,
									textDecoration: "none",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									fontSize: "14px",
									fontWeight: "500",
									transition: "all 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = colors.background.tertiary;
									e.currentTarget.style.color = colors.primary;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color = colors.text.primary;
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
									transition: "all 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = colors.background.tertiary;
									e.currentTarget.style.color = colors.primary;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color = colors.text.primary;
								}}
							>
								About
							</Link>
							<Link
								to="/evaluation"
								style={{
									color: colors.text.primary,
									textDecoration: "none",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									fontSize: "14px",
									fontWeight: "500",
									transition: "all 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = colors.background.tertiary;
									e.currentTarget.style.color = colors.primary;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = "transparent";
									e.currentTarget.style.color = colors.text.primary;
								}}
							>
								Evaluation
							</Link>
						</nav>

						<ActionIcon
							onClick={cycleColorScheme}
							variant="outline"
							size="lg"
							aria-label={getAriaLabel()}
						>
							{getThemeIcon()}
						</ActionIcon>

						{/* Right sidebar toggle */}
						<ActionIcon
							onClick={toggleRightSidebar}
							variant="subtle"
							size="lg"
							aria-label={rightSidebarOpen ? "Hide right sidebar" : "Show right sidebar"}
						>
							{rightSidebarOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
						</ActionIcon>
					</Group>
				</Group>
			</AppShell.Header>

			{/* Left Sidebar - Search and Filters */}
			<AppShell.Navbar>
				{leftSidebarEffectivelyVisible ? <LeftSidebar /> : <LeftRibbon />}
			</AppShell.Navbar>

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
				{/* Graph fills the entire main area and resizes with sidebars */}
				<GraphNavigation
					style={{
						flex: 1,
						width: "100%",
						height: "100%",
						minHeight: 0 // Important for flex child with overflow
					}}
				/>

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

			{/* Right Sidebar - Entity Details and Preview */}
			<AppShell.Aside style={{ height: "100%" }}>
				{rightSidebarEffectivelyVisible ? <RightSidebar /> : <RightRibbon />}
			</AppShell.Aside>
		</AppShell>
	);
};