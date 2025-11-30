import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";

// Common layout styles
export const flexContainer = style({
  display: "flex",
});

export const flexColumn = style([
  flexContainer,
  {
    flexDirection: "column",
  },
]);

export const flexRow = style([
  flexContainer,
  {
    flexDirection: "row",
  },
]);

export const flexCenter = style([
  flexContainer,
  {
    alignItems: "center",
    justifyContent: "center",
  },
]);

export const flex1 = style({
  flex: 1,
});

export const flexStart = style([
  flexContainer,
  {
    alignItems: "flex-start",
  },
]);

export const flexEnd = style([
  flexContainer,
  {
    alignItems: "flex-end",
  },
]);

// Cursor styles
export const cursorPointer = style({
  cursor: "pointer",
});

export const cursorGrab = style({
  cursor: "grab",
});

export const cursorGrabbing = style({
  cursor: "grabbing",
});

export const cursorDefault = style({
  cursor: "default",
});

export const cursorHelp = style({
  cursor: "help",
});

export const cursorResize = style({
  cursor: "ew-resize",
});

// Text styles
export const textBreak = style({
  wordBreak: "break-word",
});

export const textBreakAll = style({
  wordBreak: "break-all",
});

export const textMonospace = style({
  fontFamily: "monospace",
});

export const textUppercase = style({
  textTransform: "uppercase",
});

export const textNoDecoration = style({
  textDecoration: "none",
});

export const textCenter = style({
  textAlign: "center",
});

export const textRight = style({
  textAlign: "right",
});

export const textLeft = style({
  textAlign: "left",
});

// Color styles
export const textDimmed = style({
  color: "var(--mantine-color-gray-4)",
});

export const textMutedSecondary = style({
  color: "var(--shadcn-muted-foreground)",
});

export const textDestructive = style({
  color: "var(--shadcn-destructive)",
});

export const textSuccess = style({
  color: "var(--mantine-color-green-6)",
});

export const textError = style({
  color: "var(--mantine-color-red-6)",
});

export const textWarning = style({
  color: "var(--mantine-color-red-6)",
});

export const textBlue = style({
  color: "var(--mantine-color-blue-6)",
});

export const backgroundTertiary = style({
  backgroundColor: "var(--mantine-color-blue-0)",
});

export const backgroundGray = style({
  backgroundColor: "var(--mantine-color-gray-0)",
});

// Spacing styles
export const marginTop20 = style({
  marginTop: "20px",
});

export const marginBottom20 = style({
  marginBottom: "20px",
});

export const marginBottom24 = style({
  marginBottom: "24px",
});

export const marginBottom32 = style({
  marginBottom: "32px",
});

export const margin0 = style({
  margin: 0,
});

export const padding24 = style({
  padding: "24px",
});

export const paddingXL = style({
  padding: "2rem",
});

export const minHeightFull = style({
  minHeight: "100vh",
});

// Opacity styles
export const opacity30 = style({
  opacity: 0.3,
});

// Border styles
export const borderTopGray = style({
  borderTop: "1px solid var(--mantine-color-gray-3)",
});

export const borderTopGray2 = style({
  borderTop: "1px solid var(--mantine-color-gray-2)",
});

export const borderSecondary = style({
  borderBottom: `1px solid var(--mantine-color-gray-3)`,
});

export const borderRadius = style({
  borderRadius: "8px",
});

export const borderRadiusXL = style({
  borderRadius: "16px",
});

// Overflow styles
export const overflowAuto = style({
  overflow: "auto",
});

export const overflowX = style({
  overflowX: "auto",
});

export const overflowHidden = style({
  overflow: "hidden",
});

export const overflowYAuto = style({
  overflowY: "auto",
});

// Positioning styles
export const positionRelative = style({
  position: "relative",
});

export const positionAbsolute = style({
  position: "absolute",
});

// Sizing styles
export const widthFull = style({
  width: "100%",
});

export const heightFull = style({
  height: "100%",
});

export const height50vh = style({
  height: "50vh",
});

export const minWidth0 = style({
  minWidth: 0,
});

export const minWidth120 = style({
  minWidth: "120px",
});

export const minHeight400 = style({
  minHeight: "400px",
});

export const maxWidth100 = style({
  maxWidth: "100%",
});

export const maxWidth90 = style({
  maxWidth: "90%",
});

export const maxWidthRem100 = style({
  maxWidth: "10rem",
});

export const maxWidthRem150 = style({
  maxWidth: "15rem",
});

// Transform styles
export const rotate90 = style({
  transform: "rotate(90deg)",
});

export const rotate180 = style({
  transform: "rotate(180deg)",
});

// Vertical alignment
export const verticalAlignTop = style({
  verticalAlign: "top",
});

export const verticalAlignMiddle = style({
  verticalAlign: "middle",
});

// Gap styles
export const gap4 = style({
  gap: "4px",
});

