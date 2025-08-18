import { style, globalStyle } from '@vanilla-extract/css';

import { entityVars } from '@/components/design-tokens.css';

export const container = style({
  position: 'relative',
  width: '100%',
  height: '400px',
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.md,
  backgroundColor: entityVars.color.background,
  overflow: 'hidden',
});

export const fullscreenContainer = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  backgroundColor: entityVars.color.background,
  height: '100vh',
});

export const svg = style({
  width: '100%',
  height: '100%',
  cursor: 'grab',
  selectors: {
    '&:active': {
      cursor: 'grabbing',
    },
  },
});

export const vertex = style({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },
});

export const vertexDirectlyVisited = style({
  stroke: entityVars.color.work,
  strokeWidth: '3px',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
});

export const vertexDiscovered = style({
  stroke: entityVars.color.border,
  strokeWidth: '1px',
  opacity: 0.8,
});

export const vertexSelected = style({
  stroke: entityVars.color.work,
  strokeWidth: '4px',
  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
});

export const vertexHovered = style({
  stroke: entityVars.color.success,
  strokeWidth: '3px',
  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))',
});

export const edge = style({
  stroke: entityVars.color.border,
  strokeWidth: '1px',
  opacity: 0.6,
  transition: 'all 0.2s ease',
});

export const edgeHighlighted = style({
  stroke: entityVars.color.work,
  strokeWidth: '2px',
  opacity: 0.8,
});

export const vertexLabel = style({
  fontSize: '11px',
  fontWeight: '500',
  fill: entityVars.color.text,
  textAnchor: 'middle',
  pointerEvents: 'none',
  userSelect: 'none',
});

export const visitCount = style({
  fontSize: '9px',
  fill: entityVars.color.muted,
  textAnchor: 'middle',
  pointerEvents: 'none',
});

export const controls = style({
  position: 'absolute',
  top: entityVars.spacing.sm,
  right: entityVars.spacing.sm,
  display: 'flex',
  gap: entityVars.spacing.xs,
  zIndex: 10,
});

export const controlButton = style({
  padding: entityVars.spacing.xs,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      backgroundColor: entityVars.color.cardBackground,
      borderColor: entityVars.color.borderHover,
    },
  },
});

export const infoPanel = style({
  position: 'absolute',
  bottom: entityVars.spacing.sm,
  left: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  fontSize: '12px',
  maxWidth: '300px',
});

export const filterPanel = style({
  position: 'absolute',
  top: entityVars.spacing.sm,
  left: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  fontSize: '12px',
  minWidth: '200px',
});

export const legend = style({
  position: 'absolute',
  bottom: entityVars.spacing.sm,
  right: entityVars.spacing.sm,
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  fontSize: '11px',
});

export const legendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
  marginBottom: entityVars.spacing.xs,
});

export const legendColor = style({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  border: `1px solid ${entityVars.color.border}`,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: entityVars.color.muted,
  fontSize: '14px',
});

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: entityVars.color.muted,
});

// Entity type specific colors
export const entityColors = {
  work: entityVars.color.work,
  author: entityVars.color.author,
  institution: entityVars.color.institution,
  source: entityVars.color.source,
  publisher: entityVars.color.publisher,
  funder: entityVars.color.funder,
  topic: entityVars.color.topic,
  concept: entityVars.color.concept,
  keyword: entityVars.color.keyword,
  continent: entityVars.color.continent,
  region: entityVars.color.region,
};

// Zoom control styles
export const zoomControls = style({
  position: 'absolute',
  bottom: entityVars.spacing.sm,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: entityVars.spacing.xs,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  padding: entityVars.spacing.xs,
});

export const zoomButton = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  borderRadius: entityVars.spacing.xs,
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      backgroundColor: entityVars.color.cardBackground,
    },
  },
});

// Tooltip styles
export const tooltip = style({
  position: 'absolute',
  padding: entityVars.spacing.sm,
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.sm,
  fontSize: '12px',
  maxWidth: '250px',
  zIndex: 100,
  pointerEvents: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
});

export const tooltipTitle = style({
  fontWeight: '600',
  marginBottom: entityVars.spacing.xs,
  color: entityVars.color.text,
});

export const tooltipDetail = style({
  color: entityVars.color.muted,
  marginBottom: '2px',
});

// Animation styles
globalStyle(`${vertex} circle`, {
  transition: 'r 0.3s ease, fill 0.3s ease',
});

globalStyle(`${edge}`, {
  transition: 'stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease',
});

