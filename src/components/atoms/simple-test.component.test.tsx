/**
 * Simple test to check basic test setup
 */

import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';

import { Badge } from './badge';

describe('Simple Test', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render badge component', () => {
    render(<Badge data-testid="simple-badge">Test</Badge>);
    
    const badge = screen.getByTestId('simple-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('Test');
  });

  it('should handle multiple badges without DOM conflicts', () => {
    render(<Badge data-testid="badge-1">First</Badge>);
    render(<Badge data-testid="badge-2">Second</Badge>);
    
    const badge1 = screen.getByTestId('badge-1');
    const badge2 = screen.getByTestId('badge-2');
    
    expect(badge1).toBeTruthy();
    expect(badge2).toBeTruthy();
    expect(badge1.textContent).toBe('First');
    expect(badge2.textContent).toBe('Second');
  });
});