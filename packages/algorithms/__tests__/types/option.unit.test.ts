import { describe, it, expect } from 'vitest';

import { type Option, Some, None } from '../../src/types/option';

describe('Option<T>', () => {
  describe('Some variant', () => {
    it('should create Some option with value', () => {
      const option: Option<number> = Some(42);

      expect(option.some).toBe(true);
      if (option.some) {
        expect(option.value).toBe(42);
      }
    });

    it('should narrow type correctly with type guard', () => {
      const option: Option<string> = Some('hello');

      if (option.some) {
        // TypeScript should narrow to { some: true, value: string }
        const value: string = option.value;
        expect(value).toBe('hello');
      } else {
        throw new Error('Should not reach here');
      }
    });
  });

  describe('None variant', () => {
    it('should create None option without value', () => {
      const option: Option<number> = None();

      expect(option.some).toBe(false);
    });

    it('should narrow type correctly with type guard', () => {
      const option: Option<number> = None();

      if (!option.some) {
        // TypeScript should narrow to { some: false }
        // No value property should exist
        expect(option).toEqual({ some: false });
      } else {
        throw new Error('Should not reach here');
      }
    });
  });

  describe('Pattern matching', () => {
    it('should handle Some case in if-else', () => {
      const option: Option<number> = Some(10);

      if (option.some) {
        expect(option.value).toBe(10);
      } else {
        throw new Error('Should not reach here');
      }
    });

    it('should handle None case in if-else', () => {
      const option: Option<number> = None();

      if (option.some) {
        throw new Error('Should not reach here');
      } else {
        // Successfully handled None case
        expect(option.some).toBe(false);
      }
    });
  });

  describe('Type safety', () => {
    it('should work with complex types', () => {
      interface User {
        id: string;
        name: string;
      }

      const found: Option<User> = Some({ id: '1', name: 'Alice' });
      const notFound: Option<User> = None();

      if (found.some) {
        expect(found.value.name).toBe('Alice');
      }

      if (!notFound.some) {
        expect(notFound).toEqual({ some: false });
      }
    });

    it('should support discriminated union exhaustive checking', () => {
      const unwrapOrDefault = <T>(option: Option<T>, defaultValue: T): T => {
        if (option.some) {
          return option.value;
        } else {
          return defaultValue;
        }
      };

      expect(unwrapOrDefault(Some(42), 0)).toBe(42);
      expect(unwrapOrDefault(None(), 0)).toBe(0);
    });
  });

  describe('Nullable conversion', () => {
    it('should represent absent values without null or undefined', () => {
      const option: Option<string> = None();

      // None is not null or undefined - it's a proper value
      expect(option).toBeDefined();
      expect(option).not.toBeNull();
      expect(option.some).toBe(false);
    });

    it('should handle Some with nullable value types', () => {
      // Option<string | null> is valid - Some can wrap null
      const option: Option<string | null> = Some(null);

      if (option.some) {
        expect(option.value).toBeNull();
      }
    });
  });
});