// Force layout specific styles
export const forceContainer = style({
  position: 'relative',
  width: '100%',
  height: '100%',
});

// Minimap styles
export const minimap = style({
  position: 'absolute',
  top: entityVars.spacing.sm,
  left: entityVars.spacing.sm,
  width: '120px',
  height: '80px',
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.xs,
  backgroundColor: entityVars.color.background,
  opacity: 0.8,
});

export const minimapViewport = style({
  fill: 'transparent',
  stroke: entityVars.color.work,
  strokeWidth: '1px',
});

// New styles for enhanced features

// Active control button state
export const controlButtonActive = style({
  backgroundColor: entityVars.color.work,
  borderColor: entityVars.color.work,
  color: entityVars.color.background,
});

// Export group styling
export const exportGroup = style({
  display: 'flex',
  gap: entityVars.spacing.xs,
  borderLeft: `1px solid ${entityVars.color.border}`,
  paddingLeft: entityVars.spacing.xs,
  marginLeft: entityVars.spacing.xs,
});

// Zoom level display
export const zoomLevel = style({
  padding: `${entityVars.spacing.xs} ${entityVars.spacing.sm}`,
  fontSize: '11px',
  color: entityVars.color.muted,
  display: 'flex',
  alignItems: 'center',
  minWidth: '40px',
  justifyContent: 'center',
  backgroundColor: entityVars.color.cardBackground,
  borderRadius: entityVars.spacing.xs,
});

// Search overlay styles
export const searchOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: entityVars.spacing.lg,
  paddingTop: '10vh',
});

export const searchContainer = style({
  backgroundColor: entityVars.color.background,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.md,
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '70vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const searchInputContainer = style({
  display: 'flex',
  alignItems: 'center',
  padding: entityVars.spacing.md,
  borderBottom: `1px solid ${entityVars.color.border}`,
  gap: entityVars.spacing.sm,
});

export const searchIcon = style({
  color: entityVars.color.muted,
  flexShrink: 0,
});

export const searchInput = style({
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: '16px',
  backgroundColor: 'transparent',
  color: entityVars.color.text,
  '::placeholder': {
    color: entityVars.color.muted,
  },
});

export const searchCloseButton = style({
  padding: entityVars.spacing.xs,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  borderRadius: entityVars.spacing.xs,
  color: entityVars.color.muted,
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      backgroundColor: entityVars.color.cardBackground,
      color: entityVars.color.text,
    },
  },
});

export const searchResults = style({
  flex: 1,
  overflow: 'auto',
  maxHeight: '50vh',
});

export const searchResultsHeader = style({
  padding: entityVars.spacing.sm,
  paddingBottom: entityVars.spacing.xs,
  fontSize: '12px',
  color: entityVars.color.muted,
  borderBottom: `1px solid ${entityVars.color.border}`,
});

export const searchResult = style({
  padding: entityVars.spacing.sm,
  cursor: 'pointer',
  borderBottom: `1px solid ${entityVars.color.border}`,
  transition: 'all 0.2s ease',
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
    '&:hover': {
      backgroundColor: entityVars.color.cardBackground,
    },
  },
});

export const searchResultSelected = style({
  backgroundColor: entityVars.color.cardBackground,
});

export const searchResultActive = style({
  backgroundColor: entityVars.color.work,
  color: entityVars.color.background,
});

export const searchResultHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: entityVars.spacing.xs,
});

export const searchResultInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: entityVars.spacing.xs,
});

export const searchResultIcon = style({
  color: entityVars.color.muted,
  flexShrink: 0,
});

export const searchResultName = style({
  fontWeight: '500',
  fontSize: '14px',
});

export const searchResultType = style({
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const searchResultMeta = style({
  display: 'flex',
  gap: entityVars.spacing.xs,
  flexWrap: 'wrap',
});

export const searchResultBadge = style({
  fontSize: '11px',
  padding: `2px ${entityVars.spacing.xs}`,
  backgroundColor: entityVars.color.cardBackground,
  border: `1px solid ${entityVars.color.border}`,
  borderRadius: entityVars.spacing.xs,
  color: entityVars.color.muted,
});

export const searchNoResults = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: entityVars.spacing.xl,
  color: entityVars.color.muted,
  textAlign: 'center',
});

export const searchHint = style({
  fontSize: '12px',
  color: entityVars.color.muted,
  marginTop: entityVars.spacing.xs,
});

// Screen reader only styles
globalStyle('.sr-only', {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});