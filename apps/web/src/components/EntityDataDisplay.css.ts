import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "@/styles/theme.css";

export const container = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[6],
});

export const sectionCard = style({
  backgroundColor: vars.color.background.primary,
  borderRadius: vars.borderRadius.xl,
  border: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
  boxShadow: vars.shadow.lg,
  overflow: "hidden",
  transition: "box-shadow 0.2s ease",
  ":hover": {
    boxShadow: vars.shadow.xl,
  },
});

export const sectionHeader = style({
  background: `linear-gradient(to right, ${vars.color.gray[50]}, ${vars.color.background.primary})`,
  borderBottom: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
  padding: `${vars.space[4]} ${vars.space[6]}`,
});

export const sectionTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: vars.fontWeight.bold,
  color: vars.color.text.primary,
  display: "flex",
  alignItems: "center",
  gap: vars.space[3],
});

export const sectionIcon = style({
  fontSize: vars.fontSize["2xl"],
});

export const fieldCount = style({
  marginLeft: "auto",
  fontSize: vars.fontSize.sm,
  fontWeight: vars.fontWeight.normal,
  color: vars.color.text.secondary,
  backgroundColor: vars.color.gray[100],
  padding: `${vars.space[1]} ${vars.space[3]}`,
  borderRadius: vars.borderRadius.full,
});

export const sectionContent = style({
  padding: vars.space[6],
  display: "flex",
  flexDirection: "column",
  gap: vars.space[4],
});

export const fieldContainer = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[2],
  padding: vars.space[4],
  borderRadius: vars.borderRadius.lg,
  backgroundColor: vars.color.background.primary,
  border: `${vars.borderWidth[1]} solid ${vars.color.gray[100]}`,
  transition: "all 0.15s ease",
  ":hover": {
    borderColor: vars.color.gray[300],
    boxShadow: vars.shadow.md,
  },
});

export const fieldLabel = style({
  fontWeight: vars.fontWeight.bold,
  color: vars.color.text.primary,
  fontSize: vars.fontSize.md,
  letterSpacing: "0.025em",
});

export const fieldValue = style({
  marginLeft: vars.space[2],
  marginTop: vars.space[1],
});

// Value type styles
export const nullValue = style({
  color: vars.color.gray[400],
  fontStyle: "italic",
  fontSize: vars.fontSize.sm,
});

export const booleanBadgeBase = style({
  display: "inline-flex",
  alignItems: "center",
  padding: `${vars.space[1]} ${vars.space[3]}`,
  borderRadius: vars.borderRadius.full,
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.medium,
  border: vars.borderWidth[1],
});

export const booleanBadge = styleVariants({
  true: [booleanBadgeBase, {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderColor: "#6ee7b7",
  }],
  false: [booleanBadgeBase, {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderColor: "#fca5a5",
  }],
});

export const numberBadge = style({
  display: "inline-flex",
  alignItems: "center",
  padding: `${vars.space[1]} ${vars.space[3]}`,
  borderRadius: vars.borderRadius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: "monospace",
  fontWeight: vars.fontWeight.medium,
  backgroundColor: "#dbeafe",
  color: "#1e40af",
  border: `${vars.borderWidth[1]} solid #93c5fd`,
});

export const urlLink = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space[1],
  color: vars.color.primary[600],
  transition: "color 0.2s ease",
  wordBreak: "break-all",
  ":hover": {
    color: vars.color.primary[800],
    textDecoration: "underline",
    textDecorationThickness: "2px",
    textUnderlineOffset: "2px",
  },
});

export const stringValue = style({
  color: vars.color.text.primary,
});

// Array styles
export const emptyArray = style({
  color: vars.color.gray[400],
  fontStyle: "italic",
  fontSize: vars.fontSize.sm,
});

export const primitiveArray = style({
  display: "inline-flex",
  flexWrap: "wrap",
  gap: vars.space[2],
});

export const primitiveArrayItem = style({
  background: `linear-gradient(to bottom right, ${vars.color.gray[50]}, ${vars.color.gray[100]})`,
  padding: `${vars.space[1]} ${vars.space[3]}`,
  borderRadius: vars.borderRadius.md,
  fontSize: vars.fontSize.sm,
  border: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
  boxShadow: vars.shadow.sm,
});

export const objectArray = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[3],
  marginTop: vars.space[2],
});

export const objectArrayItem = style({
  position: "relative",
  borderLeft: `${vars.borderWidth[4]} solid #a5b4fc`,
  paddingLeft: vars.space[4],
  paddingTop: vars.space[2],
  paddingBottom: vars.space[2],
  background: `linear-gradient(to right, #eef2ff80, transparent)`,
  borderRadius: `0 ${vars.borderRadius.md} ${vars.borderRadius.md} 0`,
});

export const arrayItemNumber = style({
  position: "absolute",
  left: "-13px",
  top: vars.space[2],
  width: "1.5rem",
  height: "1.5rem",
  backgroundColor: "#6366f1",
  color: vars.color.text.inverse,
  borderRadius: vars.borderRadius.full,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: vars.fontSize.xs,
  fontWeight: vars.fontWeight.bold,
  boxShadow: vars.shadow.sm,
});

export const arrayItemContent = style({
  marginTop: vars.space[1],
});

// Object styles
export const emptyObject = style({
  color: vars.color.gray[400],
  fontStyle: "italic",
  fontSize: vars.fontSize.sm,
});

export const objectContainer = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space[2],
  marginTop: vars.space[2],
});

export const objectField = style({
  borderLeft: `${vars.borderWidth[2]} solid #d8b4fe`,
  paddingLeft: vars.space[4],
  paddingTop: vars.space[1],
  paddingBottom: vars.space[1],
  background: `linear-gradient(to right, #faf5ff66, transparent)`,
  borderRadius: `0 ${vars.borderRadius.md} ${vars.borderRadius.md} 0`,
  transition: "border-color 0.2s ease",
  ":hover": {
    borderColor: "#c084fc",
  },
});

export const objectFieldLabel = style({
  fontWeight: vars.fontWeight.semibold,
  color: "#7c3aed",
  fontSize: vars.fontSize.sm,
});

export const objectFieldValue = style({
  marginLeft: vars.space[3],
  marginTop: vars.space[1],
});

export const fallbackValue = style({
  color: vars.color.text.tertiary,
});
