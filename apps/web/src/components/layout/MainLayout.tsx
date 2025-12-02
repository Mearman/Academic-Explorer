/**
 * Main layout component - RESTORED with infinite loop safeguards
 * Carefully re-enabled components to prevent React 19 infinite loops
 */

import { getBuildInfo, getReleaseUrl } from "@bibgraph/utils";
import {
  AppShell,
  Button,
  Group,
  Text,
  ActionIcon,
  useMantineColorScheme,
  Stack,
  Title,
  Box,
  rem,
  Menu,
  Anchor,
  Badge,
} from "@mantine/core";
import {
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconPinned,
  IconPin,
  IconMenu,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useState, useCallback, useRef } from "react";

import { RepositoryAlgorithmsPanel } from "@/components/algorithms/RepositoryAlgorithmsPanel";
import { useLayoutStore } from "@/stores/layout-store";

import { sprinkles } from "@/styles/sprinkles";

import { BookmarksSidebar } from "./BookmarksSidebar";
import { ColorSchemeSelector } from "./ColorSchemeSelector";
import { HeaderSearchInput } from "./HeaderSearchInput";
import { HistorySidebar } from "./HistorySidebar";
import { LeftRibbon } from "./LeftRibbon";
import { RightRibbon } from "./RightRibbon";
// import { ThemeDropdown } from "./ThemeDropdown";
// import { ThemeSettings } from "@/components/ThemeSettings";

