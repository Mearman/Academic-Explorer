/**
 * Vanilla Extract styles for sidebar components
 */

import { style } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const sidebarContainer = style({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: vars.space[4], // md
});

export const sidebarHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: vars.space[2], // sm
});

export const sidebarTitle = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space[1], // xs
});

export const searchInput = style({
  marginBottom: vars.space[4], // md
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
  gap: vars.space[4], // md
  padding: vars.space[8], // xl
  textAlign: "center",
});

export const bookmarkCard = style({
  cursor: "pointer",
  transition: "all 0.2s ease",
  ":hover": {
    transform: "translateY(-1px)",
    boxShadow: vars.shadow.sm,
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
    color: vars.color.primary[600],
  },
});

export const historyCard = style({
  cursor: "pointer",
  transition: "all 0.2s ease",
  ":hover": {
    transform: "translateX(2px)",
    backgroundColor: vars.color.background.secondary,
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
    color: vars.color.primary[600],
  },
});

export const actionButton = style({
  transition: "all 0.2s ease",
  ":hover": {
    transform: "scale(1.05)",
  },
});

export const tagBadge = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.normal,
});

export const footerText = style({
  textAlign: "center",
  fontSize: vars.fontSize.xs,
  color: vars.color.gray[500],
  marginTop: vars.space[4], // md
});

export const resizeHandle = style({
  cursor: "ew-resize",
  transition: "background-color 0.2s ease",
  ":hover": {
    backgroundColor: vars.color.gray[200],
  },
});

export const pinnedIndicator = style({
  color: vars.color.primary[600],
});

export const groupHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: vars.space[1], // xs
});

export const groupTitle = style({
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.semibold,
  color: vars.color.gray[500],
});

export const groupDivider = style({
  margin: `${vars.space[3]} 0`, // sm
});

export const navigationButton = style({
  transition: "all 0.2s ease",
  ":hover": {
    backgroundColor: vars.color.background.secondary,
  },
});