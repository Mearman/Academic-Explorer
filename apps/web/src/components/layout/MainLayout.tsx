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
  Button,
  useMantineColorScheme,
  Stack,
  Title,
  Box,
  rem,
  TextInput,
  Card,
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
import { BookmarksSidebar } from "./BookmarksSidebar";
import { HistorySidebar } from "./HistorySidebar";
import { SidebarFallback } from "./SidebarFallback";
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";
import { HeaderSearchInput } from "./HeaderSearchInput";
import { useLayoutStore, useLayoutActions } from "@/stores/layout-store";

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Layout store for sidebar state management
  const layoutStore = useLayoutStore();
  const layoutActions = useLayoutActions();
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarPinned,
    rightSidebarPinned,
    toggleLeftSidebar,
    toggleRightSidebar,
    pinLeftSidebar,
    pinRightSidebar,
  } = layoutStore;

  // Helper to activate default groups if none are active
  // Don't use useCallback to avoid React Hook dependency issues with context methods
  const activateDefaultGroups = () => {
    const leftGroups = layoutActions.getToolGroupsForSidebar("left");
    const rightGroups = layoutActions.getToolGroupsForSidebar("right");
    const leftActiveGroup = layoutActions.getActiveGroup("left");
    const rightActiveGroup = layoutActions.getActiveGroup("right");

    if (!leftActiveGroup && Object.keys(leftGroups).length > 0) {
      layoutActions.setActiveGroup({ sidebar: "left", groupId: Object.keys(leftGroups)[0] });
    }
    if (!rightActiveGroup && Object.keys(rightGroups).length > 0) {
      layoutActions.setActiveGroup({
        sidebar: "right",
        groupId: Object.keys(rightGroups)[0],
      });
    }
  };

  // Width state for dragging (using React state for immediate visual feedback)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  
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
    ({ side, e }: { side: "left" | "right"; e: React.MouseEvent }) => {
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
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Text size="xl" fw={600} c="blue" style={{ cursor: 'pointer' }}>
                Academic Explorer
              </Text>
            </Link>
          </Group>

          <Group gap="md">
            <HeaderSearchInput />
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

            <Group>
              <Button
                component={Link}
                to="/"
                variant="subtle"
                size="sm"
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/about"
                variant="subtle"
                size="sm"
              >
                About
              </Button>
              <Button
                component={Link}
                to="/history"
                variant="subtle"
                size="sm"
              >
                History
              </Button>
              <Button
                component={Link}
                to="/bookmarks"
                variant="subtle"
                size="sm"
              >
                Bookmarks
              </Button>
              <Button
                component={Link}
                to="/catalogue"
                variant="subtle"
                size="sm"
              >
                Catalogue
              </Button>
            </Group>

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
            overflow: "hidden",
          }}
        >
          {/* Always visible left ribbon */}
          <LeftRibbon />

          {/* Expandable sidebar content */}
          {leftSidebarOpen && (
            <>
              <Box
                flex={1}
                p="sm"
                data-testid="left-sidebar-content"
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Left Panel
                  </Text>
                  <Group gap="xs">
                    {/* Debug info */}
                    <Text size="xs" c="red">
                      Active: {layoutActions.getActiveGroup("left") ?? "none"}
                    </Text>
                    {!layoutActions.getActiveGroup("left") && (
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
                {/* Bookmarks sidebar component */}
                <BookmarksSidebar />
              </Box>
              {/* Left drag handle */}
              <Box
                role="slider"
                aria-label="Resize left sidebar"
                aria-orientation="vertical"
                aria-valuenow={leftSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                w={rem(4)}
                h="100%"
                bg={isDragging === "left" ? "blue" : "transparent"}
                style={{ cursor: "ew-resize", position: "absolute", right: 0, top: 0, zIndex: 10 }}
                bd={`1px solid var(--mantine-color-gray-3)`}
                onMouseDown={(e) => {
                  handleDragStart({ side: "left", e });
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
                    e.currentTarget.style.background = "var(--mantine-color-gray-3)";
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
            overflow: "hidden",
          }}
        >
          {/* Expandable sidebar content */}
          {rightSidebarOpen && (
            <>
              {/* Right drag handle */}
              <Box
                role="slider"
                aria-label="Resize right sidebar"
                aria-orientation="vertical"
                aria-valuenow={rightSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                w={rem(4)}
                h="100%"
                bg={isDragging === "right" ? "blue" : "transparent"}
                style={{ cursor: "ew-resize", position: "absolute", left: 0, top: 0, zIndex: 10 }}
                bd={`1px solid var(--mantine-color-gray-3)`}
                onMouseDown={(e) => {
                  handleDragStart({ side: "right", e });
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
                    e.currentTarget.style.background = "var(--mantine-color-gray-3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragging) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              />
              <Box
                flex={1}
                p="sm"
                style={{ marginLeft: rem(4) }}
                data-testid="right-sidebar-content"
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Right Panel
                  </Text>
                  <Group gap="xs">
                    {/* Debug info */}
                    <Text size="xs" c="red">
                      Active: {layoutActions.getActiveGroup("right") ?? "none"}
                    </Text>
                    {!layoutActions.getActiveGroup("right") && (
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
                <HistorySidebar />
              </Box>
            </>
          )}

          {/* Always visible right ribbon */}
          <RightRibbon />
        </div>
      </AppShell.Aside>

      {/* Main Content Area */}
      <AppShell.Main
        p="md"
        data-testid="main-content"
        styles={{
          main: {
            paddingTop: "var(--mantine-spacing-md)",
            paddingBottom: "var(--mantine-spacing-md)",
            overflow: "visible",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {children ?? (
          <Stack align="center" justify="center" h="100%" gap="md" c="dimmed">
            <Title order={2}>Academic Explorer</Title>
            <Text>Sidebars restored - Navigate to view content</Text>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
};
