/**
 * Enhanced Breadcrumb Navigation
 * Provides contextual navigation with keyboard support and accessibility
 */

import { EntityDetectionService } from "@bibgraph/utils";
import {
  Breadcrumbs,
  Anchor,
  Group,
  Text,
  Badge,
  Tooltip,
  ActionIcon,
  Box,
} from "@mantine/core";
import {
  IconHome,
  IconSearch,
  IconChevronRight,
  IconShare,
  IconCopy,
} from "@tabler/icons-react";
import { useLocation, Link } from "@tanstack/react-router";
import React, { useMemo, useCallback } from "react";
import { notifications } from "@mantine/notifications";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  tooltip?: string;
}

export const BreadcrumbNavigation = () => {
  const location = useLocation();

  // Build breadcrumb items based on current route
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];
    const parts = location.pathname.replace(/^\//, "").split("/");

    // Always start with Home
    items.push({
      label: "Home",
      href: "/",
      icon: <IconHome size={14} />,
      tooltip: "Return to search homepage",
    });

    if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
      return items;
    }

    // Build navigation hierarchy
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      currentPath += `/${part}`;

      // Handle entity pages
      if (i === 0 && ["works", "authors", "institutions", "concepts", "sources", "venues"].includes(part)) {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1),
          href: `/${part}`,
          icon: <IconSearch size={14} />,
          tooltip: `Search ${part}`,
        });

        // If there's an entity ID in the next part, add entity breadcrumb
        if (parts[i + 1]) {
          const entityId = decodeURIComponent(parts[i + 1]);
          const detection = EntityDetectionService.detectEntity(entityId);

          if (detection?.entityType) {
            items.push({
              label: entityId,
              href: currentPath,
              badge: detection.entityType.charAt(0).toUpperCase(),
              tooltip: `${detection.entityType}: ${detection.normalizedId}`,
            });
            i++; // Skip the next part since we processed it as entity ID
            continue;
          }
        }
      }
      // Handle special pages
      else if (["about", "settings", "bookmarks", "catalogue"].includes(part)) {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1),
          href: currentPath,
          tooltip: `Navigate to ${part}`,
        });
      }
      // Handle algorithm/graph pages
      else if (part === "graph" || part === "algorithms") {
        items.push({
          label: part.charAt(0).toUpperCase() + part.slice(1),
          href: currentPath,
          icon: part === "graph" ? undefined : <IconSearch size={14} />,
          tooltip: `View ${part}`,
        });
      }
    }

    return items;
  }, [location.pathname]);

  // Copy current URL to clipboard
  const handleCopyUrl = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      notifications.show({
        title: "URL Copied",
        message: "Current page URL copied to clipboard",
        color: "green",
        autoClose: 3000,
      });
    }).catch(() => {
      notifications.show({
        title: "Copy Failed",
        message: "Failed to copy URL to clipboard",
        color: "red",
        autoClose: 3000,
      });
    });
  }, []);

  // Share current page
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(() => {
        handleCopyUrl();
      });
    } else {
      handleCopyUrl();
    }
  }, [handleCopyUrl]);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs on home page
  }

  return (
    <Box py="xs" px="md">
      <Group justify="space-between" align="center">
        <Breadcrumbs
          separator={<IconChevronRight size={12} color="var(--mantine-color-gray-5)" />}
          styles={{
            root: {
              flex: 1,
            },
            breadcrumb: {
              '&:hover': {
                backgroundColor: 'var(--mantine-color-gray-0)',
              },
            },
          }}
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            return (
              <Anchor
                key={index}
                component={isLast ? undefined : Link}
                to={item.href}
                size="sm"
                fw={isLast ? 600 : 400}
                c={isLast ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-7)"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: isLast ? "default" : "pointer",
                  textDecoration: "none",
                }}
                title={item.tooltip}
              >
                {item.icon}
                <Text span>{item.label}</Text>
                {item.badge && (
                  <Badge
                    size="xs"
                    variant="light"
                    color="blue"
                    radius="sm"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Anchor>
            );
          })}
        </Breadcrumbs>

        <Group gap="xs">
          <Tooltip label="Copy URL" withinPortal>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleCopyUrl}
              aria-label="Copy current page URL"
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Share page" withinPortal>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleShare}
              aria-label="Share current page"
            >
              <IconShare size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );
};