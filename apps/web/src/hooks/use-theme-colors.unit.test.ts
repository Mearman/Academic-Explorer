/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { MantineTheme } from "@mantine/core";
import { useThemeColors } from "./use-theme-colors";

// Mock the Mantine hooks
vi.mock("@mantine/core", async () => {
	const actual = await vi.importActual("@mantine/core");
	return {
		...actual,
		useMantineColorScheme: vi.fn(),
		useMantineTheme: vi.fn(),
	};
});

// Import the mocked functions
import { useMantineColorScheme, useMantineTheme } from "@mantine/core";

describe("useThemeColors", () => {
	let mockTheme: Partial<MantineTheme>;
	let mockMatchMedia: any;

	beforeEach(() => {
		// Setup mock theme with all required color palettes
		mockTheme = {
			colors: {
				blue: ["#e7f5ff", "#d0ebff", "#a5d8ff", "#74c0fc", "#339af0", "#228be6", "#1c7ed6", "#1971c2", "#1864ab", "#0b5394"],
				gray: ["#f8f9fa", "#f1f3f4", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#6c757d", "#495057", "#343a40", "#212529"],
				green: ["#ebfbee", "#d3f9d8", "#b2f2bb", "#8ce99a", "#69db7c", "#51cf66", "#40c057", "#37b24d", "#2f9e44", "#2b8a3e"],
				yellow: ["#fff9db", "#fff3bf", "#ffec99", "#ffe066", "#ffd43b", "#fcc419", "#fab005", "#f59f00", "#f08c00", "#e67700"],
				red: ["#fff5f5", "#ffe3e3", "#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252", "#f03e3e", "#e03131", "#c92a2a"],
				cyan: ["#e3fafc", "#c5f6fa", "#99e9f2", "#66d9ef", "#3bc9db", "#22b8cf", "#15aabf", "#1098ad", "#0c8599", "#0b7285"],
				pink: ["#fff0f6", "#ffdeeb", "#fcc2d7", "#faa2c1", "#f783ac", "#f06595", "#e64980", "#d6336c", "#c2255c", "#a61e4d"],
				// Custom entity colors
				author: ["#e7fcf0", "#d3f9d8", "#b2f2bb", "#8ce99a", "#69db7c", "#51cf66", "#40c057", "#37b24d", "#2f9e44", "#2b8a3e"],
				source: ["#f3e8ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95"],
				institution: ["#fffbeb", "#fef3c7", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#dc2626", "#c2410c", "#9a3412"],
			},
		};

		// Setup window.matchMedia mock
		mockMatchMedia = vi.fn();
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: mockMatchMedia,
		});

		// Setup default mocks
		vi.mocked(useMantineTheme).mockReturnValue(mockTheme as MantineTheme);
		vi.mocked(useMantineColorScheme).mockReturnValue({
			colorScheme: "light",
			setColorScheme: vi.fn(),
			toggleColorScheme: vi.fn(),
			clearColorScheme: vi.fn(),
		});

		// Default matchMedia to light mode
		mockMatchMedia.mockReturnValue({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		});
	});

	describe("basic functionality", () => {
		it("should return all expected properties", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors).toBeDefined();
			expect(result.current.getColor).toBeInstanceOf(Function);
			expect(result.current.getEntityColor).toBeInstanceOf(Function);
			expect(result.current.getEntityColorShade).toBeInstanceOf(Function);
			expect(typeof result.current.isDark).toBe("boolean");
			expect(result.current.theme).toBeDefined();
		});

		it("should correctly detect light mode", () => {
			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "light",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.isDark).toBe(false);
		});

		it("should correctly detect dark mode", () => {
			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "dark",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.isDark).toBe(true);
		});
	});

	describe("auto color scheme detection", () => {
		it("should resolve auto to light when system prefers light", () => {
			mockMatchMedia.mockReturnValue({
				matches: false, // prefers-color-scheme: dark is false
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			});

			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "auto",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.isDark).toBe(false);
		});

		it("should resolve auto to dark when system prefers dark", () => {
			mockMatchMedia.mockReturnValue({
				matches: true, // prefers-color-scheme: dark is true
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			});

			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "auto",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.isDark).toBe(true);
		});
	});

	describe("color structure in light mode", () => {
		beforeEach(() => {
			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "light",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});
		});

		it("should provide correct text colors for light mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.text.primary).toBe("var(--mantine-color-text)");
			expect(result.current.colors.text.secondary).toBe(mockTheme.colors!.gray[6]);
			expect(result.current.colors.text.tertiary).toBe(mockTheme.colors!.gray[5]);
			expect(result.current.colors.text.inverse).toBe(mockTheme.colors!.gray[0]);
		});

		it("should provide correct background colors for light mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.background.primary).toBe("var(--mantine-color-body)");
			expect(result.current.colors.background.secondary).toBe(mockTheme.colors!.gray[0]);
			expect(result.current.colors.background.tertiary).toBe(mockTheme.colors!.gray[1]);
			expect(result.current.colors.background.overlay).toBe("rgba(255, 255, 255, 0.95)");
			expect(result.current.colors.background.blur).toBe("rgba(255, 255, 255, 0.95)");
		});

		it("should provide correct border colors for light mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.border.primary).toBe("var(--mantine-color-default-border)");
			expect(result.current.colors.border.secondary).toBe(mockTheme.colors!.gray[3]);
		});
	});

	describe("color structure in dark mode", () => {
		beforeEach(() => {
			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "dark",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});
		});

		it("should provide correct text colors for dark mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.text.primary).toBe("var(--mantine-color-text)");
			expect(result.current.colors.text.secondary).toBe(mockTheme.colors!.gray[3]);
			expect(result.current.colors.text.tertiary).toBe(mockTheme.colors!.gray[4]);
			expect(result.current.colors.text.inverse).toBe(mockTheme.colors!.gray[9]);
		});

		it("should provide correct background colors for dark mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.background.primary).toBe("var(--mantine-color-body)");
			expect(result.current.colors.background.secondary).toBe(mockTheme.colors!.gray[8]);
			expect(result.current.colors.background.tertiary).toBe(mockTheme.colors!.gray[7]);
			expect(result.current.colors.background.overlay).toBe("rgba(0, 0, 0, 0.8)");
			expect(result.current.colors.background.blur).toBe("rgba(31, 41, 55, 0.95)");
		});

		it("should provide correct border colors for dark mode", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.border.primary).toBe("var(--mantine-color-default-border)");
			expect(result.current.colors.border.secondary).toBe(mockTheme.colors!.gray[6]);
		});
	});

	describe("semantic colors", () => {
		it("should provide consistent semantic colors", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.primary).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.colors.success).toBe(mockTheme.colors!.green[5]);
			expect(result.current.colors.warning).toBe(mockTheme.colors!.yellow[5]);
			expect(result.current.colors.error).toBe(mockTheme.colors!.red[5]);
			expect(result.current.colors.info).toBe(mockTheme.colors!.blue[5]);
		});

		it("should fallback to hardcoded colors when theme colors are missing", () => {
			// Remove colors from theme by setting them to empty arrays
			const themeWithoutColors = {
				...mockTheme,
				colors: {
					...mockTheme.colors,
					green: [],
					yellow: [],
					red: [],
				},
			};

			vi.mocked(useMantineTheme).mockReturnValue(themeWithoutColors as MantineTheme);

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.success).toBe("#10b981");
			expect(result.current.colors.warning).toBe("#f59e0b");
			expect(result.current.colors.error).toBe("#ef4444");
		});
	});

	describe("entity colors", () => {
		it("should provide all entity colors", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.entity.work).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.colors.entity.author).toBe(mockTheme.colors!.author[5]);
			expect(result.current.colors.entity.source).toBe(mockTheme.colors!.source[5]);
			expect(result.current.colors.entity.institution).toBe(mockTheme.colors!.institution[5]);
			expect(result.current.colors.entity.concept).toBe(mockTheme.colors!.red[5]);
			expect(result.current.colors.entity.topic).toBe(mockTheme.colors!.red[5]);
			expect(result.current.colors.entity.publisher).toBe(mockTheme.colors!.cyan[5]);
			expect(result.current.colors.entity.funder).toBe(mockTheme.colors!.pink[5]);
		});

		it("should fallback to hardcoded entity colors when theme colors are missing", () => {
			const themeWithoutEntityColors = {
				...mockTheme,
				colors: {
					...mockTheme.colors,
					author: [],
					source: [],
					institution: [],
				},
			};

			vi.mocked(useMantineTheme).mockReturnValue(themeWithoutEntityColors as MantineTheme);

			const { result } = renderHook(() => useThemeColors());

			expect(result.current.colors.entity.author).toBe("#10b981");
			expect(result.current.colors.entity.source).toBe("#8b5cf6");
			expect(result.current.colors.entity.institution).toBe("#f59e0b");
		});
	});

	describe("getColor function", () => {
		it("should return color at default shade 5", () => {
			const { result } = renderHook(() => useThemeColors());

			const blueColor = result.current.getColor("blue");
			expect(blueColor).toBe(mockTheme.colors!.blue[5]);
		});

		it("should return color at specified shade", () => {
			const { result } = renderHook(() => useThemeColors());

			const blueColor3 = result.current.getColor("blue", 3);
			expect(blueColor3).toBe(mockTheme.colors!.blue[3]);
		});

		it("should fallback to the color name if shade doesn't exist", () => {
			const { result } = renderHook(() => useThemeColors());

			const invalidColor = result.current.getColor("nonexistent");
			expect(invalidColor).toBe("nonexistent");
		});

		it("should handle missing color array gracefully", () => {
			const themeWithMissingColor = {
				...mockTheme,
				colors: {
					...mockTheme.colors,
					purple: [],
				},
			};

			vi.mocked(useMantineTheme).mockReturnValue(themeWithMissingColor as MantineTheme);

			const { result } = renderHook(() => useThemeColors());

			const purpleColor = result.current.getColor("purple");
			expect(purpleColor).toBe("purple");
		});
	});

	describe("getEntityColor function", () => {
		it("should return correct colors for valid entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColor("work")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColor("author")).toBe(mockTheme.colors!.author[5]);
			expect(result.current.getEntityColor("source")).toBe(mockTheme.colors!.source[5]);
			expect(result.current.getEntityColor("institution")).toBe(mockTheme.colors!.institution[5]);
			expect(result.current.getEntityColor("concept")).toBe(mockTheme.colors!.red[5]);
			expect(result.current.getEntityColor("topic")).toBe(mockTheme.colors!.red[5]);
			expect(result.current.getEntityColor("publisher")).toBe(mockTheme.colors!.cyan[5]);
			expect(result.current.getEntityColor("funder")).toBe(mockTheme.colors!.pink[5]);
		});

		it("should handle case insensitive entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColor("WORK")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColor("Author")).toBe(mockTheme.colors!.author[5]);
			expect(result.current.getEntityColor("SOURCE")).toBe(mockTheme.colors!.source[5]);
		});

		it("should fallback to primary color for unknown entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColor("unknown")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColor("invalid")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColor("")).toBe(mockTheme.colors!.blue[5]);
		});
	});

	describe("getEntityColorShade function", () => {
		it("should return correct colors at default shade 5", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColorShade("work")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColorShade("author")).toBe(mockTheme.colors!.author[5]);
		});

		it("should return correct colors at specified shade", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColorShade("work", 3)).toBe(mockTheme.colors!.blue[3]);
			expect(result.current.getEntityColorShade("author", 7)).toBe(mockTheme.colors!.author[7]);
		});

		it("should handle plural entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColorShade("works")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColorShade("authors")).toBe(mockTheme.colors!.author[5]);
			expect(result.current.getEntityColorShade("sources")).toBe(mockTheme.colors!.source[5]);
			expect(result.current.getEntityColorShade("institutions")).toBe(mockTheme.colors!.institution[5]);
			expect(result.current.getEntityColorShade("concepts")).toBe(mockTheme.colors!.red[5]);
			expect(result.current.getEntityColorShade("topics")).toBe(mockTheme.colors!.red[5]);
			expect(result.current.getEntityColorShade("publishers")).toBe(mockTheme.colors!.cyan[5]);
			expect(result.current.getEntityColorShade("funders")).toBe(mockTheme.colors!.pink[5]);
		});

		it("should handle case insensitive entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColorShade("WORKS", 2)).toBe(mockTheme.colors!.blue[2]);
			expect(result.current.getEntityColorShade("Authors", 4)).toBe(mockTheme.colors!.author[4]);
		});

		it("should fallback to blue for unknown entity types", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColorShade("unknown")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColorShade("invalid", 3)).toBe(mockTheme.colors!.blue[3]);
		});
	});

	describe("theme object access", () => {
		it("should provide access to the Mantine theme object", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.theme).toBe(mockTheme);
			expect(result.current.theme.colors).toBeDefined();
		});
	});

	describe("edge cases and error handling", () => {
		it("should handle empty entity type strings", () => {
			const { result } = renderHook(() => useThemeColors());

			expect(result.current.getEntityColor("")).toBe(mockTheme.colors!.blue[5]);
			expect(result.current.getEntityColorShade("")).toBe(mockTheme.colors!.blue[5]);
		});

		it("should handle missing matchMedia gracefully", () => {
			// Set matchMedia to throw an error
			Object.defineProperty(window, "matchMedia", {
				value: vi.fn(() => {
					throw new Error("matchMedia not supported");
				}),
				writable: true,
			});

			vi.mocked(useMantineColorScheme).mockReturnValue({
				colorScheme: "auto",
				setColorScheme: vi.fn(),
				toggleColorScheme: vi.fn(),
				clearColorScheme: vi.fn(),
			});

			// Should fall back to light mode when matchMedia fails
			const { result } = renderHook(() => useThemeColors());
			expect(result.current.isDark).toBe(false);
		});

		it("should handle very high shade numbers gracefully", () => {
			const { result } = renderHook(() => useThemeColors());

			// Shade 15 doesn't exist, should fallback to color name
			const highShade = result.current.getColor("blue", 15);
			expect(highShade).toBe("blue");
		});
	});
});