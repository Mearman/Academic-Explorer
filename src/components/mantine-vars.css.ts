import { themeToVars } from '@mantine/vanilla-extract';

import { mantineTheme } from '@/lib/mantine-theme';

// Convert Mantine theme to CSS variables for Vanilla Extract
export const mantineVars = themeToVars(mantineTheme);