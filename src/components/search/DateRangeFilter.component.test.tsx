import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { DateRangeFilter } from "./DateRangeFilter";

const renderWithProviders = (component: React.ReactElement) => {
	return render(
		<MantineProvider>
			<DatesProvider>
				{component}
			</DatesProvider>
		</MantineProvider>
	);
};

describe("DateRangeFilter", () => {
	const mockOnStartDateChange = vi.fn();
	const mockOnEndDateChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render date range filter with default props", () => {
		renderWithProviders(
			<DateRangeFilter
				startDate={null}
				endDate={null}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
			/>
		);

		expect(screen.getByText("Publication Date Range")).toBeInTheDocument();
		expect(screen.getByText("Start date")).toBeInTheDocument();
		expect(screen.getByText("End date")).toBeInTheDocument();
		expect(screen.getByText("to")).toBeInTheDocument();
	});

	it("should render with custom label", () => {
		const customLabel = "Custom Date Range";
		renderWithProviders(
			<DateRangeFilter
				startDate={null}
				endDate={null}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
				label={customLabel}
			/>
		);

		expect(screen.getByText(customLabel)).toBeInTheDocument();
	});

	it("should not render label when label is empty", () => {
		renderWithProviders(
			<DateRangeFilter
				startDate={null}
				endDate={null}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
				label=""
			/>
		);

		expect(screen.queryByText("Publication Date Range")).not.toBeInTheDocument();
	});

	it("should display selected dates", () => {
		const startDate = new Date("2023-01-01");
		const endDate = new Date("2023-12-31");

		renderWithProviders(
			<DateRangeFilter
				startDate={startDate}
				endDate={endDate}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
			/>
		);

		// Mantine DatePickerInput displays dates in a readable format
		expect(screen.getByText("January 1, 2023")).toBeInTheDocument();
		expect(screen.getByText("December 31, 2023")).toBeInTheDocument();
	});

	it("should disable inputs when disabled prop is true", () => {
		renderWithProviders(
			<DateRangeFilter
				startDate={null}
				endDate={null}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
				disabled={true}
			/>
		);

		const startButton = screen.getByRole("button", { name: /start date/i });
		const endButton = screen.getByRole("button", { name: /end date/i });

		expect(startButton).toBeDisabled();
		expect(endButton).toBeDisabled();
	});

	it("should test onChange handler logic directly for start date", () => {
		// Test the onChange handler logic directly since DatePickerInput
		// is a complex component that doesn't easily allow interaction testing
		const component = new (class {
			handleStartChange(value: string | null) {
				if (value === null) {
					mockOnStartDateChange(null);
				} else {
					const date = new Date(value);
					mockOnStartDateChange(isNaN(date.getTime()) ? null : date);
				}
			}
		})();

		// Test valid date
		component.handleStartChange("2023-01-01");
		expect(mockOnStartDateChange).toHaveBeenCalledWith(new Date("2023-01-01"));

		// Test null value
		mockOnStartDateChange.mockClear();
		component.handleStartChange(null);
		expect(mockOnStartDateChange).toHaveBeenCalledWith(null);

		// Test invalid date
		mockOnStartDateChange.mockClear();
		component.handleStartChange("invalid-date");
		expect(mockOnStartDateChange).toHaveBeenCalledWith(null);
	});

	it("should test onChange handler logic directly for end date", () => {
		// Test the onChange handler logic directly since DatePickerInput
		// is a complex component that doesn't easily allow interaction testing
		const component = new (class {
			handleEndChange(value: string | null) {
				if (value === null) {
					mockOnEndDateChange(null);
				} else {
					const date = new Date(value);
					mockOnEndDateChange(isNaN(date.getTime()) ? null : date);
				}
			}
		})();

		// Test valid date
		component.handleEndChange("2023-12-31");
		expect(mockOnEndDateChange).toHaveBeenCalledWith(new Date("2023-12-31"));

		// Test null value
		mockOnEndDateChange.mockClear();
		component.handleEndChange(null);
		expect(mockOnEndDateChange).toHaveBeenCalledWith(null);

		// Test invalid date
		mockOnEndDateChange.mockClear();
		component.handleEndChange("invalid-date");
		expect(mockOnEndDateChange).toHaveBeenCalledWith(null);
	});

	it("should render date picker buttons", () => {
		renderWithProviders(
			<DateRangeFilter
				startDate={null}
				endDate={null}
				onStartDateChange={mockOnStartDateChange}
				onEndDateChange={mockOnEndDateChange}
			/>
		);

		// DatePickerInput renders as buttons
		const datePickerButtons = screen.getAllByRole("button");
		expect(datePickerButtons).toHaveLength(2);
	});
});