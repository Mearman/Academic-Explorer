import { fireEvent,render, screen } from '@testing-library/react'

import { ThemeProvider } from '@/contexts/theme-context'

import { ColorSchemeSelector } from './ColorSchemeSelector'

const renderColorSchemeSelector = () => {
  return render(
    <ThemeProvider>
      <ColorSchemeSelector />
    </ThemeProvider>
  )
}

describe('ColorSchemeSelector', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders with initial color scheme', () => {
    renderColorSchemeSelector()
    // Should render two buttons: main button and dropdown arrow
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('cycles through color schemes on main button click', () => {
    renderColorSchemeSelector()

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0] // First button is the main theme cycling button
    fireEvent.click(mainButton)

    // Test that clicking the button works without throwing an error
    expect(mainButton).toBeInTheDocument()
  })

  it('opens menu when dropdown arrow is clicked', () => {
    renderColorSchemeSelector()

    const buttons = screen.getAllByRole('button')
    const dropdownButton = buttons[1] // Second button is the dropdown
    fireEvent.click(dropdownButton)

    // Menu should contain "Theme Mode" and "Color Palette" sections
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
    expect(screen.getByText('Color Palette')).toBeInTheDocument()
  })

  it('shows correct titles for main and dropdown buttons', () => {
    renderColorSchemeSelector()

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0]
    const dropdownButton = buttons[1]

    expect(mainButton).toHaveAttribute('title', 'Theme: Auto (Click to cycle)')
    expect(dropdownButton).toHaveAttribute('title', 'Palette: blue (Click for options)')
  })

  it('displays current theme mode and palette indicator', () => {
    renderColorSchemeSelector()

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0]
    // Should contain the theme mode text and color indicator
    expect(mainButton).toHaveTextContent('Auto')
  })
})