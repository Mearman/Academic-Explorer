import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

// Container styles
export const pageContainer = style({
  minHeight: "100vh",
  padding: vars.space[10],
  backgroundColor: vars.color.background.secondary,
  "@media": {
    "(max-width: 768px)": {
      padding: vars.space[6],
    },
  },
});

export const contentContainer = style({
  maxWidth: "1280px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: vars.space[8],
});

// Header card
export const headerCard = style({
  backgroundColor: vars.color.background.primary,
  borderRadius: vars.borderRadius.xl,
  padding: vars.space[10],
  border: `${vars.borderWidth[1]} solid ${vars.color.border.primary}`,
  "@media": {
    "(max-width: 768px)": {
      padding: vars.space[6],
    },
  },
});

export const headerContent = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[6],
  "@media": {
    "(min-width: 1024px)": {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
  },
});

export const headerInfo = style({
  flex: 1,
});

// Entity type badge variants
export const entityBadgeBase = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space[2],
  padding: `${vars.space[2]} ${vars.space[4]}`,
  borderRadius: vars.borderRadius.full,
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.bold,
  marginBottom: vars.space[4],
});

export const entityBadge = styleVariants({
  author: [entityBadgeBase, {
    backgroundColor: `${vars.color.author}20`,
    color: vars.color.author,
  }],
  work: [entityBadgeBase, {
    backgroundColor: `${vars.color.work}20`,
    color: vars.color.work,
  }],
  institution: [entityBadgeBase, {
    backgroundColor: `${vars.color.institution}20`,
    color: vars.color.institution,
  }],
  source: [entityBadgeBase, {
    backgroundColor: `${vars.color.source}20`,
    color: vars.color.source,
  }],
  concept: [entityBadgeBase, {
    backgroundColor: `${vars.color.concept}20`,
    color: vars.color.concept,
  }],
  topic: [entityBadgeBase, {
    backgroundColor: `${vars.color.topic}20`,
    color: vars.color.topic,
  }],
  publisher: [entityBadgeBase, {
    backgroundColor: `${vars.color.publisher}20`,
    color: vars.color.publisher,
  }],
  funder: [entityBadgeBase, {
    backgroundColor: `${vars.color.funder}20`,
    color: vars.color.funder,
  }],
});

export const entityTitle = style({
  fontSize: vars.fontSize["4xl"],
  fontWeight: vars.fontWeight.bold,
  marginBottom: vars.space[6],
  color: vars.color.text.primary,
  lineHeight: vars.lineHeight.tight,
  letterSpacing: "-0.02em",
  "@media": {
    "(max-width: 768px)": {
      fontSize: vars.fontSize["3xl"],
      marginBottom: vars.space[4],
    },
  },
});

export const metadataGroup = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[3],
  padding: vars.space[4],
  backgroundColor: vars.color.background.secondary,
  borderRadius: vars.borderRadius.lg,
  border: `${vars.borderWidth[1]} solid ${vars.color.border.secondary}`,
});

export const metadataRow = style({
  display: "flex",
  gap: vars.space[3],
  fontSize: vars.fontSize.sm,
  alignItems: "flex-start",
  "@media": {
    "(max-width: 768px)": {
      flexDirection: "column",
      gap: vars.space[2],
    },
  },
});

export const metadataLabel = style({
  fontWeight: vars.fontWeight.semibold,
  color: vars.color.text.secondary,
  minWidth: "120px",
  flexShrink: 0,
});

export const metadataValue = style({
  color: vars.color.codeText,
  fontSize: vars.fontSize.xs,
  fontFamily: "monospace",
  backgroundColor: vars.color.codeBg,
  padding: `${vars.space[2]} ${vars.space[3]}`,
  borderRadius: vars.borderRadius.md,
  wordBreak: "break-all",
  flex: 1,
  border: `${vars.borderWidth[1]} solid ${vars.color.border.secondary}`,
});

// Loading state
export const loadingContainer = style({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space[8],
  backgroundColor: vars.color.background.secondary,
});

export const loadingCard = style({
  backgroundColor: vars.color.background.primary,
  borderRadius: vars.borderRadius.xl,
  padding: vars.space[12],
  maxWidth: "32rem",
  width: "100%",
  textAlign: "center",
  border: `${vars.borderWidth[1]} solid ${vars.color.border.primary}`,
  "@media": {
    "(max-width: 768px)": {
      padding: vars.space[8],
      maxWidth: "100%",
    },
  },
});

