/**
 * Shadcn-style CSS Overrides
 * Modern, clean component styling inspired by shadcn/ui design system
 * Provides enhanced visual polish and consistency
 */

import { globalStyle, style } from "@vanilla-extract/css";
import { mantineThemeClass } from "./mantine-theme.css";

// Base card styling with modern shadows and borders
export const card = style({
  borderRadius: "0.75rem",
  border: "1px solid var(--color-border-primary)",
  backgroundColor: "var(--color-background-primary)",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  transition: "all 0.2s ease-in-out",
});

export const cardHover = style({
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  transform: "translateY(-1px)",
});

// Modern button styling
export const button = style({
  borderRadius: "0.5rem",
  fontWeight: "500",
  transition: "all 0.2s ease-in-out",
  border: "1px solid transparent",
});

export const buttonVariant = {
  primary: style({
    backgroundColor: "var(--color-primary-600)",
    color: "white",
    selectors: {
      "&:hover": {
        backgroundColor: "var(--color-primary-700)",
        transform: "translateY(-1px)",
        boxShadow: "0 4px 12px rgb(37 99 235 / 0.15)",
      },
    },
  }),
  secondary: style({
    backgroundColor: "var(--color-background-secondary)",
    color: "var(--color-text-primary)",
    borderColor: "var(--color-border-primary)",
    selectors: {
      "&:hover": {
        backgroundColor: "var(--color-background-tertiary)",
        transform: "translateY(-1px)",
      },
    },
  }),
  outline: style({
    backgroundColor: "transparent",
    color: "var(--color-primary-600)",
    borderColor: "var(--color-primary-600)",
    selectors: {
      "&:hover": {
        backgroundColor: "var(--color-primary-50)",
        transform: "translateY(-1px)",
      },
    },
  }),
  ghost: style({
    backgroundColor: "transparent",
    color: "var(--color-text-secondary)",
    selectors: {
      "&:hover": {
        backgroundColor: "var(--color-background-secondary)",
        color: "var(--color-text-primary)",
      },
    },
  }),
};

// Input field styling
export const input = style({
  borderRadius: "0.5rem",
  border: "1px solid var(--color-border-primary)",
  backgroundColor: "var(--color-background-primary)",
  fontSize: "0.875rem",
  transition: "all 0.2s ease-in-out",
  selectors: {
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px var(--color-primary-200)",
      borderColor: "var(--color-primary-500)",
    },
  },
});

// Badge styling
export const badge = style({
  borderRadius: "9999px",
  fontSize: "0.75rem",
  fontWeight: "500",
  padding: "0.25rem 0.75rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
});

export const badgeVariant = {
  default: style({
    backgroundColor: "var(--color-background-secondary)",
    color: "var(--color-text-primary)",
  }),
  primary: style({
    backgroundColor: "var(--color-primary-100)",
    color: "var(--color-primary-800)",
  }),
  success: style({
    backgroundColor: "var(--color-success-100)",
    color: "var(--color-success-800)",
  }),
  warning: style({
    backgroundColor: "var(--color-warning-100)",
    color: "var(--color-warning-800)",
  }),
  error: style({
    backgroundColor: "var(--color-error-100)",
    color: "var(--color-error-800)",
  }),
};

// Skeleton loading styling
export const skeleton = style({
  borderRadius: "0.5rem",
  background: "linear-gradient(90deg, var(--color-background-secondary) 0%, var(--color-background-tertiary) 50%, var(--color-background-secondary) 100%)",
  backgroundSize: "200% 100%",
});

// Modal/Dialog styling
export const modal = style({
  borderRadius: "1rem",
  border: "1px solid var(--color-border-primary)",
  backgroundColor: "var(--color-background-primary)",
  boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  backdropFilter: "blur(8px)",
});

// Dropdown/Menu styling
export const dropdown = style({
  borderRadius: "0.75rem",
  border: "1px solid var(--color-border-primary)",
  backgroundColor: "var(--color-background-primary)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  padding: "0.5rem",
});

export const dropdownItem = style({
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  transition: "all 0.2s ease-in-out",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      backgroundColor: "var(--color-background-secondary)",
    },
  },
});

// Tabs styling
export const tabs = style({
  borderBottom: "1px solid var(--color-border-primary)",
});

export const tab = style({
  borderRadius: "0.5rem 0.5rem 0 0",
  padding: "0.75rem 1.5rem",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "var(--color-text-secondary)",
  transition: "all 0.2s ease-in-out",
  cursor: "pointer",
  selectors: {
    "&:hover": {
      color: "var(--color-text-primary)",
      backgroundColor: "var(--color-background-secondary)",
    },
  },
});

export const tabActive = style({
  color: "var(--color-primary-600)",
  backgroundColor: "var(--color-background-primary)",
  borderBottom: "2px solid var(--color-primary-600)",
});

// Table styling
export const table = style({
  border: "1px solid var(--color-border-primary)",
  borderRadius: "0.75rem",
  overflow: "hidden",
});

export const tableHead = style({
  backgroundColor: "var(--color-background-secondary)",
  borderBottom: "1px solid var(--color-border-primary)",
});

