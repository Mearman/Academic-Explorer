import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

export const pageTitle = style({
	fontSize: vars.fontSize["2xl"],
	fontWeight: vars.fontWeight.bold,
	marginBottom: "1rem",
});

export const pageDescription = style({
	fontSize: vars.fontSize.md,
	color: vars.color.text.secondary,
	marginBottom: "1.5rem",
	lineHeight: vars.lineHeight.relaxed,
});

