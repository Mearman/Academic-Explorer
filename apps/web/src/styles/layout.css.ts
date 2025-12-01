import { style } from "@vanilla-extract/css";

export const pageTitle = style({
  fontSize: "1.5rem",
  fontWeight: "600",
  marginBottom: "1rem",
});

export const pageDescription = style({
  fontSize: "1rem",
  color: "var(--mantine-color-dimmed)",
  marginBottom: "1.5rem",
  lineHeight: "1.625",
});
