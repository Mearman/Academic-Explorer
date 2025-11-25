/**
 * Re-export Mantine types for peer dependency compatibility
 *
 * Allows consumers to import common Mantine types from this package
 * without direct @mantine/core imports in their code
 */

export type {
	MantineColor,
	MantineSize,
	MantineRadius,
	MantineTheme,
} from "@mantine/core";
