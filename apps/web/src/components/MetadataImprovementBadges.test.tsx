/**
 * Tests for MetadataImprovementBadges Component
 *
 * Verifies badge rendering for metadata improvements in works
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MetadataImprovementBadges } from "./MetadataImprovementBadges";
import { MantineProvider } from "@mantine/core";

// Ensure cleanup runs after each test to prevent DOM pollution
afterEach(() => {
	cleanup();
});

// Wrapper component for Mantine context
function renderWithMantine(component: React.ReactElement) {
	return render(<MantineProvider>{component}</MantineProvider>);
}

describe("MetadataImprovementBadges", () => {
	it("renders badges for works with improved references", () => {
		const work = {
			referenced_works_count: 15,
			is_xpac: false,
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		expect(screen.getByTestId("improvement-badge-references")).toBeInTheDocument();
		expect(screen.getByText("Improved references data")).toBeInTheDocument();
	});

	it("renders badges for works with improved locations", () => {
		const work = {
			locations_count: 3,
			is_xpac: false,
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		expect(screen.getByTestId("improvement-badge-locations")).toBeInTheDocument();
		expect(screen.getByText("Improved locations data")).toBeInTheDocument();
	});

	it("renders multiple badges for works with multiple improvements", () => {
		const work = {
			referenced_works_count: 15,
			locations_count: 3,
			is_xpac: false,
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		expect(screen.getByTestId("improvement-badge-references")).toBeInTheDocument();
		expect(screen.getByTestId("improvement-badge-locations")).toBeInTheDocument();
		expect(screen.getByText("Improved references data")).toBeInTheDocument();
		expect(screen.getByText("Improved locations data")).toBeInTheDocument();
	});

	it("returns null for XPAC works (new works, not improvements)", () => {
		const work = {
			referenced_works_count: 15,
			locations_count: 3,
			is_xpac: true, // XPAC works are new, not improved
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		// Component should not render badges
		expect(screen.queryByTestId("metadata-improvement-badges")).not.toBeInTheDocument();
	});

	it("returns null for works with no improvements", () => {
		const work = {
			referenced_works_count: 0,
			locations_count: 1,
			is_xpac: false,
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		// Component should not render badges
		expect(screen.queryByTestId("metadata-improvement-badges")).not.toBeInTheDocument();
	});

	it("returns null for works with undefined metadata", () => {
		const work = {
			is_xpac: false,
		};

		renderWithMantine(<MetadataImprovementBadges work={work} />);

		// Component should not render badges
		expect(screen.queryByTestId("metadata-improvement-badges")).not.toBeInTheDocument();
	});

	it("renders with custom test ID", () => {
		const work = {
			referenced_works_count: 15,
			is_xpac: false,
		};

		renderWithMantine(
			<MetadataImprovementBadges work={work} data-testid="custom-badges" />
		);

		expect(screen.getByTestId("custom-badges")).toBeInTheDocument();
	});
});
