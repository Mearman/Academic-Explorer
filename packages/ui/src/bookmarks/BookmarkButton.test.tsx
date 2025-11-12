import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { MantineProvider } from "@mantine/core"
import { BookmarkButton } from "./BookmarkButton"

// Wrapper with Mantine provider
function TestWrapper({ children }: { children: React.ReactNode }) {
	return <MantineProvider>{children}</MantineProvider>
}

describe("BookmarkButton", () => {
	it("should render with bookmark icon when not bookmarked", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute("aria-label", "Bookmark")
		expect(button).toHaveAttribute("aria-pressed", "false")
	})

	it("should render with filled bookmark icon when bookmarked", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={true}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toHaveAttribute("aria-label", "Remove bookmark")
		expect(button).toHaveAttribute("aria-pressed", "true")
	})

	it("should show loader when loading", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					loading={true}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toBeDisabled()
		// Mantine Loader should be present
		expect(button.querySelector(".mantine-Loader-root")).toBeInTheDocument()
	})

	it("should call onToggle when clicked", () => {
		const onToggle = vi.fn()

		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		fireEvent.click(button)

		expect(onToggle).toHaveBeenCalledTimes(1)
	})

	it("should not call onToggle when disabled (loading)", () => {
		const onToggle = vi.fn()

		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					loading={true}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		fireEvent.click(button)

		expect(onToggle).not.toHaveBeenCalled()
	})

	it("should handle async onToggle", () => {
		const onToggle = vi.fn(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100))
		})

		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		fireEvent.click(button)

		expect(onToggle).toHaveBeenCalledTimes(1)
	})

	it("should apply custom size", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					size="xl"
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toHaveAttribute("data-size", "xl")
	})

	it("should apply custom variant", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					variant="filled"
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toHaveAttribute("data-variant", "filled")
	})

	it("should apply custom className", () => {
		const onToggle = vi.fn()
		render(
			<TestWrapper>
				<BookmarkButton
					isBookmarked={false}
					onToggle={onToggle}
					className="custom-class"
					data-testid="bookmark-button"
				/>
			</TestWrapper>
		)

		const button = screen.getByTestId("bookmark-button")
		expect(button).toHaveClass("custom-class")
	})
})
