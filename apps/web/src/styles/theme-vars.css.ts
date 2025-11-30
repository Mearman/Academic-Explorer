import { createVar, createThemeContract } from "@vanilla-extract/css";

// CSS custom properties for theme switching
export const themeVars = {
  // Component library contract
  componentLibrary: createVar(),

  // Color scheme contract
  primaryColor: createVar(),
  primaryColorHover: createVar(),
  primaryColorLight: createVar(),
  backgroundColor: createVar(),
  backgroundColorHover: createVar(),
  surfaceColor: createVar(),
  borderColor: createVar(),
  textColor: createVar(),
  textSecondaryColor: createVar(),
  textMutedColor: createVar(),

  // Component-specific colors
  cardBackground: createVar(),
  inputBackground: createVar(),
  buttonBackground: createVar(),
  buttonHover: createVar(),

  // Spacing (allows component libraries to have different spacing scales)
  spacingUnit: createVar(),
  spacingSm: createVar(),
  spacingMd: createVar(),
  spacingLg: createVar(),

  // Border radius
  borderRadius: createVar(),
  borderRadiusSm: createVar(),
  borderRadiusLg: createVar(),

  // Shadows
  shadowSm: createVar(),
  shadowMd: createVar(),
  shadowLg: createVar(),
} as const;

// Base theme contract that all themes must implement
export const baseThemeContract = createThemeContract({
  colors: {
    primary: themeVars.primaryColor,
    primaryHover: themeVars.primaryColorHover,
    primaryLight: themeVars.primaryColorLight,
    background: themeVars.backgroundColor,
    backgroundHover: themeVars.backgroundColorHover,
    surface: themeVars.surfaceColor,
    border: themeVars.borderColor,
    text: themeVars.textColor,
    textSecondary: themeVars.textSecondaryColor,
    textMuted: themeVars.textMutedColor,
    card: themeVars.cardBackground,
    input: themeVars.inputBackground,
    button: themeVars.buttonBackground,
    buttonHover: themeVars.buttonHover,
  },
  spacing: {
    unit: themeVars.spacingUnit,
    sm: themeVars.spacingSm,
    md: themeVars.spacingMd,
    lg: themeVars.spacingLg,
  },
  borders: {
    radius: themeVars.borderRadius,
    radiusSm: themeVars.borderRadiusSm,
    radiusLg: themeVars.borderRadiusLg,
  },
  shadows: {
    sm: themeVars.shadowSm,
    md: themeVars.shadowMd,
    lg: themeVars.shadowLg,
  },
});