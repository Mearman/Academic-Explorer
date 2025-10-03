/**
 * Main layout component - RESTORED with infinite loop safeguards
 * Carefully re-enabled components to prevent React 19 infinite loops
 */

import React, { useState, useCallback, useRef } from "react";
import {
  AppShell,
  Group,
  Text,
  ActionIcon,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconMoon,
  IconSun,
  IconDeviceDesktop,
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconPinned,
  IconPin,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { LeftSidebarDynamic } from "./LeftSidebarDynamic";
import { RightSidebarDynamic } from "./RightSidebarDynamic";
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";
import { useLayoutStore } from "@/stores/layout-store";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Layout store for sidebar state management
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarPinned,
    rightSidebarPinned,
    toggleLeftSidebar,
    toggleRightSidebar,
    pinLeftSidebar,
    pinRightSidebar,
    setActiveGroup,
    getToolGroupsForSidebar,
    getActiveGroup,
  } = useLayoutStore();

  // Helper to activate default groups if none are active
  const activateDefaultGroups = useCallback(() => {
    const leftGroups = getToolGroupsForSidebar("left");
    const rightGroups = getToolGroupsForSidebar("right");
    const leftActiveGroup = getActiveGroup("left");
    const rightActiveGroup = getActiveGroup("right");

    if (!leftActiveGroup && Object.keys(leftGroups).length > 0) {
      setActiveGroup("left", Object.keys(leftGroups)[0]);
    }
    if (!rightActiveGroup && Object.keys(rightGroups).length > 0) {
      setActiveGroup("right", Object.keys(rightGroups)[0]);
    }
  }, [getToolGroupsForSidebar, getActiveGroup, setActiveGroup]);

  // Width state for dragging (using React state for immediate visual feedback)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Static theme colors to avoid hook complexity
  const colors = {
    background: { primary: "#fff", secondary: "#f8f9fa", tertiary: "#e9ecef" },
    text: { primary: "#000", secondary: "#666" },
    border: { primary: "#dee2e6" },
    primary: "#007bff",
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

  // Drag handling for sidebar resizing
  const handleDragStart = useCallback(
    (side: "left" | "right", e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(side);
      dragStartRef.current = {
        x: e.clientX,
        width: side === "left" ? leftSidebarWidth : rightSidebarWidth,
      };
    },
    [leftSidebarWidth, rightSidebarWidth],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const newWidth = Math.max(
        200,
        Math.min(
          600,
          dragStartRef.current.width +
            (isDragging === "left" ? deltaX : -deltaX),
        ),
      );

      if (isDragging === "left") {
        setLeftSidebarWidth(newWidth);
      } else {
        setRightSidebarWidth(newWidth);
      }
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: leftSidebarOpen ? leftSidebarWidth + 60 : 60,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
      aside={{
        width: rightSidebarOpen ? rightSidebarWidth + 60 : 60,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
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
            {/* Sidebar toggle controls */}
            <ActionIcon
              onClick={toggleLeftSidebar}
              variant="subtle"
              size="lg"
              aria-label="Toggle left sidebar"
              color={leftSidebarOpen ? "blue" : "gray"}
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>

            <ActionIcon
              onClick={toggleRightSidebar}
              variant="subtle"
              size="lg"
              aria-label="Toggle right sidebar"
              color={rightSidebarOpen ? "blue" : "gray"}
            >
              <IconLayoutSidebarRight size={18} />
            </ActionIcon>

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

      {/* Left Sidebar */}
      <AppShell.Navbar p={0}>
        <div
          style={{
            display: "flex",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Always visible left ribbon */}
          <LeftRibbon />

          {/* Expandable sidebar content */}
          {leftSidebarOpen && (
            <>
              <div style={{ flex: 1, padding: "0.75rem", overflowY: "auto" }}>
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Left Panel
                  </Text>
                  <Group gap="xs">
                    {/* Debug info */}
                    <Text size="xs" c="red">
                      Active: {getActiveGroup("left") ?? "none"}
                    </Text>
                    {!getActiveGroup("left") && (
                      <ActionIcon
                        onClick={activateDefaultGroups}
                        variant="light"
                        size="sm"
                        color="blue"
                        aria-label="Activate tools"
                      >
                        <IconLayoutSidebar size={14} />
                      </ActionIcon>
                    )}
                    <ActionIcon
                      onClick={() => {
                        pinLeftSidebar(!leftSidebarPinned);
                      }}
                      variant="subtle"
                      size="sm"
                      aria-label={
                        leftSidebarPinned
                          ? "Unpin left sidebar"
                          : "Pin left sidebar"
                      }
                      color={leftSidebarPinned ? "blue" : "gray"}
                    >
                      {leftSidebarPinned ? (
                        <IconPinned size={14} />
                      ) : (
                        <IconPin size={14} />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>
                <LeftSidebarDynamic />
              </div>
              {/* Left drag handle */}
              <div
                role="slider"
                aria-label="Resize left sidebar"
                aria-orientation="vertical"
                aria-valuenow={leftSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                style={{
                  width: "4px",
                  height: "100%",
                  background:
                    isDragging === "left" ? colors.primary : "transparent",
                  cursor: "ew-resize",
                  position: "absolute",
                  right: 0,
                  top: 0,
                  zIndex: 10,
                  borderRight: `1px solid ${colors.border.primary}`,
                }}
                onMouseDown={(e) => {
                  handleDragStart("left", e);
                }}
                onKeyDown={(e) => {
                  // Handle keyboard resize with arrow keys
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setLeftSidebarWidth((prev) => Math.max(200, prev - 20));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setLeftSidebarWidth((prev) => Math.min(600, prev + 20));
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = colors.border.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              />
            </>
          )}
        </div>
      </AppShell.Navbar>

      {/* Right Sidebar */}
      <AppShell.Aside p={0}>
        <div
          style={{
            display: "flex",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Expandable sidebar content */}
          {rightSidebarOpen && (
            <>
              {/* Right drag handle */}
              <div
                role="slider"
                aria-label="Resize right sidebar"
                aria-orientation="vertical"
                aria-valuenow={rightSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                style={{
                  width: "4px",
                  height: "100%",
                  background:
                    isDragging === "right" ? colors.primary : "transparent",
                  cursor: "ew-resize",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  zIndex: 10,
                  borderLeft: `1px solid ${colors.border.primary}`,
                }}
                onMouseDown={(e) => {
                  handleDragStart("right", e);
                }}
                onKeyDown={(e) => {
                  // Handle keyboard resize with arrow keys
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setRightSidebarWidth((prev) => Math.min(600, prev + 20));
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setRightSidebarWidth((prev) => Math.max(200, prev - 20));
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = colors.border.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  overflowY: "auto",
                  marginLeft: "4px",
                }}
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Right Panel
                  </Text>
                  <Group gap="xs">
                    {/* Debug info */}
                    <Text size="xs" c="red">
                      Active: {getActiveGroup("right") ?? "none"}
                    </Text>
                    {!getActiveGroup("right") && (
                      <ActionIcon
                        onClick={activateDefaultGroups}
                        variant="light"
                        size="sm"
                        color="blue"
                        aria-label="Activate tools"
                      >
                        <IconLayoutSidebarRight size={14} />
                      </ActionIcon>
                    )}
                    <ActionIcon
                      onClick={() => {
                        pinRightSidebar(!rightSidebarPinned);
                      }}
                      variant="subtle"
                      size="sm"
                      aria-label={
                        rightSidebarPinned
                          ? "Unpin right sidebar"
                          : "Pin right sidebar"
                      }
                      color={rightSidebarPinned ? "blue" : "gray"}
                    >
                      {rightSidebarPinned ? (
                        <IconPinned size={14} />
                      ) : (
                        <IconPin size={14} />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>
                <RightSidebarDynamic />
              </div>
            </>
          )}

          {/* Always visible right ribbon */}
          <RightRibbon />
        </div>
      </AppShell.Aside>

      {/* Main Content Area */}
      <AppShell.Main>
        <div
          style={{
            height: "calc(100vh - 60px)",
            padding: "1rem",
            overflow: "auto",
          }}
        >
          {children ?? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
                gap: "1rem",
                color: "var(--mantine-color-dimmed)",
              }}
            >
              <h2>Academic Explorer</h2>
              <p>Sidebars restored - Navigate to view content</p>
            </div>
          )}
        </div>
      </AppShell.Main>
    </AppShell>
  );
};