// Static build info - computed once at module load
const buildInfo = getBuildInfo();
const releaseUrl = getReleaseUrl({
  repositoryUrl: buildInfo.repositoryUrl,
  version: buildInfo.version,
});

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Layout store for sidebar state management
  const layoutStore = useLayoutStore();

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

  // Width state for dragging (using React state for immediate visual feedback)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile search state
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

  
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
      header={{ height: { base: 50, sm: 60 } }}
      navbar={{
        width: leftSidebarOpen ? { base: 280, sm: leftSidebarWidth + 60 } : 60,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: !leftSidebarOpen },
      }}
      aside={{
        width: rightSidebarOpen ? { base: 280, sm: rightSidebarWidth + 60 } : 60,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: !rightSidebarOpen },
      }}
      padding={{ base: 0, sm: 'xs', md: 'sm' }}
    >
      {/* Header */}
      <AppShell.Header>
        <Group justify="space-between" h="100%" px={{ base: 'xs', sm: 'md' }}>
          {/* Left side - Title and version (hidden on mobile when search expanded) */}
          <Group flex={mobileSearchExpanded ? 0 : 1} gap="xs">
            {!mobileSearchExpanded && (
              <>
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <Text
                    size="xl"
                    fw={600}
                    c="blue"
                    className={sprinkles({ cursor: 'pointer' })}
                  >
                    BibGraph
                  </Text>
                </Link>
                <Anchor
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Badge
                    variant="light"
                    size="sm"
                    className={sprinkles({ cursor: 'pointer' })}
                  >
                    v{buildInfo.version}
                  </Badge>
                </Anchor>
              </>
            )}
          </Group>

          {/* Center - Desktop search */}
          <Group gap="xs">
            <Box visibleFrom="sm">
              <HeaderSearchInput />
            </Box>
          </Group>

          {/* Right side - Controls */}
          <Group gap="xs">
            {/* Mobile search - expandable input */}
            <Box
              hiddenFrom="sm"
              className={sprinkles({ display: 'flex' })}
              style={{
                alignItems: 'center',
                gap: '0.5rem',
                flex: mobileSearchExpanded ? 1 : 'none'
              }}
            >
              {!mobileSearchExpanded ? (
                <ActionIcon
                  onClick={() => setMobileSearchExpanded(true)}
                  variant="subtle"
                  size="lg"
                  aria-label="Open search"
                >
                  <IconSearch size={18} />
                </ActionIcon>
              ) : (
                <>
                  <Box className={sprinkles({ flex: '1', minWidth: '0' })} style={{}}>
                    <HeaderSearchInput />
                  </Box>
                  <ActionIcon
                    onClick={() => setMobileSearchExpanded(false)}
                    variant="subtle"
                    size="lg"
                    aria-label="Close search"
                    style={{ flexShrink: 0 }}
                  >
                    <IconX size={18} />
                  </ActionIcon>
                </>
              )}
            </Box>

            {/* Sidebar toggle controls - hidden on mobile when search expanded */}
            {!mobileSearchExpanded && (
              <>
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
              </>
            )}

            {/* Desktop navigation - inline buttons */}
            <Group gap={rem(4)} visibleFrom="xl">
              <Button
                component={Link}
                to="/"
                variant="subtle"
                size="xs"
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/about"
                variant="subtle"
                size="xs"
              >
                About
              </Button>
              <Button
                component={Link}
                to="/history"
                variant="subtle"
                size="xs"
              >
                History
              </Button>
              <Button
                component={Link}
                to="/bookmarks"
                variant="subtle"
                size="xs"
              >
                Bookmarks
              </Button>
              <Button
                component={Link}
                to="/catalogue"
                variant="subtle"
                size="xs"
              >
                Catalogue
              </Button>
              <Button
                component={Link}
                to="/settings"
                variant="subtle"
                size="xs"
              >
                Settings
              </Button>
              <Button
                component={Link}
                to="/algorithms"
                variant="subtle"
                size="xs"
              >
                Algorithms
              </Button>
              <Button
                component={Link}
                to="/graph"
                variant="subtle"
                size="xs"
              >
                Graph
              </Button>
            </Group>

            {/* Mobile navigation - dropdown menu (hidden when search expanded) */}
            {!mobileSearchExpanded && (
              <Menu opened={mobileMenuOpen} onChange={setMobileMenuOpen}>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    aria-label="Open navigation menu"
                    hiddenFrom="xl"
                  >
                    <IconMenu size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    component={Link}
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/about"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/history"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    History
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Bookmarks
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/catalogue"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Catalogue
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Settings
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/algorithms"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Algorithms
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    to="/graph"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Graph
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

            {/* Theme dropdown (hidden on mobile when search expanded) */}
            {!mobileSearchExpanded && (
              <ColorSchemeSelector />
            )}
          </Group>
        </Group>
      </AppShell.Header>

      {/* Left Sidebar */}
      <AppShell.Navbar p={0}>
        <div
          className={sprinkles({ display: 'flex', height: 'full', position: 'relative' })}
          style={{ overflow: "hidden" }}
        >
          {/* Always visible left ribbon */}
          <LeftRibbon />

          {/* Expandable sidebar content */}
          {leftSidebarOpen && (
            <>
              <Box
                flex={1}
                p={{ base: 'xs', sm: 'sm' }}
                data-testid="left-sidebar-content"
                className={sprinkles({ flexDirection: 'column', height: 'full' })}
                style={{ overflow: "hidden" }}
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Left Panel
                  </Text>
                  <Group gap="xs">
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

                {/* Upper half: Bookmarks */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    marginBottom: "1rem",
                  }}
                >
                  <BookmarksSidebar />
                </Box>

                {/* Lower half: History */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                  }}
                >
                  <HistorySidebar />
                </Box>
              </Box>
              {/* Left drag handle - desktop only */}
              <Box
                role="slider"
                aria-label="Resize left sidebar"
                aria-orientation="vertical"
                aria-valuenow={leftSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                visibleFrom="md"
                w={rem(4)}
                h="100%"
                bg={isDragging === "left" ? "blue" : "transparent"}
                style={{ position: "absolute", right: 0, top: 0, zIndex: 10 }}
                className={sprinkles({ cursor: 'resize' })}
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
              {/* Right drag handle - desktop only */}
              <Box
                role="slider"
                aria-label="Resize right sidebar"
                aria-orientation="vertical"
                aria-valuenow={rightSidebarWidth}
                aria-valuemin={200}
                aria-valuemax={600}
                tabIndex={0}
                visibleFrom="md"
                w={rem(4)}
                h="100%"
                bg={isDragging === "right" ? "blue" : "transparent"}
                style={{ position: "absolute", left: 0, top: 0, zIndex: 10 }}
                className={sprinkles({ cursor: 'resize' })}
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
                p={{ base: 'xs', sm: 'sm' }}
                style={{ marginLeft: rem(4) }}
                data-testid="right-sidebar-content"
              >
                {/* Pinning controls */}
                <Group justify="space-between" mb="sm" px="xs">
                  <Text size="xs" c="dimmed">
                    Graph Analysis
                  </Text>
                  <Group gap="xs">
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

                {/* Graph Algorithms Panel */}
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                  }}
                >
                  <RepositoryAlgorithmsPanel />
                </Box>
              </Box>
            </>
          )}

          {/* Always visible right ribbon */}
          <RightRibbon />
        </div>
      </AppShell.Aside>

      {/* Main Content Area */}
      <AppShell.Main
        data-testid="main-content"
        className={sprinkles({ flexDirection: 'column', overflow: 'auto' })}
      >
        {children ?? (
          <Stack align="center" justify="center" h="100%" gap="md" c="dimmed">
            <Title order={2}>BibGraph</Title>
            <Text>Sidebars restored - Navigate to view content</Text>
          </Stack>
        )}
      </AppShell.Main>

      </AppShell>
  );
};