export const loadingTitle = style({
  fontSize: vars.fontSize["2xl"],
  fontWeight: vars.fontWeight.bold,
  color: vars.color.text.primary,
  marginBottom: vars.space[4],
  marginTop: vars.space[6],
  letterSpacing: "-0.01em",
});

export const loadingId = style({
  color: vars.color.codeText,
  fontFamily: "monospace",
  fontSize: vars.fontSize.sm,
  backgroundColor: vars.color.codeBg,
  padding: `${vars.space[2]} ${vars.space[4]}`,
  borderRadius: vars.borderRadius.lg,
  display: "inline-block",
  border: `${vars.borderWidth[1]} solid ${vars.color.border.secondary}`,
});

// Error state
export const errorContainer = loadingContainer;

export const errorCard = style({
  backgroundColor: vars.color.background.primary,
  borderRadius: vars.borderRadius.xl,
  padding: vars.space[12],
  maxWidth: "48rem",
  width: "100%",
  border: `${vars.borderWidth[1]} solid ${vars.color.border.primary}`,
  "@media": {
    "(max-width: 768px)": {
      padding: vars.space[8],
      maxWidth: "100%",
    },
  },
});

export const errorIconWrapper = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "5rem",
  height: "5rem",
  backgroundColor: vars.color.errorBg.light,
  borderRadius: vars.borderRadius.full,
  marginBottom: vars.space[6],
  border: `${vars.borderWidth[2]} solid ${vars.color.errorBorder}`,
});

export const errorTitle = style({
  fontSize: vars.fontSize["3xl"],
  fontWeight: vars.fontWeight.bold,
  color: vars.color.error,
  marginBottom: vars.space[3],
  letterSpacing: "-0.01em",
});

export const errorDetailsBox = style({
  backgroundColor: vars.color.errorDetailsBg,
  padding: vars.space[5],
  borderRadius: vars.borderRadius.lg,
  border: `${vars.borderWidth[1]} solid ${vars.color.border.secondary}`,
  marginTop: vars.space[4],
});

export const errorDetailsTitle = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.text.secondary,
  fontWeight: vars.fontWeight.semibold,
  marginBottom: vars.space[2],
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const errorDetailsText = style({
  color: vars.color.text.primary,
  fontFamily: "monospace",
  wordBreak: "break-all",
  fontSize: vars.fontSize.sm,
  lineHeight: vars.lineHeight.relaxed,
});

export const errorBox = style({
  backgroundColor: vars.color.errorBg.lighter,
  padding: vars.space[5],
  borderRadius: vars.borderRadius.lg,
  border: `${vars.borderWidth[2]} solid ${vars.color.errorBorder}`,
  marginTop: vars.space[4],
});

export const errorBoxTitle = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.error,
  fontWeight: vars.fontWeight.semibold,
  marginBottom: vars.space[2],
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const errorBoxText = style({
  color: vars.color.errorText,
  fontFamily: "monospace",
  fontSize: vars.fontSize.sm,
  wordBreak: "break-all",
  lineHeight: vars.lineHeight.relaxed,
});

// Raw JSON view
export const rawJsonContainer = style({
  backgroundColor: vars.color.codeViewer.bg,
  borderRadius: vars.borderRadius.xl,
  overflow: "hidden",
  border: `${vars.borderWidth[1]} solid ${vars.color.codeViewer.border}`,
});

export const rawJsonHeader = style({
  backgroundColor: vars.color.codeViewer.headerBg,
  padding: `${vars.space[5]} ${vars.space[6]}`,
  borderBottom: `${vars.borderWidth[1]} solid ${vars.color.codeViewer.border}`,
});

export const rawJsonTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.codeViewer.text,
  display: "flex",
  alignItems: "center",
  gap: vars.space[3],
  letterSpacing: "-0.01em",
});

export const rawJsonContent = style({
  padding: vars.space[8],
  fontSize: vars.fontSize.sm,
  color: vars.color.codeViewer.text,
  overflowX: "auto",
  maxHeight: "1000px",
  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
  whiteSpace: "pre",
  lineHeight: vars.lineHeight.relaxed,
  "@media": {
    "(max-width: 768px)": {
      padding: vars.space[4],
      fontSize: vars.fontSize.xs,
    },
  },
});
