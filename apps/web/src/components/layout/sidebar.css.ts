/**
 * Vanilla Extract styles for sidebar components
 */

import { style } from "@vanilla-extract/css";

export const sidebarContainer = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: "1rem",
});

export const sidebarHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
});

export const sidebarTitle = style({
  display: "flex",
  alignItems: "center",
  gap: "0.25rem",
});

export const searchInput = style({
  marginBottom: "1rem",
});

export const scrollableContent = style({
  flex: 1,
  overflow: "auto",
});

export const emptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1rem",
  padding: "2rem",
  textAlign: "center",
});

export const bookmarkCard = style({
  cursor: "pointer",
  transition: "all 0.2s ease",
  ":hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
  },
});

export const bookmarkTitle = style({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: "1.4",
  transition: "color 0.2s ease",
  ":hover": {
    color: "var(--shadcn-primary)",
  },
});

export const historyCard = style({
  cursor: "pointer",
  transition: "all 0.2s ease",
  ":hover": {
    transform: "translateX(2px)",
    backgroundColor: "var(--shadcn-accent)",
  },
});

export const historyEntry = style({
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: "1.4",
  transition: "color 0.2s ease",
  ":hover": {
    color: "var(--shadcn-primary)",
  },
});

export const actionButton = style({
  transition: "all 0.2s ease",
  ":hover": {
    transform: "scale(1.05)",
  },
});

export const tagBadge = style({
  fontSize: "0.75rem",
  fontWeight: "400",
});

export const footerText = style({
  textAlign: "center",
  fontSize: "0.75rem",
  color: "var(--shadcn-muted-foreground)",
  marginTop: "1rem",
});

export const resizeHandle = style({
  cursor: "ew-resize",
  transition: "background-color 0.2s ease",
  ":hover": {
    backgroundColor: "var(--shadcn-border)",
  },
});

export const pinnedIndicator = style({
  color: "var(--shadcn-primary)",
});

export const groupHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.25rem",
});

export const groupTitle = style({
  fontSize: "0.75rem",
  fontWeight: "600",
  color: "var(--shadcn-muted-foreground)",
});

export const groupDivider = style({
  margin: "0.75rem 0",
});

export const navigationButton = style({
  transition: "all 0.2s ease",
  ":hover": {
    backgroundColor: "var(--shadcn-accent)",
  },
});