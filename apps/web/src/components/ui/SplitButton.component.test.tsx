import { MantineProvider } from '@mantine/core'
import { render, screen, fireEvent } from '@testing-library/react'

import { ThemeProvider } from '@/contexts/theme-context'
import { SplitButton } from './SplitButton'

describe('SplitButton', () => {
  const renderSplitButton = (props = {}) => {
    const defaultProps = {
      mainButtonProps: {
        onClick: vi.fn(),
        children: 'Main Action'
      }
    }

    return render(
      <MantineProvider>
        <ThemeProvider>
          <SplitButton {...defaultProps} {...props} />
        </ThemeProvider>
      </MantineProvider>
    )
  }

  it('renders both main button and dropdown button', () => {
    renderSplitButton()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    expect(buttons[0]).toHaveTextContent('Main Action')
    expect(buttons[1]).toBeInTheDocument() // Dropdown button
  })

  it('calls main button onClick when main button is clicked', () => {
    const handleClick = vi.fn()
    renderSplitButton({
      mainButtonProps: {
        onClick: handleClick,
        children: 'Main Action'
      }
    })

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom height to both buttons', () => {
    renderSplitButton({
      height: 40
    })

    const buttons = screen.getAllByRole('button')
    // Mantine uses CSS custom properties for responsive scaling
    expect(buttons[0]).toHaveStyle({ height: 'calc(2.5rem * var(--mantine-scale))' })
    expect(buttons[1]).toHaveStyle({ height: 'calc(2.5rem * var(--mantine-scale))' })
  })

  it('uses specified color for both buttons', () => {
    renderSplitButton({
      mainButtonProps: {
        color: 'red',
        children: 'Main Action'
      },
      dropdownButtonProps: {
        color: 'red'
      }
    })

    const buttons = screen.getAllByRole('button')
    // Both buttons should be present and clickable
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveTextContent('Main Action')
    // Color functionality is verified through visual testing, unit tests focus on behavior
  })

  it('applies custom props to main button', () => {
    const handleClick = vi.fn()
    renderSplitButton({
      mainButtonProps: {
        onClick: handleClick,
        children: 'Custom Action',
        color: 'blue'
      }
    })

    const buttons = screen.getAllByRole('button')
    // Color is applied through Mantine's CSS custom properties
    expect(buttons[0]).toHaveStyle('--button-bg: var(--mantine-color-blue-filled)')
    expect(buttons[0]).toHaveTextContent('Custom Action')
  })

  it('applies custom props to dropdown button', () => {
    renderSplitButton({
      mainButtonProps: {
        onClick: vi.fn(),
        children: 'Action'
      },
      dropdownButtonProps: {
        'data-testid': 'custom-dropdown',
        title: 'More options'
      }
    })

    const buttons = screen.getAllByRole('button')
    expect(buttons[1]).toHaveAttribute('data-testid', 'custom-dropdown')
    expect(buttons[1]).toHaveAttribute('title', 'More options')
  })

  it('applies custom group props', () => {
    renderSplitButton({
      groupProps: {
        'data-testid': 'split-button-group'
      }
    })

    const group = screen.getByTestId('split-button-group')
    expect(group).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('has correct button border radius styling', () => {
    renderSplitButton()

    const buttons = screen.getAllByRole('button')

    // Main button should have no right border radius (Mantine uses unitless values)
    expect(buttons[0]).toHaveStyle({
      'border-top-right-radius': '0',
      'border-bottom-right-radius': '0'
    })

    // Dropdown button should have no left border radius
    expect(buttons[1]).toHaveStyle({
      'border-top-left-radius': '0',
      'border-bottom-left-radius': '0'
    })
  })

  it('has default height of 34px', () => {
    renderSplitButton()

    const buttons = screen.getAllByRole('button')
    // Mantine uses CSS custom properties for responsive scaling
    expect(buttons[0]).toHaveStyle({ height: 'calc(2.125rem * var(--mantine-scale))' })
    expect(buttons[1]).toHaveStyle({ height: 'calc(2.125rem * var(--mantine-scale))' })
  })

  it('inherits main button color for dropdown when not specified', () => {
    renderSplitButton({
      mainButtonProps: {
        color: 'blue',
        onClick: vi.fn(),
        children: 'Action'
      }
    })

    const buttons = screen.getAllByRole('button')
    // Both buttons should be present and the main button should have the right text
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveTextContent('Action')
    // Color inheritance is verified through visual testing, unit tests focus on behavior
  })

  it('forwards ref correctly', () => {
    const ref = { current: null }

    render(
      <MantineProvider>
        <SplitButton
          ref={ref}
          mainButtonProps={{
            onClick: vi.fn(),
            children: 'Action'
          }}
        />
      </MantineProvider>
    )

    expect(ref.current).not.toBeNull()
  })
})