export const gap8 = style({
  gap: "8px",
});

export const gap16 = style({
  gap: "16px",
});

export const gap24 = style({
  gap: "24px",
});

// Display styles
export const displayFlex = style({
  display: "flex",
});

export const displayNone = style({
  display: "none",
});

export const displayGrid = style({
  display: "grid",
});

// Complex recipes
export const flexCenterColumn = recipe({
  base: [flexCenter, flexColumn],
});

export const flexBetween = recipe({
  base: [flexContainer],
  variants: {
    align: {
      center: { alignItems: "center" },
      start: { alignItems: "flex-start" },
      end: { alignItems: "flex-end" },
    },
  },
  defaultVariants: {
    align: "center",
  },
});

export const clickable = recipe({
  base: cursorPointer,
  variants: {
    disabled: {
      true: {
        cursor: "default",
        opacity: 0.6,
      },
      false: {},
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

export const textWithSpacing = recipe({
  base: {
    display: "flex",
    alignItems: "center",
  },
  variants: {
    gap: {
      xs: { gap: "4px" },
      sm: { gap: "8px" },
      md: { gap: "16px" },
      lg: { gap: "24px" },
    },
    direction: {
      row: { flexDirection: "row" },
      column: { flexDirection: "column" },
    },
  },
  defaultVariants: {
    gap: "sm",
    direction: "row",
  },
});

export const card = recipe({
  base: {
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid var(--mantine-color-gray-3)",
  },
  variants: {
    variant: {
      default: {
        backgroundColor: "var(--mantine-color-white)",
      },
      filled: {
        backgroundColor: "var(--mantine-color-gray-0)",
      },
      blue: {
        backgroundColor: "var(--mantine-color-blue-0)",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const iconWithText = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  variants: {
    size: {
      sm: { fontSize: "14px" },
      md: { fontSize: "16px" },
      lg: { fontSize: "18px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const codeBlock = recipe({
  base: {
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  variants: {
    variant: {
      default: {
        backgroundColor: "var(--mantine-color-gray-0)",
        padding: "4px 8px",
        borderRadius: "4px",
      },
      block: {
        backgroundColor: "var(--mantine-color-gray-0)",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid var(--mantine-color-gray-3)",
      },
      error: {
        backgroundColor: "var(--mantine-color-red-0)",
        color: "var(--mantine-color-red-8)",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid var(--mantine-color-red-3)",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const codeDisplay = style({
  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  whiteSpace: "pre",
  lineHeight: 1.6,
});

export const tableCell = recipe({
  base: {
    verticalAlign: "top",
  },
  variants: {
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center" },
      right: { textAlign: "right" },
    },
    width: {
      auto: {},
      fixed150: { width: "150px" },
    },
  },
  defaultVariants: {
    align: "left",
    width: "auto",
  },
});

export const loadingState = style({
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--mantine-color-dimmed)",
});

export const entityCard = style({
  cursor: "grab",
  ":active": {
    cursor: "grabbing",
  },
});

export const stickyHeader = style({
  position: "sticky",
  top: 0,
  zIndex: 1,
  backgroundColor: "white",
});

export const draggableItem = recipe({
  base: entityCard,
  variants: {
    isDragging: {
      true: {
        cursor: "grabbing",
        opacity: 0.8,
      },
      false: {},
    },
  },
  defaultVariants: {
    isDragging: false,
  },
});

export const sizedIcon = recipe({
  base: {},
  variants: {
    size: {
      xs: { width: 12, height: 12 },
      sm: { width: 14, height: 14 },
      md: { width: 16, height: 16 },
      lg: { width: 18, height: 18 },
      xl: { width: 20, height: 20 },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const centeredLoader = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",
  minHeight: "400px",
});

export const maxWidthContainer = recipe({
  base: {
    margin: "0 auto",
    width: "100%",
  },
  variants: {
    maxWidth: {
      lg: { maxWidth: "1400px" },
      md: { maxWidth: "800px" },
      sm: { maxWidth: "600px" },
    },
  },
  defaultVariants: {
    maxWidth: "lg",
  },
});

export const responsiveText = recipe({
  base: {
    color: "var(--shadcn-muted-foreground)",
  },
  variants: {
    size: {
      xs: { fontSize: "12px" },
      sm: { fontSize: "14px" },
      md: { fontSize: "16px" },
      lg: { fontSize: "18px" },
    },
    spacing: {
      none: { marginBottom: 0 },
      sm: { marginBottom: "8px" },
      md: { marginBottom: "16px" },
      lg: { marginBottom: "24px" },
    },
  },
  defaultVariants: {
    size: "sm",
    spacing: "none",
  },
});

export const borderBottomSecondary = recipe({
  base: {
    borderBottom: "1px solid var(--mantine-color-gray-3)",
  },
});

export const overflowScroll = recipe({
  base: {
    overflowX: "auto",
    maxHeight: "1000px",
  },
});