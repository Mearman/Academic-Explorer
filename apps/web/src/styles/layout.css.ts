import { style } from "@vanilla-extract/css";
import { vars } from "./theme.css";

// Simple styles without problematic sprinkles for now
export const navigation = style({
	display: "flex",
	gap: "1rem",
	padding: "0 1rem",
	borderBottom: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
});

export const navLink = style({
	color: vars.color.text.primary,
	textDecoration: "none",
	padding: "0.5rem 0.75rem",
	borderRadius: vars.borderRadius.md,
	fontSize: vars.fontSize.sm,
	fontWeight: vars.fontWeight.medium,
	transition: "all 0.2s ease",

	":hover": {
		backgroundColor: vars.color.gray[100],
		color: vars.color.primary[700],
	},

	selectors: {
		"&.active": {
			backgroundColor: vars.color.primary[100],
			color: vars.color.primary[700],
			fontWeight: vars.fontWeight.semibold,
		},
	},
});

export const main = style({
	padding: "1rem",
	minHeight: "calc(100vh - 60px)",
});

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

export const card = style({
	backgroundColor: vars.color.background.primary,
	borderRadius: vars.borderRadius.lg,
	padding: "1rem",
	marginBottom: "1rem",
	border: `${vars.borderWidth[1]} solid ${vars.color.gray[200]}`,
	boxShadow: vars.shadow.sm,
	transition: "all 0.2s ease",

	":hover": {
		boxShadow: vars.shadow.md,
		borderColor: vars.color.gray[300],
	},
});

export const cardTitle = style({
	fontSize: vars.fontSize.lg,
	fontWeight: vars.fontWeight.semibold,
	marginBottom: "0.5rem",
});

export const cardContent = style({
	fontSize: vars.fontSize.sm,
	color: vars.color.text.secondary,
	lineHeight: vars.lineHeight.relaxed,
});

export const loadingSpinner = style({
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	padding: "2rem",
});

export const errorMessage = style({
	padding: "1rem",
	borderRadius: vars.borderRadius.md,
	fontSize: vars.fontSize.sm,
	color: vars.color.error,
	backgroundColor: "#fef2f2",
	border: `${vars.borderWidth[1]} solid #fecaca`,
});