export const tableRow = style({
  borderBottom: "1px solid var(--color-border-primary)",
  transition: "background-color 0.2s ease-in-out",
  selectors: {
    "&:hover": {
      backgroundColor: "var(--color-background-secondary)",
    },
  },
});

// Alert/Notification styling
export const alert = style({
  borderRadius: "0.75rem",
  border: "1px solid",
  padding: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
});

export const alertVariant = {
  info: style({
    backgroundColor: "var(--color-primary-50)",
    borderColor: "var(--color-primary-200)",
    color: "var(--color-primary-800)",
  }),
  success: style({
    backgroundColor: "var(--color-success-50)",
    borderColor: "var(--color-success-200)",
    color: "var(--color-success-800)",
  }),
  warning: style({
    backgroundColor: "var(--color-warning-50)",
    borderColor: "var(--color-warning-200)",
    color: "var(--color-warning-800)",
  }),
  error: style({
    backgroundColor: "var(--color-error-50)",
    borderColor: "var(--color-error-200)",
    color: "var(--color-error-800)",
  }),
};

// Note: Animations can be added using CSS-in-JS keyframes when needed

// Global Mantine component overrides
globalStyle(`${mantineThemeClass} .mantine-Button-root`, {
  borderRadius: "0.5rem !important",
  fontWeight: "500 !important",
  transition: "all 0.2s ease-in-out !important",
});

globalStyle(`${mantineThemeClass} .mantine-TextInput-root`, {
  borderRadius: "0.5rem !important",
  transition: "all 0.2s ease-in-out !important",
});

globalStyle(`${mantineThemeClass} .mantine-Card-root`, {
  borderRadius: "0.75rem !important",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important",
  transition: "all 0.2s ease-in-out !important",
});

globalStyle(`${mantineThemeClass} .mantine-Modal-root`, {
  borderRadius: "1rem !important",
});

globalStyle(`${mantineThemeClass} .mantine-Dropdown-root`, {
  borderRadius: "0.75rem !important",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important",
});

globalStyle(`${mantineThemeClass} .mantine-Tabs-tab`, {
  borderRadius: "0.5rem 0.5rem 0 0 !important",
  fontWeight: "500 !important",
  transition: "all 0.2s ease-in-out !important",
});

globalStyle(`${mantineThemeClass} .mantine-Badge-root`, {
  borderRadius: "9999px !important",
  fontWeight: "500 !important",
});

globalStyle(`${mantineThemeClass} .mantine-Skeleton-root`, {
  borderRadius: "0.5rem !important",
});

// Academic entity specific styling
export const entityCard = style({
  position: "relative",
  overflow: "hidden",
});

export const entityCardType = style({
  position: "absolute",
  top: "0.75rem",
  right: "0.75rem",
  zIndex: "10",
});

export const entityCardIcon = style({
  width: "3rem",
  height: "3rem",
  borderRadius: "0.5rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.25rem",
  color: "white",
  marginBottom: "1rem",
});

export const entityWorkIcon = style({
  backgroundColor: "var(--color-work)",
});

export const entityAuthorIcon = style({
  backgroundColor: "var(--color-author)",
});

export const entitySourceIcon = style({
  backgroundColor: "var(--color-source)",
});

export const entityInstitutionIcon = style({
  backgroundColor: "var(--color-institution)",
});

export const entityConceptIcon = style({
  backgroundColor: "var(--color-concept)",
});

export const entityTopicIcon = style({
  backgroundColor: "var(--color-topic)",
});

export const entityPublisherIcon = style({
  backgroundColor: "var(--color-publisher)",
});

export const entityFunderIcon = style({
  backgroundColor: "var(--color-funder)",
});

export const entityKeywordIcon = style({
  backgroundColor: "var(--color-keyword)",
});

// Utility classes
export const transition = style({
  transition: "all 0.2s ease-in-out",
});

export const noTransition = style({
  transition: "none",
});

export const focusRing = style({
  selectors: {
    "&:focus": {
      outline: "none",
      boxShadow: "0 0 0 2px var(--color-primary-200), 0 0 0 4px var(--color-primary-500)",
    },
  },
});

export const hoverLift = style({
  transition: "transform 0.2s ease-in-out",
  selectors: {
    "&:hover": {
      transform: "translateY(-1px)",
    },
  },
});

// Export default styling utilities
export const shadcnStyles = {
  card,
  cardHover,
  button,
  buttonVariant,
  input,
  badge,
  badgeVariant,
  skeleton,
  modal,
  dropdown,
  dropdownItem,
  tabs,
  tab,
  tabActive,
  table,
  tableHead,
  tableRow,
  alert,
  alertVariant,
  entityCard,
  entityCardType,
  entityCardIcon,
  entityWorkIcon,
  entityAuthorIcon,
  entitySourceIcon,
  entityInstitutionIcon,
  entityConceptIcon,
  entityTopicIcon,
  entityPublisherIcon,
  entityFunderIcon,
  entityKeywordIcon,
  transition,
  noTransition,
  focusRing,
  hoverLift,
};

export default shadcnStyles;