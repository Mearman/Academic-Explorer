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
import { LeftSidebarDynamic } from "./LeftSidebarDynamic";
import { RightSidebarDynamic } from "./RightSidebarDynamic";
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
	const layoutStore = useLayoutStore();
	const leftSidebarOpen = layoutStore.leftSidebarOpen;
	const rightSidebarOpen = layoutStore.rightSidebarOpen;
	const leftSidebarPinned = layoutStore.leftSidebarPinned;
	const rightSidebarPinned = layoutStore.rightSidebarPinned;
	const leftSidebarAutoHidden = layoutStore.leftSidebarAutoHidden;
	const rightSidebarAutoHidden = layoutStore.rightSidebarAutoHidden;
	const leftSidebarHovered = layoutStore.leftSidebarHovered;
	const rightSidebarHovered = layoutStore.rightSidebarHovered;
	const toggleLeftSidebar = layoutStore.toggleLeftSidebar;
	const toggleRightSidebar = layoutStore.toggleRightSidebar;

	const mantineColorScheme = useMantineColorScheme();
	const colorScheme = mantineColorScheme.colorScheme;
	const setColorScheme = mantineColorScheme.setColorScheme;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

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
		<>
			{/* Skip Links for Accessibility */}
			<div
				style={{
					position: "absolute",
					top: "-40px",
					left: "6px",
					background: colors.background.primary,
					color: colors.text.primary,
					padding: "8px",
					zIndex: 1000,
					textDecoration: "none",
					border: `1px solid ${colors.border.primary}`,
					borderRadius: "4px"
				}}
				onFocus={(e) => {
					e.currentTarget.style.top = "6px";
				}}
				onBlur={(e) => {
					e.currentTarget.style.top = "-40px";
				}}
			>
				<a
					href="#main-navigation"
					style={{
						color: colors.text.primary,
						textDecoration: "none",
						marginRight: "1rem"
					}}
				>
					Skip to navigation
				</a>
				<a
					href="#main-content"
					style={{
						color: colors.text.primary,
						textDecoration: "none",
						marginRight: "1rem"
					}}
				>
					Skip to main content
				</a>
				<a
					href="#left-sidebar"
					style={{
						color: colors.text.primary,
						textDecoration: "none",
						marginRight: "1rem"
					}}
				>
					Skip to tools sidebar
				</a>
			</div>

			<AppShell
				header={{ height: 60 }}
				navbar={{
					width: leftSidebarEffectivelyVisible ? { base: 340, sm: 360, md: 410 } : 60,
					collapsed: { mobile: false }, // Never collapse on mobile since we always show activity bar
					breakpoint: "sm"
				}}
				aside={{
					width: rightSidebarEffectivelyVisible ? { base: 340, sm: 360, md: 410 } : 60,
					collapsed: { mobile: false }, // Never collapse on mobile since we always show activity bar
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
						<nav id="main-navigation" style={{ display: "flex", gap: "1rem", padding: "0 1rem" }}>
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

			{/* Left Sidebar - Activity Bar + Content (VSCode-style) */}
			<AppShell.Navbar id="left-sidebar" style={{ display: "flex", flexDirection: "row", height: "calc(100vh - 60px)", maxHeight: "calc(100vh - 60px)", overflowY: "hidden", overflowX: "hidden" }}>
				{/* Activity Bar (always visible) */}
				<LeftRibbon />
				{/* Sidebar content (when expanded) */}
				{leftSidebarEffectivelyVisible && (
					<div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
						<LeftSidebarDynamic />
					</div>
				)}
			</AppShell.Navbar>

			{/* Main Graph Area */}
			<AppShell.Main
				id="main-content"
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

			{/* Right Sidebar - Content + Activity Bar (VSCode-style) */}
			<AppShell.Aside style={{ display: "flex", flexDirection: "row", height: "calc(100vh - 60px)", maxHeight: "calc(100vh - 60px)", overflowY: "hidden", overflowX: "hidden" }}>
				{/* Sidebar content (when expanded) */}
				{rightSidebarEffectivelyVisible && (
					<div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
						<RightSidebarDynamic />
					</div>
				)}
				{/* Activity Bar (always visible) */}
				<RightRibbon />
			</AppShell.Aside>
		</AppShell>
	</>
	);
};