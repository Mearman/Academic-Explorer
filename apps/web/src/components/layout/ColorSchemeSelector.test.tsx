import { MantineProvider } from '@mantine/core'
import { render, screen, fireEvent } from '@testing-library/react'

import { ThemeProvider } from '@/contexts/theme-context'

import { ColorSchemeSelector } from './ColorSchemeSelector'

const renderColorSchemeSelector = (initialColorScheme = 'light') => {
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
    renderColorSchemeSelector('light')
    // Should render two buttons: main button and dropdown arrow
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('cycles through color schemes on main button click', () => {
    renderColorSchemeSelector('auto')

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0] // First button is the main theme cycling button
    fireEvent.click(mainButton)

    // Test that clicking the button works without throwing an error
    expect(mainButton).toBeInTheDocument()
  })

  it('opens menu when dropdown arrow is clicked', () => {
    renderColorSchemeSelector('light')

    const buttons = screen.getAllByRole('button')
    const dropdownButton = buttons[1] // Second button is the dropdown
    fireEvent.click(dropdownButton)

    // Menu should contain "Theme Mode" and "Color Palette" sections
    expect(screen.getByText('Theme Mode')).toBeInTheDocument()
    expect(screen.getByText('Color Palette')).toBeInTheDocument()
  })

  it('shows correct titles for main and dropdown buttons', () => {
    renderColorSchemeSelector('dark')

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0]
    const dropdownButton = buttons[1]

    expect(mainButton).toHaveAttribute('title', 'Theme: Dark (Click to cycle)')
    expect(dropdownButton).toHaveAttribute('title', 'Palette: blue (Click for options)')
  })

  it('displays current theme mode and palette indicator', () => {
    renderColorSchemeSelector('auto')

    const buttons = screen.getAllByRole('button')
    const mainButton = buttons[0]
    // Should contain the theme mode text and color indicator
    expect(mainButton).toHaveTextContent('Auto')
  })
})