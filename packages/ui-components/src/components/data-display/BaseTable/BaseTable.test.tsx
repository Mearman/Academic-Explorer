import { describe, it, expect } from 'vitest';
import { BaseTable } from './BaseTable';

describe('BaseTable', () => {
  it('should export BaseTable component', () => {
    expect(BaseTable).toBeDefined();
    expect(typeof BaseTable).toBe('object'); // forwardRef returns an object
  });

  it('should have displayName', () => {
    expect(BaseTable.displayName).toBe('BaseTable');
  });
});